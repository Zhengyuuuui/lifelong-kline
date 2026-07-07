import React, { useEffect, useRef, useState } from 'react';
import {
    Apple,
    ChevronRight,
    Eye,
    EyeOff,
    KeyRound,
    Lock,
    Mail,
    MessageCircle,
    ShieldCheck,
    Smartphone,
    X,
} from 'lucide-react';
import type {
    AuthSmsPayload,
    AuthProvider,
    PasswordLoginPayload,
    RegistrationSmsResult,
    SmsAuthPayload,
} from '../services/backendClient';
import { iosProductionBridge } from '../services/iosProductionBridge';

interface AuthModalProps {
    isOpen: boolean;
    notice?: string | null;
    onClose: () => void;
    onPasswordLogin: (payload: PasswordLoginPayload) => void | Promise<void>;
    onSendAuthSms: (payload: AuthSmsPayload) => Promise<RegistrationSmsResult>;
    onSmsAuth: (payload: SmsAuthPayload) => void | Promise<void>;
    onNativeLoginSuccess: (provider: AuthProvider) => void | Promise<void>;
}

class AuthInputError extends Error {}

type AuthMode = 'sms' | 'password';

const normalizePhoneToE164 = (countryCode: string, phone: string) => {
    if (countryCode !== '+86') {
        throw new AuthInputError('当前仅支持中国大陆 +86 手机号。');
    }
    const compact = phone.trim().replace(/[\s().-]/g, '');
    const localDigits = compact.replace(/^0+/, '');
    const countryDigits = countryCode.replace(/^\+/, '');
    const candidate = compact.startsWith('+')
        ? compact
        : localDigits.startsWith(countryDigits)
            ? `+${localDigits}`
            : `${countryCode}${localDigits}`;
    if (!/^\+861[3-9]\d{9}$/.test(candidate)) {
        throw new AuthInputError('请输入正确的中国大陆手机号。');
    }
    return candidate;
};

const loginErrorMessage = (error: unknown) => {
    const status = (error as { status?: number }).status;
    if (status === 401) return '账号或密码错误。';
    if (status === 422) return '请输入有效的手机号和 10-128 位密码。';
    if (status === 429) return '尝试次数过多，请稍后再试。';
    if (!status) return '网络异常，请检查连接后重试。';
    return '登录暂时不可用，请稍后重试。';
};

const smsErrorMessage = (error: unknown) => {
    const status = (error as { status?: number }).status;
    if (status === 422) return '请输入正确的中国大陆手机号。';
    if (status === 409) return '验证码已失效，请重新获取。';
    if (status === 429) return '验证码发送过于频繁，请稍后再试。';
    if (status === 503) return '短信服务暂不可用，请稍后再试。';
    if (!status) return '网络异常，请检查连接后重试。';
    return '验证码发送失败，请稍后重试。';
};

const smsAuthErrorMessage = (error: unknown) => {
    const status = (error as { status?: number }).status;
    if (status === 422) return '手机号或验证码格式错误。';
    if (status === 409) return '验证码已失效，请重新获取。';
    if (status === 410) return '验证码已过期，请重新获取。';
    if (status === 429) return '操作过于频繁，请稍后再试。';
    if (status === 503) return '短信服务暂不可用，请稍后再试。';
    if (!status) return '网络异常，请检查连接后重试。';
    return '登录 / 注册暂时不可用，请稍后重试。';
};

const passwordLength = (value: string) => Array.from(value).length;

export const AuthModal: React.FC<AuthModalProps> = ({
    isOpen,
    notice,
    onClose,
    onPasswordLogin,
    onSendAuthSms,
    onSmsAuth,
    onNativeLoginSuccess,
}) => {
    const [mode, setMode] = useState<AuthMode>('sms');
    const [countryCode, setCountryCode] = useState('+86');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [smsCode, setSmsCode] = useState('');
    const [challengeId, setChallengeId] = useState<string | null>(null);
    const [smsCountdown, setSmsCountdown] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [smsLoading, setSmsLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const countdownTimerRef = useRef<number | null>(null);
    const nativeRuntime = iosProductionBridge.isNativeRuntime();

    const clearCountdownTimer = () => {
        if (countdownTimerRef.current !== null) {
            window.clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
    };

    useEffect(() => {
        clearCountdownTimer();
        if (!isOpen || smsCountdown <= 0) return undefined;

        countdownTimerRef.current = window.setInterval(() => {
            setSmsCountdown((current) => Math.max(0, current - 1));
        }, 1000);

        return clearCountdownTimer;
    }, [isOpen, smsCountdown]);

    useEffect(() => clearCountdownTimer, []);

    useEffect(() => {
        if (!isOpen) {
            setMode('sms');
            setPassword('');
            setSmsCode('');
            setChallengeId(null);
            setSmsCountdown(0);
            setShowPassword(false);
            setLoading(false);
            setSmsLoading(false);
            setAuthError(null);
        }
    }, [isOpen]);

    const handlePhoneChange = (value: string) => {
        setPhone(value);
        if (mode === 'sms') {
            setChallengeId(null);
            setSmsCode('');
            setSmsCountdown(0);
        }
    };

    const switchMode = (nextMode: AuthMode) => {
        if (loading || smsLoading || mode === nextMode) return;
        setMode(nextMode);
        setAuthError(null);
        setPassword('');
        setSmsCode('');
        setChallengeId(null);
        setSmsCountdown(0);
        setShowPassword(false);
    };

    const handlePasswordLogin = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (loading) return;

        setAuthError(null);
        try {
            const normalizedPhone = normalizePhoneToE164(countryCode, phone);
            if (passwordLength(password) < 10 || passwordLength(password) > 128) {
                throw new AuthInputError('请输入 10-128 位密码。');
            }
            setLoading(true);
            await onPasswordLogin({ phone: normalizedPhone, password });
            setPassword('');
        } catch (error) {
            const message = error instanceof AuthInputError
                ? error.message
                : loginErrorMessage(error);
            setAuthError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleSendAuthSms = async () => {
        if (loading || smsLoading || smsCountdown > 0) return;

        setAuthError(null);
        try {
            const normalizedPhone = normalizePhoneToE164(countryCode, phone);
            setSmsLoading(true);
            const result = await onSendAuthSms({
                phone: normalizedPhone,
                purpose: 'auth',
            });
            if (!result.challengeId) {
                throw new AuthInputError('验证码发送失败，请稍后重试。');
            }
            setChallengeId(result.challengeId);
            setSmsCode('');
            setSmsCountdown(Math.max(1, result.retryAfterSeconds || 60));
        } catch (error) {
            const message = error instanceof AuthInputError
                ? error.message
                : smsErrorMessage(error);
            setAuthError(message);
        } finally {
            setSmsLoading(false);
        }
    };

    const handleSmsAuth = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (loading || smsLoading) return;

        setAuthError(null);
        try {
            const normalizedPhone = normalizePhoneToE164(countryCode, phone);
            if (!challengeId) throw new AuthInputError('请先获取短信验证码。');
            if (!/^\d{6}$/.test(smsCode.trim())) {
                throw new AuthInputError('请输入 6 位短信验证码。');
            }
            setLoading(true);
            await onSmsAuth({
                challengeId,
                phone: normalizedPhone,
                code: smsCode.trim(),
            });
            setSmsCode('');
            setChallengeId(null);
            setSmsCountdown(0);
        } catch (error) {
            const message = error instanceof AuthInputError
                ? error.message
                : smsAuthErrorMessage(error);
            setAuthError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleNativeLogin = async (provider: AuthProvider) => {
        if (loading) return;
        setLoading(true);
        setAuthError(null);
        try {
            await onNativeLoginSuccess(provider);
        } catch (error) {
            console.error('Native login failed', error);
            setAuthError('授权失败，请稍后重试。');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center overflow-y-auto p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-3xl" onClick={onClose} />

            <div className="relative my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-[390px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0A0A0A] shadow-[0_20px_80px_rgba(0,0,0,0.9)] ring-1 ring-white/5">
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="关闭登录窗口"
                    className="absolute right-5 top-5 z-20 rounded-full bg-white/5 p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                >
                    <X size={18} />
                </button>

                <div className="border-b border-white/5 px-7 pb-6 pt-8">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
                        <KeyRound size={23} className="text-amber-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">{mode === 'password' ? '密码登录' : '手机号登录'}</h2>
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                        {mode === 'password'
                            ? '使用已设置的登录密码进入账号。'
                            : '输入验证码即可登录；新手机号会自动创建账号。'}
                    </p>
                </div>

                <div className="relative z-10 min-h-0 overflow-y-auto px-6 pb-8 pt-6">
                    {notice && (
                        <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs leading-5 text-emerald-200">
                            {notice}
                        </div>
                    )}

                    {nativeRuntime ? (
                        <div className="space-y-3">
                            <button
                                type="button"
                                disabled={loading || !iosProductionBridge.supportsAppleSignIn()}
                                onClick={() => void handleNativeLogin('apple')}
                                className="flex w-full items-center justify-center gap-3 rounded-xl bg-white py-3.5 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Apple size={18} />
                                使用 Apple 登录
                            </button>
                            <button
                                type="button"
                                disabled={loading || !iosProductionBridge.supportsWeChatLogin()}
                                onClick={() => void handleNativeLogin('wechat')}
                                className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#09BB07] py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <MessageCircle size={18} />
                                使用微信登录
                            </button>
                            {authError && (
                                <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-center text-[11px] font-medium text-red-300">
                                    {authError}
                                </p>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={mode === 'sms' ? handleSmsAuth : handlePasswordLogin} className="space-y-4">
                            <div>
                                <label htmlFor="auth-phone" className="mb-2 block text-xs font-medium text-slate-300">手机号</label>
                                <div className="flex rounded-xl border border-white/10 bg-[#101010] transition-colors focus-within:border-amber-500/45">
                                    <label className="sr-only" htmlFor="auth-country-code">国家区号</label>
                                    <select
                                        id="auth-country-code"
                                        value={countryCode}
                                        onChange={(event) => setCountryCode(event.target.value)}
                                        className="w-[84px] shrink-0 border-r border-white/10 bg-transparent px-3 text-sm text-white outline-none"
                                    >
                                        <option value="+86" className="bg-[#101010]">+86</option>
                                    </select>
                                    <div className="flex min-w-0 flex-1 items-center">
                                        <Smartphone size={17} className="ml-3 shrink-0 text-slate-500" />
                                        <input
                                            id="auth-phone"
                                            type="tel"
                                            inputMode="tel"
                                            autoComplete="tel-national"
                                            value={phone}
                                            onChange={(event) => handlePhoneChange(event.target.value)}
                                            placeholder="请输入手机号"
                                            disabled={loading || smsLoading}
                                            className="min-w-0 flex-1 bg-transparent px-3 py-3.5 text-sm text-white outline-none placeholder:text-slate-600 disabled:opacity-60"
                                        />
                                    </div>
                                </div>
                            </div>

                            {mode === 'sms' && (
                                <div>
                                    <label htmlFor="auth-sms-code" className="mb-2 block text-xs font-medium text-slate-300">短信验证码</label>
                                    <div className="flex rounded-xl border border-white/10 bg-[#101010] transition-colors focus-within:border-amber-500/45">
                                        <input
                                            id="auth-sms-code"
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            value={smsCode}
                                            onChange={(event) => setSmsCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="6 位验证码"
                                            disabled={loading || smsLoading}
                                            className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-600 disabled:opacity-60"
                                        />
                                        <button
                                            type="button"
                                            disabled={loading || smsLoading || smsCountdown > 0 || !phone.trim()}
                                            onClick={() => void handleSendAuthSms()}
                                            className="mr-2 self-center rounded-lg border border-white/10 px-3 py-2 text-[11px] font-bold text-amber-200 transition-colors hover:border-amber-400/40 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:border-white/10 disabled:hover:bg-transparent"
                                        >
                                            {smsLoading ? '发送中' : smsCountdown > 0 ? `${smsCountdown}s` : '获取验证码'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {mode === 'password' && (
                            <div>
                                <label htmlFor="auth-password" className="mb-2 block text-xs font-medium text-slate-300">密码</label>
                                <div className="flex items-center rounded-xl border border-white/10 bg-[#101010] transition-colors focus-within:border-amber-500/45">
                                    <Lock size={17} className="ml-4 shrink-0 text-slate-500" />
                                    <input
                                        id="auth-password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        placeholder="请输入密码"
                                        disabled={loading}
                                        className="min-w-0 flex-1 bg-transparent px-3 py-3.5 text-sm text-white outline-none placeholder:text-slate-600 disabled:opacity-60"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((current) => !current)}
                                        aria-label={showPassword ? '隐藏密码' : '显示密码'}
                                        className="mr-2 rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white"
                                    >
                                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>
                            </div>
                            )}

                            {authError && (
                                <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-center text-[11px] font-medium text-red-300">
                                    {authError}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={
                                    loading ||
                                    smsLoading ||
                                    !phone.trim() ||
                                    (mode === 'password' ? !password : (!smsCode || !challengeId))
                                }
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-bold text-black transition-all hover:bg-amber-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {loading ? (
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/25 border-t-black" />
                                ) : (
                                    <>
                                        {mode === 'password' ? '登录' : '登录 / 注册'}
                                        <ChevronRight size={17} />
                                    </>
                                )}
                            </button>

                            <div className="grid grid-cols-2 gap-2 pt-2">
                                <button
                                    type="button"
                                    disabled={loading || smsLoading}
                                    onClick={() => switchMode(mode === 'password' ? 'sms' : 'password')}
                                    className="flex items-center justify-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-2.5 text-[11px] text-slate-300 transition-colors hover:border-white/15 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:text-slate-600"
                                >
                                    {mode === 'password' ? <Smartphone size={14} /> : <Lock size={14} />}
                                    {mode === 'password' ? '验证码登录 / 注册' : '使用密码登录'}
                                </button>
                                <button type="button" disabled className="flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-2.5 text-[11px] text-slate-600">
                                    <Mail size={14} />
                                    邮箱登录 · 暂未开放
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                <div className="flex items-center justify-center gap-2 border-t border-white/5 bg-[#070707] p-4 text-[9px] text-slate-600">
                    <ShieldCheck size={11} />
                    验证码和密码仅通过加密连接提交，不会存储在浏览器中
                </div>
            </div>
        </div>
    );
};
