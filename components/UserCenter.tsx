
import React, { useState, useEffect } from 'react';
import { UserInputProfile, SegmentInsight } from '../types';
import { storage } from '../services/storageService';
import { 
  X, User, Crown, Shield, LogOut, Settings, Bell, ChevronRight, ChevronLeft,
  Smartphone, AlertTriangle, Fingerprint, Gem, CreditCard, Lock, EyeOff,
  Globe, FileText, HelpCircle, CheckCircle2, Copy, Sparkles, Share2, Send, Check, Users,
  Eye, Cpu, TrendingUp
} from 'lucide-react';
import { i18n } from '../services/i18n';
import { backendClient, type AuthIdentity, type BackendUser } from '../services/backendClient';
import { InsightDock } from './InsightDock';
import { ModuleHelperTag } from './ModuleHelperTag';

interface UserCenterProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: UserInputProfile;
  user?: BackendUser;
  identities?: AuthIdentity[];
  onLogout?: () => void;
  onPasswordChanged?: () => void;
  isPremium: boolean;
  onRequirePayment: () => void;
  membershipOnly?: boolean;
  insight?: SegmentInsight | null;
  loading?: boolean;
  onAnalyze?: () => void;
  onShowInsight?: () => void;
}

type TabKey = 'profile' | 'membership' | 'security' | 'settings';

export const UserCenter: React.FC<UserCenterProps> = ({ 
  isOpen, onClose, userProfile, user, identities = [], onLogout, onPasswordChanged, isPremium, onRequirePayment, membershipOnly = false, insight, loading, onAnalyze, onShowInsight
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('membership');
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCount, setShareCount] = useState(0);
  const [isShareUnlocked, setIsShareUnlocked] = useState(false);
  const [shareSimulating, setShareSimulating] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordValues, setShowPasswordValues] = useState(false);
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [settings, setSettings] = useState({ notifications: true, language: '中文 / EN' });

  useEffect(() => {
    if (isOpen) {
        if (membershipOnly) setActiveTab('membership');
        const savedCount = storage.getShareCount();
        setShareCount(savedCount);
        if (savedCount >= 3) setIsShareUnlocked(true);

        const savedSettings = storage.getSettings();
        setSettings(savedSettings);

    }
  }, [isOpen, membershipOnly]);

  if (!isOpen) return null;

  const handleCopyId = () => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateShare = () => {
      if(shareSimulating || shareCount >= 3) return;
      setShareSimulating(true);
      setTimeout(() => {
          setShareSimulating(false);
          const newCount = shareCount + 1;
          setShareCount(newCount);
          storage.saveShareCount(newCount);
          backendClient.saveShareCount(newCount).catch((error) => console.warn("Share count sync failed", error));
          if (newCount >= 3) setIsShareUnlocked(true);
      }, 1500);
  };

  const handleToggleSetting = (key: 'notifications') => {
      const newSettings = { ...settings, [key]: !settings[key] };
      setSettings(newSettings);
      storage.saveSettings(newSettings);
      backendClient.saveSettings(newSettings).catch((error) => console.warn("Settings sync failed", error));
  };

  const handleDeleteAccount = () => {
      if (confirm("警告：确定要注销账号吗？此操作不可逆，所有数据将被清空。")) {
          backendClient.deleteAccount()
            .catch((error) => console.warn("Delete account sync failed", error))
            .finally(() => onLogout?.());
      }
  };

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (passwordChanging) return;

      setPasswordError(null);
      const currentLength = Array.from(currentPassword).length;
      const nextLength = Array.from(newPassword).length;
      if (currentLength < 10 || currentLength > 128 || nextLength < 10 || nextLength > 128) {
          setPasswordError('密码长度必须为 10-128 位。');
          return;
      }
      if (newPassword !== confirmPassword) {
          setPasswordError('两次输入的新密码不一致。');
          return;
      }
      if (newPassword === currentPassword) {
          setPasswordError('新密码不能与当前密码相同。');
          return;
      }

      setPasswordChanging(true);
      try {
          const result = await backendClient.changePassword({ currentPassword, newPassword });
          if (!result.ok || !result.refreshTokensRevoked) {
              throw new Error('Password change contract was not satisfied.');
          }
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          onPasswordChanged?.();
      } catch (error) {
          const status = (error as { status?: number }).status;
          setPasswordError(status === 401
              ? '当前密码不正确，修改失败。'
              : status === 422
                  ? '新密码不符合要求，请更换后重试。'
                  : status === 429
                      ? '操作过于频繁，请稍后再试。'
                      : '密码修改失败，请检查网络后重试。');
      } finally {
          setPasswordChanging(false);
      }
  };

  const menuItems: { id: TabKey; label: string; icon: React.ReactNode }[] = membershipOnly ? [
    { id: 'membership', label: i18n.t('user.member_level') || '会员等级', icon: <Crown size={16} strokeWidth={1.5} /> },
  ] : [
    { id: 'membership', label: i18n.t('user.member_level') || '会员等级', icon: <Crown size={16} strokeWidth={1.5} /> },
    { id: 'profile', label: i18n.t('user.center') || '个人中心', icon: <User size={16} strokeWidth={1.5} /> },
    { id: 'security', label: i18n.t('user.account') || '安全', icon: <Shield size={16} strokeWidth={1.5} /> },
    { id: 'settings', label: i18n.t('user.general') || '设置', icon: <Settings size={16} strokeWidth={1.5} /> },
  ];

  /* --- SUBCOMPONENTS --- */
  const ShareUnlockModal = () => {
      if (!showShareModal) return null;
      return (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowShareModal(false)} />
              <div className="relative w-full max-w-sm bg-[#0A0A0C] border border-white/10 rounded-2xl p-8 shadow-2xl animate-scale-in">
                  <button onClick={() => setShowShareModal(false)} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
                      <X size={20} strokeWidth={1.5} />
                  </button>

                  <div className="text-center mb-8">
                      <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                          <Share2 size={24} className="text-white/80" strokeWidth={1.5} />
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2 tracking-widest">助力解锁</h3>
                      <p className="text-sm text-white/50 leading-relaxed">
                          分享给 3 位好友<br/>解锁 <span className="text-amber-500 font-medium">¥8.88/月</span> 特权
                      </p>
                  </div>

                  <div className="flex justify-center gap-6 mb-10">
                      {[1, 2, 3].map(i => (
                          <div key={i} className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-500 ${i <= shareCount ? 'border-amber-500/50 bg-amber-500/10 text-amber-500' : 'border-white/10 bg-transparent text-white/20'}`}>
                              {i <= shareCount ? <Check size={16} strokeWidth={2} /> : <span className="text-sm font-mono">{i}</span>}
                          </div>
                      ))}
                  </div>

                  {!isShareUnlocked ? (
                      <button 
                        onClick={handleSimulateShare} disabled={shareSimulating}
                        className="w-full py-3.5 bg-white text-black hover:bg-white/90 font-medium rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      >
                          {shareSimulating ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <Send size={16} />}
                          <span className="text-sm tracking-wide">{shareSimulating ? '检测中...' : '分享好友'}</span>
                      </button>
                  ) : (
                      <button 
                        onClick={() => { setShowShareModal(false); onRequirePayment(); }}
                        className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-medium rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]"
                      >
                          <Sparkles size={16} />
                          <span className="text-sm tracking-wide">立即开通专属特权</span>
                      </button>
                  )}
              </div>
          </div>
      );
  };

  const ProfileView = () => {
    if (!userProfile || !user) return null;
    return (
    <div className="space-y-8 animate-fade-in">
       {/* High-End Minimal Profile Card */}
       <div className="relative rounded-3xl p-8 bg-gradient-to-b from-white/[0.04] to-transparent border border-white/5 overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                  {/* Clean Avatar */}
                  <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-black border border-white/10 flex items-center justify-center text-3xl font-light text-white overflow-hidden">
                          {userProfile?.name?.[0] || 'U'}
                      </div>
                      {isPremium && (
                          <div className="absolute -bottom-2 -right-2 bg-amber-500 text-black p-1.5 rounded-full border-4 border-[#050505]">
                              <Crown size={12} fill="currentColor" strokeWidth={1} />
                          </div>
                      )}
                  </div>
                  
                  <div>
                      <h3 className="text-3xl font-semibold text-white tracking-tight mb-2">{userProfile.name}</h3>
                      <div className="flex items-center gap-3">
                          <span className={`text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-sm ${isPremium ? 'bg-amber-500/10 text-amber-500' : 'bg-white/5 text-white/50'}`}>
                              {isPremium ? '核心会员' : '观察员'}
                          </span>
                          <button onClick={handleCopyId} className="flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors group/btn">
                              <span className="max-w-[190px] truncate text-[10px] font-mono tracking-wider">ID: {user.id}</span>
                              {copied ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                      </div>
                  </div>
              </div>
              
              <div className="hidden md:flex flex-col items-end gap-1 text-right">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium">Bazi Data</p>
                  <p className="text-sm font-mono text-white/80">{userProfile.birthDate}</p>
                  <p className="text-xs text-white/50">{userProfile.gender}</p>
              </div>
          </div>
       </div>

       {/* Clean Core Info Grid */}
       <div className="grid grid-cols-2 gap-4">
          <div className="group rounded-2xl bg-white/[0.02] border border-white/5 p-6 transition-colors hover:bg-white/[0.04]">
             <div className="flex justify-between items-start mb-4 opacity-40 group-hover:opacity-100 transition-opacity">
                <Globe size={20} strokeWidth={1.5} />
             </div>
             <div className="text-[10px] font-medium text-white/40 uppercase tracking-[0.2em] mb-1">主导五行</div>
             <div className="text-xl font-light text-white tracking-tight flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                 火旺 (喜水)
             </div>
          </div>
          <div className="group rounded-2xl bg-white/[0.02] border border-white/5 p-6 transition-colors hover:bg-white/[0.04]">
             <div className="flex justify-between items-start mb-4 opacity-40 group-hover:opacity-100 transition-opacity">
                <Sparkles size={20} strokeWidth={1.5} />
             </div>
             <div className="text-[10px] font-medium text-white/40 uppercase tracking-[0.2em] mb-1">本命卦象</div>
             <div className="text-xl font-light text-white tracking-tight">
                 水火既济
             </div>
          </div>
       </div>
    </div>
  );
  };

  const MembershipView = () => (
    <div className="space-y-4 animate-fade-in text-white">
        {/* PREMIUM / SERVICE LEVEL CARD (NOW ON TOP) */}
        <div className="relative rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-[#0f0e13] via-[#050508] to-[#040405] border border-amber-500/30 overflow-hidden group shadow-[0_15px_35px_rgba(0,0,0,0.9),inset_0_1px_rgba(255,255,255,0.08)] transition-all">
            {/* Hypnotic Glow Effects */}
            <div className="absolute -top-24 -left-24 w-80 h-80 bg-amber-500/10 blur-[90px] rounded-full pointer-events-none group-hover:bg-amber-500/15 transition-all duration-700" />
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-purple-600/10 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 flex justify-between items-center mb-4">
               <div className="flex items-center gap-1.5">
                  <Crown size={18} className="text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)] animate-pulse" />
                  <h3 className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-400 tracking-wider">
                     直通天眼 · 原价版
                  </h3>
               </div>
               {/* 18.8 Super Striking Golden Price Badge */}
               <div className="flex flex-col items-end shrink-0 select-none">
                  <div className="flex items-baseline gap-0.5 text-amber-400 font-sans">
                     <span className="text-[10px] sm:text-xs font-black text-amber-300">¥</span>
                     <span className="text-xl sm:text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-amber-200 via-yellow-300 to-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]">18.8</span>
                     <span className="text-[8px] sm:text-[9.5px] text-amber-300/70 ml-0.5 font-bold font-serif">/终生</span>
                  </div>
                  <span className="text-[6.5px] sm:text-[7.5px] text-amber-500/70 font-semibold tracking-widest uppercase bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/15">一键超值购</span>
               </div>
            </div>

            {/* Powerful value statement that hooks human nature */}
            <p className="text-[11px] sm:text-xs text-white/75 leading-relaxed mb-4 font-light relative z-10 border-l-2 border-amber-500/40 pl-3 py-1 bg-gradient-to-r from-amber-500/5 to-transparent">
                掌控人生最高维算法。提前获知关键周期红利，在危机避无可避前优雅折返。你看得见天命棋局，自然能成为执棋之人。
            </p>

            {/* Compact 2x2 grid features to save vertical space and fit exactly in one mobile screen */}
            <div className="grid grid-cols-2 gap-2.5 mb-5 relative z-10">
               {[
                 { title: '流年天眼预测', icon: <Eye size={12} className="text-amber-400 animate-pulse" />, desc: '提前透视流年、大限关键财富爆发契机，不错过生命周期中仅有财富机遇。' },
                 { title: 'AI 命理神算军师', icon: <Cpu size={12} className="text-amber-400" />, desc: '顶级陪伴式大宗推盘顾问，辅助选址选合伙人、避开签字陷阱、多重择优。' },
                 { title: '能量防线雷达', icon: <TrendingUp size={12} className="text-amber-400" />, desc: '季度级预先告警，破财、官非诉讼、健康滑落风险，在暗处守卫财富基本盘。' },
                 { title: '天命合盘图谱', icon: <Users size={12} className="text-amber-400" />, desc: '深度查验生意合伙人、核心伴侣、家族频率是否通达互助，合运生金。' }
               ].map((feat, i) => (
                 <div key={i} className="p-2 sm:p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-amber-500/20 transition-all">
                    <div className="flex items-center gap-1 mb-1">
                       {feat.icon}
                       <span className="text-[11px] font-bold text-amber-100 tracking-wide">{feat.title}</span>
                    </div>
                    <p className="text-[9.5px]/[13px] text-white/45 font-light">{feat.desc}</p>
                 </div>
               ))}
            </div>
            
            {!isPremium && (
                <button 
                  onClick={onRequirePayment}
                  className="relative z-10 w-full group overflow-hidden rounded-xl p-[1px] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] shadow-[0_8px_20px_rgba(245,158,11,0.15)]"
                >
                   {/* Gold pulse border background */}
                   <span className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-600 opacity-80 group-hover:opacity-100 transition-opacity" />
                   
                   <div className="relative bg-[#0d0d11] px-4 py-3 sm:py-3.5 rounded-xl flex items-center justify-between backdrop-blur-xl">
                       <div className="flex flex-col items-start text-left">
                           <span className="text-xs sm:text-xs font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-amber-400 tracking-wider">
                               立即终生买断 · 开启高维天眼
                           </span>
                           <span className="text-[9px] text-amber-500/70 mt-0.5 tracking-wide">
                               原价 ¥18.8 终生一键授权激活
                           </span>
                       </div>
                       <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-r from-amber-400 to-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.3)] group-hover:shadow-[0_0_15px_rgba(245,158,11,0.6)] transition-all">
                           <ChevronRight size={16} className="text-black font-bold" strokeWidth={3} />
                       </div>
                   </div>
                </button>
            )}
        </div>

        {/* SHARE TO UNLOCK CARD (NOW AT BOTTOM) */}
        {!isPremium && (
            <div className="relative rounded-3xl p-8 bg-gradient-to-br from-indigo-900/20 to-[#0A0A0C] border border-indigo-500/20 overflow-hidden group hover:border-indigo-500/40 transition-all">
                {/* Glow Effects */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
                
                <h3 className="text-xl font-bold text-white tracking-wide mb-2 flex items-center gap-2">
                   <Users className="text-indigo-400" size={20} />
                   邀请好友 · 解锁体验版
                </h3>
                <div className="flex items-end gap-3 mb-6 relative z-10">
                    <span className="text-3xl font-black text-indigo-400 tracking-tight">¥ 8.88</span>
                </div>
                <p className="text-sm text-white/60 leading-relaxed mb-6 font-light relative z-10">
                    不想直接开通？转发给 3 位同行者，同样即可体验核心功能。拉满同频能量。<br/>
                    <span className="block mt-4 text-xs text-white/50 font-mono bg-black/30 p-2 rounded-lg border border-white/5 inline-block">
                        助力进度: <span className="text-indigo-400 font-bold">{shareCount}/3</span>
                    </span>
                </p>
                
                <button 
                    onClick={() => setShowShareModal(true)}
                    className="relative z-10 w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-sm font-bold tracking-widest transition-all border border-indigo-500/30 bg-indigo-500/10 text-white hover:bg-indigo-500/20 hover:border-indigo-400 active:scale-95"
                >
                    {isShareUnlocked ? '立 即 领 取体验' : '分 享 邀 请 助 力'}
                    <ChevronRight size={16} />
                </button>
            </div>
        )}
    </div>
  );

  const SecurityView = () => {
    const findIdentity = (...providers: string[]) => identities.find((identity) =>
      identity.status === 'active' && providers.includes(identity.provider)
    );
    const phoneIdentity = findIdentity('phone');
    const wechatIdentity = findIdentity('wechat');
    const hasPasswordCredential = Boolean(phoneIdentity?.verifiedAt);
    const items = [
      { label: '手机登录', identity: phoneIdentity, fallback: '未绑定', icon: <Smartphone size={18} /> },
      ...(wechatIdentity ? [{ label: '微信登录', identity: wechatIdentity, fallback: '', icon: <span className="font-serif italic">W</span> }] : []),
      { label: 'Apple 登录', identity: findIdentity('apple'), fallback: '暂未开放', icon: <span className="font-semibold">A</span> },
      { label: '邮箱登录', identity: findIdentity('email', 'google'), fallback: '暂未开放', icon: <span className="font-semibold">@</span> },
    ];

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="rounded-3xl bg-white/[0.02] border border-white/5 p-2">
          {items.map((item) => (
            <div key={item.label} className="p-4 flex items-center justify-between rounded-2xl">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex w-[18px] shrink-0 items-center justify-center text-white/40">{item.icon}</div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white/90">{item.label}</p>
                  <p className="mt-0.5 truncate text-xs font-mono text-white/40">
                    {item.identity?.maskedIdentifier || item.fallback}
                  </p>
                </div>
              </div>
              <span className="ml-3 shrink-0 rounded border border-white/10 px-2 py-1 text-[10px] text-white/30">
                {item.identity ? '已验证' : item.fallback}
              </span>
            </div>
          ))}
        </div>

        {hasPasswordCredential && (
          <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-5">
            <button
              type="button"
              onClick={() => {
                setShowPasswordForm((current) => !current);
                setPasswordError(null);
              }}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="flex items-center gap-3 text-sm font-medium text-white/90">
                <Lock size={17} className="text-white/45" />
                修改密码
              </span>
              <ChevronRight size={16} className={`text-white/30 transition-transform ${showPasswordForm ? 'rotate-90' : ''}`} />
            </button>

            {showPasswordForm && (
              <form onSubmit={handleChangePassword} className="mt-5 space-y-3 border-t border-white/5 pt-5">
                {[
                  { id: 'current-password', label: '当前密码', value: currentPassword, setter: setCurrentPassword, autoComplete: 'current-password' },
                  { id: 'new-password', label: '新密码', value: newPassword, setter: setNewPassword, autoComplete: 'new-password' },
                  { id: 'confirm-password', label: '确认新密码', value: confirmPassword, setter: setConfirmPassword, autoComplete: 'new-password' },
                ].map((field) => (
                  <label key={field.id} htmlFor={field.id} className="block">
                    <span className="mb-1.5 block text-[11px] text-white/45">{field.label}</span>
                    <div className="flex items-center rounded-xl border border-white/10 bg-black/25 focus-within:border-amber-500/35">
                      <input
                        id={field.id}
                        type={showPasswordValues ? 'text' : 'password'}
                        autoComplete={field.autoComplete}
                        value={field.value}
                        disabled={passwordChanging}
                        onChange={(event) => field.setter(event.target.value)}
                        className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordValues((current) => !current)}
                        aria-label={showPasswordValues ? '隐藏密码' : '显示密码'}
                        className="mr-2 rounded-lg p-2 text-white/35 hover:bg-white/5 hover:text-white"
                      >
                        {showPasswordValues ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </label>
                ))}

                {passwordError && (
                  <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
                    {passwordError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={passwordChanging || !currentPassword || !newPassword || !confirmPassword}
                  className="w-full rounded-xl bg-white py-3 text-xs font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {passwordChanging ? '正在修改...' : '确认修改并重新登录'}
                </button>
              </form>
            )}
          </div>
        )}

        <button onClick={handleDeleteAccount} className="w-full text-left p-6 rounded-3xl bg-white/[0.01] border border-white/5 hover:border-rose-500/30 transition-all group">
          <p className="text-sm font-medium text-rose-500/80 mb-1 group-hover:text-rose-400">注销账户</p>
          <p className="text-xs font-light text-white/30">永久删除所有档案数据，不可恢复</p>
        </button>
      </div>
    );
  };

  const SettingsView = () => (
     <div className="space-y-4 animate-fade-in">
        <div className="rounded-3xl bg-white/[0.02] border border-white/5 p-2">
            <button onClick={() => handleToggleSetting('notifications')} className="w-full p-4 flex items-center justify-between group hover:bg-white/[0.02] rounded-2xl transition-all">
                <div className="flex items-center gap-4">
                    <Bell size={18} className="text-white/40" strokeWidth={1.5} />
                    <span className="text-sm font-medium text-white/90">{i18n.t('user.notifications')}</span>
                </div>
                <div className={`w-8 h-4 rounded-full p-[2px] transition-colors ${settings.notifications ? 'bg-white' : 'bg-white/10'}`}>
                    <div className={`w-3 h-3 bg-black rounded-full transition-transform ${settings.notifications ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
            </button>

            {[
                { label: '多语言 (Language)', icon: <Globe size={18} strokeWidth={1.5} />, val: settings.language },
                { label: '隐私政策 (Privacy)', icon: <Shield size={18} strokeWidth={1.5} />, val: '' },
                { label: '关于我们 (About)', icon: <HelpCircle size={18} strokeWidth={1.5} />, val: 'v2.4.0' },
            ].map((item, i) => (
                <button key={i} className="w-full p-4 flex items-center justify-between group hover:bg-white/[0.02] rounded-2xl transition-all">
                    <div className="flex items-center gap-4">
                        <div className="text-white/40">{item.icon}</div>
                        <span className="text-sm font-medium text-white/90">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-white/30">{item.val}</span>
                        <ChevronRight size={16} className="text-white/20 group-hover:text-white/60 transition-colors" strokeWidth={1.5} />
                    </div>
                </button>
            ))}
        </div>

        <button onClick={() => onLogout?.()} className="w-full p-4 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white hover:text-black text-white/60 text-sm font-medium transition-all flex items-center justify-center gap-3">
           <LogOut size={16} strokeWidth={1.5} />
           {i18n.t('user.logout') || '退出登录'}
        </button>
     </div>
  );

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 md:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
       <ModuleHelperTag text="账户档案管理与偏好设置" />
       
       <div className="w-full h-full md:max-h-[85vh] md:w-[800px] md:rounded-[40px] bg-[#0A0A0C] border border-white/10 flex flex-col md:flex-row overflow-hidden shadow-2xl relative">
           {/* Abstract Background Glow */}
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-white/5 to-transparent blur-[120px] rounded-full pointer-events-none" />

           {/* Mobile Top Bar */}
           <div className="md:hidden flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5 relative z-10 bg-[#0A0A0C]/80 backdrop-blur-md">
               <button onClick={onClose} className="flex items-center justify-center p-2 -ml-2 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-colors">
                   <ChevronLeft size={20} strokeWidth={2} />
               </button>
               <span className="text-xs font-bold text-white uppercase tracking-widest">我的档案</span>
               <div className="w-9" /> {/* Spacer for centering */}
           </div>

           {/* Minimal Nav / Sidebar */}
           <div className="w-full md:w-[240px] pt-4 pb-4 md:py-10 px-6 md:px-8 border-b md:border-b-0 md:border-r border-white/5 flex flex-col shrink-0 relative z-10 bg-black/20 justify-between">
               
               <div>
                   {/* Return Button for Desktop */}
                   <button 
                       onClick={onClose}
                       className="hidden md:flex items-center gap-2 mb-12 py-2 px-3 -ml-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all group w-fit"
                   >
                       <ChevronLeft size={16} className="text-white/60 group-hover:text-white transition-colors" strokeWidth={2} />
                       <span className="text-[11px] font-bold tracking-widest text-white/80 uppercase">返回主界面</span>
                   </button>
                   
                   <div className="flex w-full md:flex-col gap-3 md:gap-3 overflow-x-auto no-scrollbar items-center md:items-start py-2 md:py-0">
                       {menuItems.map(item => (
                           <button
                             key={item.id}
                             onClick={() => setActiveTab(item.id)}
                             className={`
                                flex flex-1 min-w-[80px] md:w-full items-center justify-center md:justify-start gap-2 py-3 px-4 md:-mx-4 rounded-xl md:rounded-xl text-sm md:text-sm tracking-wide transition-all whitespace-nowrap relative group
                                ${activeTab === item.id 
                                    ? 'text-white font-medium bg-white/10 md:bg-white/5 border border-white/20 md:border-white/10 shadow-lg md:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
                                    : 'text-white/60 hover:text-white/90 font-light border border-transparent md:hover:bg-white/[0.02] bg-white/[0.02] md:bg-transparent'}
                             `}
                           >
                              <span className={activeTab === item.id ? 'opacity-100 text-amber-400 md:text-white' : 'opacity-60 group-hover:opacity-80'}>{item.icon}</span>
                              <span className="hidden md:inline">{item.label}</span>
                              <span className="md:hidden text-xs">{item.label}</span>
                           </button>
                       ))}
                   </div>
               </div>

               <div className="mt-auto hidden md:block text-[9px] font-mono uppercase tracking-widest text-white/20 pt-8">
                   <p>System V2.4</p>
               </div>
           </div>

           {/* Main Content Area */}
           <div className="flex-1 min-h-0 overflow-y-auto w-full no-scrollbar relative z-10">
               <div className="min-h-full p-6 md:p-12 pb-24 md:pb-12">
                   <h2 className="text-3xl font-light text-white mb-10 tracking-tight hidden md:block">
                       {menuItems.find(i => i.id === activeTab)?.label}
                   </h2>
                   
                   <div className="max-w-xl mx-auto md:mx-0">
                       {activeTab === 'profile' && ProfileView()}
                       {activeTab === 'membership' && MembershipView()}
                       {activeTab === 'security' && SecurityView()}
                       {activeTab === 'settings' && SettingsView()}
                   </div>
               </div>
           </div>
       </div>

       <ShareUnlockModal />
    </div>
  );
};
