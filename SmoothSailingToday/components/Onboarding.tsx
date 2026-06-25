import React, { useEffect, useRef, useState } from 'react';
import { UserProfile } from '../types';
import { ArrowRight, Loader2, Sparkles, User, MapPin, Calendar, Clock, Disc, AlertCircle } from 'lucide-react';
import { validateUserProfileWithAI } from '../services/ai';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  onComplete: (profile: UserProfile) => void;
  onSkip: () => void;
}

const Onboarding: React.FC<Props> = ({ onComplete, onSkip }) => {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    gender: 'male',
  });
  const isMountedRef = useRef(true);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
    };
  }, []);

  const handleChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errorMsg) setErrorMsg('');
  };

  const handleStartDeduction = async () => {
    if (isLoading) return;
    if (!formData.name || !formData.birthDate || !formData.birthTime || !formData.birthPlace) {
      setErrorMsg("请完整填写信息，以便我们进行推演。");
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    const profile: UserProfile = {
        name: formData.name!,
        birthDate: formData.birthDate!,
        birthTime: formData.birthTime!,
        birthPlace: formData.birthPlace!,
        gender: formData.gender as 'male' | 'female',
        onboardedAt: Date.now()
    };

    // Pre-Validation: Check for realistic data
    const validation = await validateUserProfileWithAI(profile);
    if (!isMountedRef.current) return;
    
    if (!validation.isValid) {
        setIsLoading(false);
        setErrorMsg(validation.message || "输入信息有误，请核对后重试。");
        return;
    }

    // Short delay for UX smoothness
    completionTimerRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        onComplete(profile);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0f172a] flex items-center justify-center p-6 overflow-hidden">
        {/* Ambient Background */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] opacity-60 animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] opacity-60 animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 texture-noise opacity-20" />

        {/* Main Card */}
        <div className="relative w-full max-w-[380px] z-10 animate-slide-up-fade">
            
            {/* Header */}
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-[0_0_30px_rgba(99,102,241,0.4)] mb-6 animate-spin-slow">
                    <Disc size={32} className="text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">{t('app.title')}</h1>
                <p className="text-sm text-white/50 tracking-wide">{t('app.subtitle')}</p>
            </div>

            {/* Form */}
            <div className="glass-panel-premium rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
                <div className="space-y-5">
                    {/* Name */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider pl-1">{t('onboarding.name')}</label>
                        <div className="relative">
                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                            <input 
                                type="text" 
                                value={formData.name || ''}
                                onChange={e => handleChange('name', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all placeholder-white/20"
                                placeholder={t('onboarding.namePlaceholder')}
                            />
                        </div>
                    </div>

                    {/* Gender */}
                    <div className="flex gap-4">
                         <label className={`flex-1 cursor-pointer border rounded-xl py-3 flex items-center justify-center gap-2 transition-all ${formData.gender === 'male' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}>
                             <input type="radio" name="gender" className="hidden" checked={formData.gender === 'male'} onChange={() => handleChange('gender', 'male')} />
                             <span className="text-xs font-bold">{t('onboarding.genderMale')}</span>
                         </label>
                         <label className={`flex-1 cursor-pointer border rounded-xl py-3 flex items-center justify-center gap-2 transition-all ${formData.gender === 'female' ? 'bg-purple-500/20 border-purple-500/50 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}>
                             <input type="radio" name="gender" className="hidden" checked={formData.gender === 'female'} onChange={() => handleChange('gender', 'female')} />
                             <span className="text-xs font-bold">{t('onboarding.genderFemale')}</span>
                         </label>
                    </div>

                    <div className="flex gap-3">
                        {/* Date */}
                        <div className="flex-1 space-y-1.5">
                            <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider pl-1">{t('onboarding.birthDate')}</label>
                            <div className="relative">
                                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                <input 
                                    type="date" 
                                    value={formData.birthDate || ''}
                                    onChange={e => handleChange('birthDate', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-2 py-3 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                                />
                            </div>
                        </div>
                        {/* Time */}
                        <div className="w-[40%] space-y-1.5">
                            <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider pl-1">{t('onboarding.birthTime')}</label>
                            <div className="relative">
                                <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                <input 
                                    type="time" 
                                    value={formData.birthTime || ''}
                                    onChange={e => handleChange('birthTime', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-2 py-3 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Place */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider pl-1">{t('onboarding.birthPlace')}</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                            <input 
                                type="text" 
                                value={formData.birthPlace || ''}
                                onChange={e => handleChange('birthPlace', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all placeholder-white/20"
                                placeholder={t('onboarding.birthPlacePlaceholder')}
                            />
                        </div>
                    </div>

                </div>

                <div className="mt-8 space-y-3">
                    {/* Feedback Message */}
                    {errorMsg && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2 animate-fade-in">
                            <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-red-200 leading-relaxed">{errorMsg}</p>
                        </div>
                    )}
                    
                    <button 
                        onClick={handleStartDeduction}
                        disabled={isLoading}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-bold text-sm shadow-[0_10px_40px_-10px_rgba(99,102,241,0.5)] active:scale-95 select-none transition-all duration-200 ease-out flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        {isLoading ? t('onboarding.validating') : t('onboarding.start')}
                    </button>
                    <button 
                        onClick={onSkip}
                        className="w-full py-3 rounded-xl bg-transparent hover:bg-white/5 text-white/30 text-xs font-medium transition-all"
                    >
                        {t('onboarding.skip')}
                    </button>
                </div>

            </div>
            
            <p className="text-center text-[10px] text-white/20 mt-6">
                {t('onboarding.engine')}
            </p>
        </div>
    </div>
  );
};

export default Onboarding;
