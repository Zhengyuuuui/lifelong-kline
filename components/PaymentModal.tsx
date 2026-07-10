
import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Shield, Lock, Smartphone, Radar, Eye, Bot, Sparkles, CreditCard, Magnet, Wind, BookOpen, Utensils, AlertTriangle, Zap, Apple } from 'lucide-react';
import { i18n } from '../services/i18n';
import { iosProductionBridge } from '../services/iosProductionBridge';
import { backendClient, type PaymentOrderStatusResult, type XunhuPaymentCreateResult } from '../services/backendClient';
import { hasJwtAuthToken } from '../services/apiBase';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequireLogin: () => void;
  onSuccess: (details: PaymentSuccessDetails) => void | Promise<void>;
}

export type PayMethod = 'xunhupay' | 'wechat' | 'alipay' | 'apple';
export type PlanType = 'lifetime';

export interface PaymentSuccessDetails {
  method: PayMethod;
  planType: PlanType;
  amountCents?: number;
  currency?: 'CNY';
  restore?: boolean;
  receiptData?: string;
  signedTransactionInfo?: string;
  receipt?: string;
  productId?: string;
  transactionId?: string;
  orderId?: string;
  merchantOrderNo?: string;
  paymentStatus?: string;
}

const defaultPayMethod = (): PayMethod =>
  iosProductionBridge.isNativeRuntime() ? 'apple' : 'xunhupay';

const XUNHU_PRODUCT_ID = 'life_kline_lifetime';
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_STATUS_ERRORS = 5;

type PaymentStep = 'offer' | 'method' | 'creating' | 'waiting' | 'polling' | 'processing' | 'success' | 'failed' | 'timeout' | 'error';

const isTerminalPaymentStatus = (status: string) =>
  ['success', 'paid', 'failed', 'cancelled', 'canceled', 'refunded'].includes(status.toLowerCase());

const isSuccessPaymentStatus = (status: string) =>
  ['success', 'paid'].includes(status.toLowerCase());

const isFailurePaymentStatus = (status: string) =>
  ['failed', 'cancelled', 'canceled', 'refunded'].includes(status.toLowerCase());

const isMobilePaymentDevice = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
};

const canOpenPayUrl = (url?: string | null) =>
  Boolean(url && /^https?:\/\//i.test(url));

const canRenderQrImage = (url?: string | null) =>
  Boolean(url && /^(https?:\/\/|data:image\/|blob:)/i.test(url));

const isMockPaymentUrl = (url?: string | null) =>
  Boolean(url && url.toLowerCase().startsWith('mock://'));

const isMockPaymentOrder = (order?: XunhuPaymentCreateResult | null) =>
  isMockPaymentUrl(order?.payUrl) || isMockPaymentUrl(order?.qrCodeUrl);

const createPaymentErrorMessage = (error: unknown) => {
  const status = (error as { status?: number }).status;
  if (status === 401) return '登录已过期，请重新登录。';
  if (status === 422) return '支付参数不正确，请刷新后重试。';
  if (status && status >= 500) return '支付服务暂时不可用，请稍后重试。';
  if (!status) return '网络异常，请稍后重试。';
  return (error as Error).message || '支付订单创建失败，请稍后重试。';
};

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onRequireLogin,
  onSuccess,
}) => {
  const [payMethod, setPayMethod] = useState<PayMethod>(() => defaultPayMethod());
  const [step, setStep] = useState<PaymentStep>('offer');
  const [paymentOrder, setPaymentOrder] = useState<XunhuPaymentCreateResult | null>(null);
  const [statusResult, setStatusResult] = useState<PaymentOrderStatusResult | null>(null);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [isMobilePayment, setIsMobilePayment] = useState(() => isMobilePaymentDevice());
  const [qrImageFailed, setQrImageFailed] = useState(false);
  const timersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const pollTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollDeadlineRef = React.useRef(0);
  const statusErrorCountRef = React.useRef(0);
  const paymentSessionRef = React.useRef(0);
  const showNativeApplePayment = iosProductionBridge.isNativeRuntime();

  const clearPaymentTimers = React.useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // Reset state on open
  useEffect(() => {
    clearPaymentTimers();
    if (isOpen) {
      setStep('offer');
      setPayMethod(defaultPayMethod());
      setPaymentOrder(null);
      setStatusResult(null);
      setPaymentMessage('');
      setQrImageFailed(false);
      statusErrorCountRef.current = 0;
    }
    return () => {
      paymentSessionRef.current += 1;
      clearPaymentTimers();
    };
  }, [clearPaymentTimers, isOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 767px), (pointer: coarse)');
    const updateDeviceType = () => setIsMobilePayment(media.matches);
    updateDeviceType();
    media.addEventListener?.('change', updateDeviceType);
    return () => media.removeEventListener?.('change', updateDeviceType);
  }, []);

  const handleClose = () => {
    paymentSessionRef.current += 1;
    clearPaymentTimers();
    onClose();
  };

  const completeXunhuPayment = React.useCallback(async (order: XunhuPaymentCreateResult, result: PaymentOrderStatusResult) => {
    clearPaymentTimers();
    setStatusResult(result);
    setStep('success');
    timersRef.current.push(setTimeout(() => {
      void onSuccess({
        method: 'xunhupay',
        planType: 'lifetime',
        currency: 'CNY',
        productId: XUNHU_PRODUCT_ID,
        orderId: order.orderId,
        merchantOrderNo: order.merchantOrderNo,
        paymentStatus: result.paymentStatus,
      });
    }, 1000));
  }, [clearPaymentTimers, onSuccess, payMethod]);

  const pollPaymentStatus = React.useCallback(async (order: XunhuPaymentCreateResult) => {
    if (!order.orderId || pollTimerRef.current === null) return;

    if (Date.now() > pollDeadlineRef.current) {
      clearPaymentTimers();
      setPaymentMessage('支付结果查询超时，请稍后在会员中心刷新状态。');
      setStep('timeout');
      return;
    }

    try {
      setStep((current) => current === 'waiting' ? 'polling' : current);
      const result = await backendClient.getPaymentOrderStatus(order.orderId);
      if (pollTimerRef.current === null) return;
      setStatusResult(result);
      statusErrorCountRef.current = 0;
      const normalizedStatus = String(result.paymentStatus || '').toLowerCase();

      if (isSuccessPaymentStatus(normalizedStatus)) {
        await completeXunhuPayment(order, result);
        return;
      }

      if (isFailurePaymentStatus(normalizedStatus)) {
        clearPaymentTimers();
        setPaymentMessage('支付未完成或已失败，请重新发起支付。');
        setStep('failed');
        return;
      }

      if (!normalizedStatus || !isTerminalPaymentStatus(normalizedStatus)) {
        setPaymentMessage(isMockPaymentOrder(order)
          ? 'Mock 支付订单已创建，正在等待 Mock 回调。'
          : '订单已创建，正在等待支付结果。');
      }
    } catch (error) {
      if (pollTimerRef.current === null) return;
      statusErrorCountRef.current += 1;
      const status = (error as { status?: number }).status;
      if (status === 401) {
        clearPaymentTimers();
        setPaymentMessage('登录状态已失效，请重新登录后再支付。');
        setStep('error');
        return;
      }
      setPaymentMessage(statusErrorCountRef.current >= MAX_STATUS_ERRORS
        ? '连续查询失败，请检查网络后重试。'
        : '网络波动中，正在继续查询支付结果。');
      if (statusErrorCountRef.current >= MAX_STATUS_ERRORS) {
        clearPaymentTimers();
        setStep('error');
      }
    }
  }, [clearPaymentTimers, completeXunhuPayment]);

  const startPolling = React.useCallback((order: XunhuPaymentCreateResult) => {
    clearPaymentTimers();
    statusErrorCountRef.current = 0;
    pollDeadlineRef.current = Date.now() + POLL_TIMEOUT_MS;

    const runPoll = async () => {
      if (pollTimerRef.current === null) return;
      await pollPaymentStatus(order);
      if (pollTimerRef.current === null) return;
      pollTimerRef.current = setTimeout(() => {
        void runPoll();
      }, POLL_INTERVAL_MS);
    };

    pollTimerRef.current = setTimeout(() => {
      void runPoll();
    }, 0);
  }, [clearPaymentTimers, pollPaymentStatus]);

  const handlePay = async () => {
    if (step !== 'method') return;
    if (showNativeApplePayment && payMethod === 'apple') {
      setStep('processing');
      void onSuccess({
        method: 'apple',
        planType: 'lifetime',
        amountCents: 1880,
        currency: 'CNY',
      });
      return;
    }

    if (!hasJwtAuthToken()) {
      onRequireLogin();
      return;
    }

    clearPaymentTimers();
    setPaymentOrder(null);
    setStatusResult(null);
    setPaymentMessage('');
    setStep('creating');
    const paymentSession = ++paymentSessionRef.current;

    try {
      const order = await backendClient.createXunhuPayment({
        productId: XUNHU_PRODUCT_ID,
      });
      if (paymentSession !== paymentSessionRef.current) return;
      setPaymentOrder(order);
      setQrImageFailed(false);
      setPaymentMessage(isMockPaymentOrder(order)
        ? 'Mock 支付订单已创建，正在等待 Mock 回调。'
        : '订单已创建，请完成扫码或打开支付页。');
      setStep('waiting');

      startPolling(order);
    } catch (error) {
      if (paymentSession !== paymentSessionRef.current) return;
      setPaymentMessage(createPaymentErrorMessage(error));
      setStep('error');
    }
  };

  const handleRestorePurchases = () => {
    setStep('processing');
    void onSuccess({
      method: 'apple',
      planType: 'lifetime',
      amountCents: 0,
      currency: 'CNY',
      restore: true,
    });
  };

  if (!isOpen) return null;

  const qrCodeUrl = paymentOrder?.qrCodeUrl || null;
  const payUrl = paymentOrder?.payUrl || null;
  const isMockOrder = isMockPaymentOrder(paymentOrder);
  const hasRealPayUrl = canOpenPayUrl(payUrl);
  const hasRealQrCode = canRenderQrImage(qrCodeUrl) && !isMockPaymentUrl(qrCodeUrl);
  const shouldShowQrCode = hasRealQrCode && (!isMobilePayment || !hasRealPayUrl);
  const shouldShowPayButton = hasRealPayUrl && (isMobilePayment || !hasRealQrCode || qrImageFailed);
  const statusText = statusResult?.paymentStatus || paymentOrder?.paymentStatus || 'pending';
  const isXunhuProgressStep = ['creating', 'waiting', 'polling'].includes(step);
  const isXunhuTerminalStep = ['failed', 'timeout', 'error'].includes(step);
  const terminalTitle = step === 'failed'
    ? '支付未完成'
    : step === 'timeout'
      ? '支付查询超时'
      : paymentMessage.includes('登录')
        ? '需要重新登录'
        : paymentMessage.includes('参数')
          ? '支付参数不正确'
          : paymentMessage.includes('服务')
            ? '支付服务暂不可用'
            : '支付请求失败';

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center overflow-y-auto p-4 font-sans text-white pointer-events-auto">
      {/* Darkened Backdrop with Blur */}
      <div className="absolute inset-0 bg-[#000000]/95 backdrop-blur-xl transition-opacity duration-300" onClick={handleClose} />

      {/* Main Card */}
      <div className="relative my-auto min-h-0 w-full max-w-[400px] bg-[#050505] border border-white/10 rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(255,0,0,0.15)] animate-fade-in-up flex flex-col max-h-[calc(100dvh-2rem)]">
        
        {/* --- TOP: URGENCY ALERT (RED) --- */}
        <div className="bg-gradient-to-r from-red-900 via-red-600 to-red-900 px-4 py-2.5 flex flex-col items-center justify-center text-center shadow-[0_0_30px_rgba(220,38,38,0.6)] relative z-20">
            <h3 className="text-white text-[11px] font-black uppercase tracking-widest animate-pulse flex items-center gap-2">
                <Shield size={12} fill="currentColor" />
                {i18n.t('pay.alert_title')}
            </h3>
            <p className="text-[9px] text-white/90 font-medium mt-0.5 opacity-90">
                {i18n.t('pay.alert_desc')}
            </p>
        </div>

        {/* Close Button */}
        {(step !== 'processing' && step !== 'success') && (
          <button 
            onClick={handleClose} 
            aria-label="关闭支付窗口"
            className="absolute top-14 right-4 z-30 w-8 h-8 rounded-full bg-black/40 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors backdrop-blur-md border border-white/5"
          >
            <X size={14} />
          </button>
        )}

        {/* Scrollable Content Area */}
        <div className="min-h-0 overflow-y-auto overscroll-contain no-scrollbar flex-1 bg-[#050505] [-webkit-overflow-scrolling:touch]">
            {step === 'offer' ? (
                <div className="pb-36 animate-fade-in">
                    {/* TOP SUMMARY & HOOK */}
                    <div className="relative overflow-hidden bg-gradient-to-b from-[#110808] to-[#050505] px-6 pt-10 pb-6 border-b border-white/5">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-32 bg-red-900/10 blur-[60px] rounded-full pointer-events-none" />
                        
                        <div className="text-center relative z-10">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-900/20 border border-red-500/20 text-[9px] font-bold text-red-400 tracking-widest mb-6 shadow-[0_0_15px_rgba(220,38,38,0.2)]">
                                <Sparkles size={10} />
                                逆天改命 · 窥视天机终极特权
                            </div>

                            <h2 className="text-[22px] font-bold leading-tight text-white mb-2 tracking-wide font-serif">
                                <span className="text-slate-400 opacity-80 text-lg block mb-1">承认吧：</span>
                                努力是底层<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600 font-black ml-1 border-b-2 border-red-500/30 pb-0.5">最大的谎言</span>。
                            </h2>
                        </div>

                        <div className="mt-8 bg-white/[0.02] border border-white/5 rounded-[20px] p-5 backdrop-blur-md shadow-lg">
                            <p className="text-[13px] text-slate-300 leading-relaxed font-medium">
                                为什么你比别人拼命，却比别人穷？<br/>
                                为什么你如履薄冰，却总是倒霉？<br/>
                                因为你的 <span className="text-white font-black bg-red-500/20 px-1 rounded mx-0.5 text-[12px]">“出厂设置”</span> 有漏洞。<br/>
                                别再用战术上的勤奋，掩盖战略上的无能。
                            </p>
                            <div className="mt-4 pt-4 border-t border-white/5">
                                <p className="text-[11px] text-slate-500 italic mb-1">“99% 的人只会算命，结果越算越薄。”</p>
                                <p className="text-[11.5px] text-amber-500 font-bold tracking-wide">“真正的赢家，从不等待运势，而是创造运势。”</p>
                            </div>
                        </div>
                    </div>

                    <div className="px-5 space-y-6 pt-6">
                        {/* PAIN POINT / GOD MODE */}
                        <div className="p-5 rounded-[20px] bg-gradient-to-br from-[#120D1D] to-[#0A0610] border border-purple-500/10 relative overflow-hidden shadow-lg">
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/10 blur-[50px] rounded-full pointer-events-none" />
                            <h2 className="text-[18px] font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-slate-400 tracking-tight leading-snug mb-3">
                                {i18n.t('pay.god_desc')}
                            </h2>
                            <div className="text-[12px] text-purple-200/60 leading-relaxed font-medium border-l-[3px] border-purple-500/30 pl-3">
                                {i18n.t('pay.pain_point').split('\n').map((line, i) => (
                                    <span key={i} className="block mb-1 last:mb-0">{line}</span>
                                ))}
                            </div>
                        </div>

                        {/* CORE FEATURES LIST */}
                        <div className="pt-2">
                            <div className="flex items-center justify-center gap-3 opacity-80 mb-5">
                                <div className="h-px w-8 bg-gradient-to-r from-transparent to-amber-600/50" />
                                <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.25em]">核心卖点：不仅是看，更是改</h3>
                                <div className="h-px w-8 bg-gradient-to-l from-transparent to-amber-600/50" />
                            </div>

                            <div className="space-y-3">
                                {/* Feature 1 */}
                                <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-white/5 relative overflow-hidden group hover:border-amber-500/30 transition-colors shadow-sm">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/5 flex items-center justify-center flex-shrink-0 border border-amber-500/20">
                                            <Magnet size={18} className="text-amber-400" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black text-amber-500/50 uppercase">01</span>
                                                <h4 className="text-[13px] font-bold text-white tracking-wide">五行强制补全 · 吸金磁场</h4>
                                            </div>
                                            <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                                                你的命盘里缺金？缺水？这是你赚钱难、守不住财的根源。
                                            </p>
                                            <div className="bg-amber-500/5 p-2 rounded-lg border border-amber-500/10 text-[10px] text-amber-200/80">
                                                <span className="font-bold text-amber-500">效果：</span> 系统生成动态五行补丁，让原本流向别人的运气，强制拐弯流向你。
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Feature 2 */}
                                <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-white/5 relative overflow-hidden group hover:border-teal-500/30 transition-colors shadow-sm">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/5 flex items-center justify-center flex-shrink-0 border border-teal-500/20">
                                            <Wind size={18} className="text-teal-400" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black text-teal-500/50 uppercase">02</span>
                                                <h4 className="text-[13px] font-bold text-white tracking-wide">每日“顺风窗口” · 降维打击</h4>
                                            </div>
                                            <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                                                每天只有2小时，是宇宙能量对你最敞开的时候。在这个时间谈客户，成功率立升。
                                            </p>
                                            <div className="bg-teal-500/5 p-2 rounded-lg border border-teal-500/10 text-[10px] text-teal-200/80">
                                                <span className="font-bold text-teal-500">绝杀：</span> 别在逆风里费力奔跑，我要你在风口上起飞。
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Feature 3 */}
                                <div className="flex gap-3 p-3.5 rounded-2xl bg-[#0A0A0A] border border-white/5 items-start px-4 shadow-sm hover:border-blue-500/30 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 border border-blue-500/20 mt-0.5">
                                        <Eye size={14} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-[12px] font-bold text-white mb-0.5 tracking-wide"><span className="text-slate-500 text-[10px] mr-1.5">03</span>{i18n.t('pay.feat_future')}</h4>
                                        <p className="text-[11px] text-slate-400 leading-relaxed">{i18n.t('pay.feat_future_desc')}</p>
                                    </div>
                                </div>

                                {/* Feature 4 */}
                                <div className="flex gap-3 p-3.5 rounded-2xl bg-[#0A0A0A] border border-white/5 items-start px-4 shadow-sm hover:border-indigo-500/30 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0 border border-indigo-500/20 mt-0.5">
                                        <Radar size={14} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-[12px] font-bold text-white mb-0.5 tracking-wide"><span className="text-slate-500 text-[10px] mr-1.5">04</span>{i18n.t('pay.feat_decode')}</h4>
                                        <p className="text-[11px] text-slate-400 leading-relaxed">{i18n.t('pay.feat_decode_desc')}</p>
                                    </div>
                                </div>

                                {/* Feature 5 */}
                                <div className="flex gap-3 p-3.5 rounded-2xl bg-[#0A0A0A] border border-white/5 items-start px-4 shadow-sm hover:border-purple-500/30 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0 border border-purple-500/20 mt-0.5">
                                        <Bot size={14} className="text-purple-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-[12px] font-bold text-white mb-0.5 tracking-wide"><span className="text-slate-500 text-[10px] mr-1.5">05</span>{i18n.t('pay.feat_ai')} · {i18n.t('pay.god_mode')}</h4>
                                        <p className="text-[11px] text-slate-400 leading-relaxed">{i18n.t('pay.feat_ai_desc')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Feature 6 - The Book (Manual) */}
                        <div className="relative p-5 bg-gradient-to-br from-[#1A1108] to-[#0A0500] rounded-[24px] border border-amber-900/40 shadow-xl overflow-hidden mt-2">
                            <div className="absolute right-[-20px] top-[-20px] p-8 opacity-10 text-amber-500"><BookOpen size={100} /></div>
                            <div className="absolute inset-0 texture-leather opacity-20 mix-blend-overlay"></div>
                            
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-3 border-b border-amber-500/20 pb-2">
                                    <span className="text-lg font-black text-amber-600">06.</span>
                                    <span className="text-[9px] font-mono tracking-widest uppercase text-amber-500">绝密档案</span>
                                </div>
                                
                                <h3 className="text-[15px] font-bold text-white mb-1.5 font-serif tracking-wide">《你的生命 · 独家出厂说明书》</h3>
                                
                                <p className="text-[11.5px] text-amber-100/80 mb-4 leading-relaxed font-medium">
                                    你过得累，是因为你一直在“违规操作”你自己。<br/>
                                    <span className="text-slate-400 text-[10.5px]">融合古法秘术与AI概率论的作弊代码。</span>
                                </p>
                                
                                <div className="bg-black/40 p-3.5 rounded-xl border border-amber-500/10 mb-3 backdrop-blur-sm">
                                    <p className="text-[10.5px] text-amber-500 font-bold mb-2">直击灵魂的拷问：</p>
                                    <ul className="text-[11px] text-slate-300 space-y-1.5 pl-1">
                                        <li>• 为什么你是鱼，却在拼命学爬树？</li>
                                        <li>• 为什么你越努力，离成功越远？</li>
                                        <li>• 为什么你越休息越累？(充电方式错了)</li>
                                    </ul>
                                </div>

                                <div className="bg-red-950/30 border border-red-500/20 p-3 rounded-xl flex items-start gap-2.5 backdrop-blur-sm">
                                    <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0 animate-pulse" />
                                    <p className="text-[10px] text-red-200/80 leading-snug">
                                        <span className="font-bold text-red-400 uppercase">致命 Bug 预警：</span>生活是烂桃花？盲目投资？还是情绪失控？提前标注人生雷区，避开 90% 的灾难。没有说明书的努力，依然是无效的。
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* THE KILLER SINGLE PRICING CARD */}
                        <div className="relative rounded-[28px] p-[1.5px] bg-gradient-to-b from-amber-300 via-amber-600 to-red-600 shadow-[0_15px_40px_rgba(245,158,11,0.25)] mt-10 mb-4">
                            <div className="bg-gradient-to-b from-[#110A05] to-[#0A0505] rounded-[26px] px-5 py-7 text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-red-600 text-white text-[9px] font-black px-3 py-1.5 rounded-bl-xl rounded-tr-[26px] uppercase tracking-widest shadow-md">
                                    限时合体版
                                </div>
                                
                                <div className="relative z-10 pt-2 text-center flex flex-col items-center">
                                    <h3 className="text-[15px] font-black text-white mb-2 flex items-center justify-center gap-1.5">
                                        <CheckCircle2 size={16} className="text-amber-500" />
                                        终极天机 · 逆天改命无量权限
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mb-6 font-medium">
                                        {i18n.t('pay.prod_desc')}
                                    </p>
                                    
                                    <div className="flex items-baseline justify-center gap-1.5 mb-1">
                                        <span className="text-[40px] font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-amber-200 tracking-tight leading-none">¥18.80</span>
                                    </div>
                                    <p className="text-[11px] text-amber-500 font-bold tracking-widest mb-2">终身会员</p>
                                    
                                    <span className="text-[10px] text-slate-500 line-through decoration-slate-600 mb-6 block">原价 ¥1,998 的私密私域改运卷</span>
                                    
                                    <div className="bg-white/5 rounded-2xl p-4 text-left flex items-start gap-4 w-full border border-white/5 shadow-inner">
                                        <div className="w-8 h-8 rounded-full bg-[#1A1108] flex items-center justify-center flex-shrink-0 border border-amber-500/20">
                                            <Utensils size={14} className="text-amber-500" />
                                        </div>
                                        <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                                            甚至不到两杯便宜咖啡的钱。<br/>
                                            开启这个权限，你余下的每天都在<span className="text-amber-400 font-bold px-1">“开挂”</span>中度过。你每天为了省几十块钱精打细算，却在底牌前犹豫。这就是为什么你现在还是NPC。
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Unified third-party payment entry for web */}
                    <div className="p-6 pt-0">
                        <div className={`${showNativeApplePayment ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1'} mt-0`}>
                            <button
                                type="button"
                                onClick={() => setPayMethod('xunhupay')}
                                className={`flex items-center justify-center gap-3 py-4 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                                    payMethod === 'xunhupay'
                                    ? 'bg-amber-500/10 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.18)]'
                                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                                }`}
                            >
                                <CreditCard size={18} />
                                <span className="text-[11px] font-black uppercase tracking-[0.18em]">第三方支付</span>
                                {payMethod === 'xunhupay' && <div className="absolute inset-0 bg-amber-400/5 animate-pulse" />}
                            </button>

                            {showNativeApplePayment && (
                              <button
                                  type="button"
                                  onClick={() => setPayMethod('apple')}
                                  className={`flex items-center justify-center gap-3 py-4 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                                      payMethod === 'apple'
                                      ? 'bg-slate-100/10 border-white/80 text-white shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                                      : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'
                                  }`}
                              >
                                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-black">
                                      <Apple size={13} fill="currentColor" />
                                  </div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-center leading-tight">Apple<br/>自动续费</span>
                                  {payMethod === 'apple' && <div className="absolute inset-0 bg-white/5 animate-pulse" />}
                              </button>
                            )}
                        </div>
                    </div>
                </div>
            ) : step === 'method' ? (
                <div className="pb-36 animate-fade-in min-h-[520px] flex flex-col justify-center">
                    <div className="relative overflow-hidden bg-gradient-to-b from-[#110808] to-[#050505] px-6 pt-10 pb-6 border-b border-white/5">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-32 bg-red-900/10 blur-[60px] rounded-full pointer-events-none" />
                        <div className="text-center relative z-10">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-900/20 border border-amber-500/20 text-[9px] font-bold text-amber-400 tracking-widest mb-5 shadow-[0_0_15px_rgba(245,158,11,0.16)]">
                                <CreditCard size={10} />
                                安全支付通道
                            </div>
                            <h2 className="text-[22px] font-bold leading-tight text-white mb-2 tracking-wide font-serif">
                                激活你的天命权限
                            </h2>
                            <p className="text-[12px] text-slate-400 leading-relaxed max-w-[260px] mx-auto">
                                将通过虎皮椒第三方支付页或二维码完成付款确认。
                            </p>
                        </div>
                    </div>

                    <div className="px-5 pt-8">
                        <div className="relative rounded-[24px] p-[1.5px] bg-gradient-to-b from-amber-300 via-amber-600 to-red-600 shadow-[0_15px_40px_rgba(245,158,11,0.2)] mb-7">
                            <div className="bg-gradient-to-b from-[#110A05] to-[#0A0505] rounded-[22px] px-5 py-5 text-center relative overflow-hidden">
                                <h3 className="text-[14px] font-black text-white mb-2">终极天机 · 逆天改命无量权限</h3>
                                <div className="flex items-baseline justify-center gap-1.5 mb-1">
                                    <span className="text-[34px] font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-amber-200 tracking-tight leading-none">¥18.80</span>
                                </div>
                                <p className="text-[10px] text-amber-500 font-bold tracking-widest">终身解锁</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 pt-0">
                        <div className={`${showNativeApplePayment ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1'} mt-0`}>
                            <button
                                type="button"
                                onClick={() => setPayMethod('xunhupay')}
                                className={`flex items-center justify-center gap-3 py-4 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                                    payMethod === 'xunhupay'
                                    ? 'bg-amber-500/10 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.18)]'
                                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                                }`}
                            >
                                <CreditCard size={18} />
                                <span className="text-[11px] font-black uppercase tracking-[0.18em]">第三方支付</span>
                                {payMethod === 'xunhupay' && <div className="absolute inset-0 bg-amber-400/5 animate-pulse" />}
                            </button>

                            {showNativeApplePayment && (
                              <button
                                  type="button"
                                  onClick={() => setPayMethod('apple')}
                                  className={`flex items-center justify-center gap-3 py-4 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                                      payMethod === 'apple'
                                      ? 'bg-slate-100/10 border-white/80 text-white shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                                      : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'
                                  }`}
                              >
                                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-black">
                                      <Apple size={13} fill="currentColor" />
                                  </div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-center leading-tight">Apple<br/>自动续费</span>
                                  {payMethod === 'apple' && <div className="absolute inset-0 bg-white/5 animate-pulse" />}
                              </button>
                            )}
                        </div>
                    </div>

                    <div className="px-6 text-center">
                        <button
                          type="button"
                          onClick={() => setStep('offer')}
                          className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 hover:text-white/70 transition-colors"
                        >
                          返回权益介绍
                        </button>
                    </div>
                </div>
            ) : isXunhuProgressStep ? (
                 <div className="flex flex-col items-center justify-center p-8 min-h-[500px] relative w-full space-y-6 animate-fade-in">
                     {step === 'creating' ? (
                         <>
                             <div className="relative w-24 h-24">
                                <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
                                <div className="absolute inset-0 border-4 border-t-amber-500 border-r-amber-500/50 rounded-full animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                   <CreditCard size={32} className="text-amber-500 animate-pulse" />
                                </div>
                             </div>
                             <div className="text-center space-y-2">
                                <h3 className="text-xl font-bold text-white">正在创建支付订单</h3>
                                <p className="text-xs text-slate-500 font-mono">Xunhupay secure channel</p>
                             </div>
                         </>
                     ) : (
                         <>
                             <div className="relative w-64 min-h-64 bg-white p-3 rounded-3xl shadow-[0_0_60px_rgba(255,255,255,0.1)] animate-fade-in-up">
                                <div className="w-full min-h-[232px] bg-slate-950 rounded-2xl flex items-center justify-center relative overflow-hidden border-2 border-slate-800">
                                    {isMockOrder ? (
                                      <div className="w-full h-full min-h-[232px] bg-amber-50 text-slate-900 p-5 rounded-xl flex flex-col items-center justify-center text-center">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-amber-500">
                                          <CreditCard size={20} className="text-white" />
                                        </div>
                                        <p className="text-[13px] font-black mb-2">Mock 支付订单已创建</p>
                                        <p className="text-[10px] text-slate-500 mb-3">等待 Mock 回调</p>
                                        <p className="max-w-full text-[10px] break-all leading-relaxed text-slate-700 font-mono">
                                          {paymentOrder?.merchantOrderNo || paymentOrder?.orderId}
                                        </p>
                                      </div>
                                    ) : shouldShowQrCode && !qrImageFailed ? (
                                      <img
                                        src={qrCodeUrl!}
                                        alt="支付二维码"
                                        className="w-full h-full object-contain bg-white rounded-xl"
                                        onError={() => setQrImageFailed(true)}
                                      />
                                    ) : qrImageFailed ? (
                                      <div className="w-full h-full min-h-[232px] bg-slate-900 rounded-xl flex flex-col items-center justify-center p-5 text-center">
                                        <AlertTriangle size={40} className="text-amber-400" />
                                        <p className="text-[11px] text-slate-200 mt-4">二维码加载失败，请刷新后重试</p>
                                        <p className="text-[10px] text-slate-500 mt-2">订单状态查询仍在继续</p>
                                      </div>
                                    ) : isMobilePayment && hasRealPayUrl ? (
                                      <div className="w-full h-full min-h-[232px] bg-slate-900 rounded-xl flex flex-col items-center justify-center p-5 text-center">
                                        <Smartphone size={40} className="text-amber-400" />
                                        <p className="text-[11px] text-slate-200 mt-4">请点击下方按钮打开支付页面</p>
                                        <p className="text-[10px] text-slate-500 mt-2">支付结果将持续自动查询</p>
                                      </div>
                                    ) : (
                                      <div className="w-full h-full min-h-[232px] bg-slate-900 rounded-xl flex flex-col items-center justify-center p-5 text-center">
                                        <Smartphone size={40} className="text-amber-400" />
                                        <p className="text-[11px] text-slate-300 mt-4">
                                          {hasRealPayUrl
                                            ? '当前订单未返回二维码，请打开支付页完成支付。'
                                            : '当前订单未返回可用的支付地址，请稍后重试。'}
                                        </p>
                                      </div>
                                    )}
                                    {step === 'polling' && (
                                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-[0_0_20px_#F59E0B] animate-[scan_2s_linear_infinite]" />
                                    )}
                                </div>
                             </div>

                             <div className="text-center space-y-3 w-full">
                                <h3 className="text-xl font-bold text-white">
                                  {isMockOrder
                                    ? '等待 Mock 回调'
                                    : isMobilePayment && hasRealPayUrl
                                      ? '等待打开支付页'
                                      : isMobilePayment && hasRealQrCode
                                        ? '请使用其他设备扫码支付'
                                        : hasRealQrCode
                                          ? '等待扫码支付'
                                          : '正在查询支付结果'}
                                </h3>
                                <p className="text-xs text-slate-400 font-mono tracking-wider">
                                    Using <span className="text-amber-400">Xunhupay</span> Secure Channel
                                </p>
                                <p className="text-[11px] text-slate-500 leading-relaxed px-3">{paymentMessage}</p>
                                <div className="mx-auto max-w-[280px] rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left">
                                  <div className="flex items-center justify-between gap-3 text-[10px] font-mono text-slate-500">
                                    <span>ORDER</span>
                                    <span className="text-slate-300 truncate">{paymentOrder?.merchantOrderNo || paymentOrder?.orderId}</span>
                                  </div>
                                  <div className="mt-2 flex items-center justify-between gap-3 text-[10px] font-mono text-slate-500">
                                    <span>STATUS</span>
                                    <span className="text-amber-400">{statusText}</span>
                                  </div>
                                </div>
                                {isMockOrder ? (
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-[11px] font-black uppercase tracking-[0.14em] disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled
                                  >
                                    <Smartphone size={13} />
                                    Mock 环境无真实支付页面
                                  </button>
                                ) : shouldShowPayButton && payUrl ? (
                                  isMobilePayment ? (
                                    <button
                                      type="button"
                                      onClick={() => window.location.assign(payUrl)}
                                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-[11px] font-black uppercase tracking-[0.14em]"
                                    >
                                      <Smartphone size={13} />
                                      打开支付页
                                    </button>
                                  ) : (
                                    <a
                                      href={payUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-[11px] font-black uppercase tracking-[0.14em]"
                                    >
                                      <Smartphone size={13} />
                                      打开支付页
                                    </a>
                                  )
                                ) : null}
                             </div>
                         </>
                     )}
                 </div>
            ) : step === 'processing' ? (
                <div className="flex flex-col items-center justify-center h-full p-8 min-h-[500px]">
                    <div className="relative w-24 h-24 mb-10">
                       <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
                       <div className="absolute inset-0 border-4 border-t-amber-500 border-r-amber-500/50 rounded-full animate-spin" />
                       <div className="absolute inset-0 flex items-center justify-center">
                          <Lock size={32} className="text-amber-500 animate-pulse" />
                       </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 tracking-widest uppercase">Verifying...</h3>
                    <p className="text-xs text-slate-500 font-mono">Connecting to Fate Server</p>
                </div>
            ) : isXunhuTerminalStep ? (
                <div className="flex flex-col items-center justify-center h-full p-8 min-h-[500px] text-center">
                    <div className="relative mb-8">
                        <div className={`${step === 'failed' ? 'bg-red-500' : step === 'timeout' ? 'bg-amber-500' : 'bg-slate-500'} absolute inset-0 blur-[60px] opacity-20 rounded-full`} />
                        <div className={`${step === 'failed' ? 'from-red-500 to-red-700' : step === 'timeout' ? 'from-amber-400 to-amber-600' : 'from-slate-500 to-slate-700'} w-24 h-24 bg-gradient-to-br rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.25)] relative z-10`}>
                           <AlertTriangle size={44} className="text-white" />
                        </div>
                    </div>

                    <h3 className="text-2xl font-black text-white mb-3 tracking-tight">{terminalTitle}</h3>
                    <p className="text-[12px] text-slate-400 leading-relaxed max-w-[280px] mb-6">{paymentMessage}</p>
                    <div className="flex w-full max-w-[280px] gap-3">
                      <button
                        type="button"
                        onClick={() => setStep('method')}
                        className="flex-1 py-3 rounded-xl bg-white text-black text-[11px] font-black uppercase tracking-[0.12em]"
                      >
                        重新支付
                      </button>
                      <button
                        type="button"
                        onClick={handleClose}
                        className="flex-1 py-3 rounded-xl bg-white/10 text-white text-[11px] font-black uppercase tracking-[0.12em] border border-white/10"
                      >
                        关闭
                      </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 min-h-[500px] text-center">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-emerald-500 blur-[60px] opacity-20 rounded-full" />
                        <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.4)] animate-bounce relative z-10">
                           <CheckCircle2 size={48} className="text-white" />
                        </div>
                    </div>
                    
                    <h3 className="text-2xl font-black text-white mb-2 tracking-tight">{i18n.t('pay.btn_success')}</h3>
                    <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-[10px] text-emerald-400 font-mono uppercase tracking-widest font-bold">
                            ULTIMATE DESTINY REWRITE UNLOCKED
                        </p>
                    </div>
                </div>
            )}
        </div>

        {/* BOTTOM FIXED BUTTON (Offer enters path selection; method confirms payment) */}
        {(step === 'offer' || step === 'method') && (
            <div className="absolute bottom-0 left-0 w-full bg-[#050505]/95 backdrop-blur-xl p-6 pb-8 border-t border-white/10 z-20">
                <button 
                  onClick={step === 'offer' ? () => setStep('method') : handlePay}
                  className="w-full py-4 font-black text-sm uppercase tracking-[0.15em] rounded-xl shadow-2xl hover:scale-[1.02] active:scale-95 select-none transition-all duration-200 ease-out flex items-center justify-center gap-3 group relative overflow-hidden bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-[0_0_40px_rgba(220,38,38,0.4)]"
                >
                   <span className="relative z-10 flex items-center gap-2">
                       <Zap size={16} fill="currentColor" />
                       <span>{step === 'offer' ? '立即激活 · 终极改命权限' : '确认支付 · 进入安全支付'}</span>
                   </span>
                   {/* Shine Effect */}
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                </button>
                {step === 'method' && showNativeApplePayment && payMethod === 'apple' && (
                  <button
                    onClick={handleRestorePurchases}
                    className="mt-3 w-full py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45 hover:text-white transition-colors"
                  >
                    恢复 App Store 购买
                  </button>
                )}
            </div>
        )}
        
        <style>{`
          @keyframes scan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }
          @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-5px); } 100% { transform: translateY(0px); } }
          .animate-float { animation: float 4s ease-in-out infinite; }
        `}</style>
      </div>
    </div>
  );
};
