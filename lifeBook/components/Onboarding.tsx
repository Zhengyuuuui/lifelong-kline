

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UserData, Gender } from '../types';
import { useI18n } from '../utils/i18nContext';

interface OnboardingProps {
  onComplete: (data: UserData) => void;
}

// --- Custom Wheel Picker Component ---
const WheelPicker = ({ 
  items, 
  value, 
  onChange, 
  width = "w-full", 
  height = "h-32" 
}: { 
  items: (string | number)[], 
  value: string | number, 
  onChange: (val: any) => void,
  width?: string,
  height?: string
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const selectedIndex = items.findIndex(item => item === value);
    if (!container || selectedIndex < 0) return;

    const selected = container.children.item(selectedIndex) as HTMLElement | null;
    if (!selected) return;
    const targetTop = selected.offsetTop - (container.clientHeight - selected.offsetHeight) / 2;
    container.scrollTo({ top: targetTop, behavior: 'smooth' });
  }, [items, value]);

  useEffect(() => () => {
    if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
  }, []);

  const handleScroll = () => {
    if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    scrollEndTimerRef.current = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      const center = container.scrollTop + container.clientHeight / 2;
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;
      Array.from(container.children).forEach((child, index) => {
        const element = child as HTMLElement;
        const distance = Math.abs(element.offsetTop + element.offsetHeight / 2 - center);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });
      const nextValue = items[closestIndex];
      if (nextValue !== undefined && nextValue !== value) onChange(nextValue);
    }, 80);
  };

  return (
    <div className={`relative ${width} ${height} overflow-hidden group`}>
      {/* Selection Highlight / Gradient Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-b from-[#050505] via-transparent to-[#050505]" />
      <div className="absolute top-1/2 left-0 right-0 h-10 -mt-5 border-y border-white/10 z-0 pointer-events-none" />

      <div 
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide py-[calc(50%-1.25rem)]"
        ref={containerRef}
        onScroll={handleScroll}
      >
        {items.map((item) => (
          <div 
            key={item} 
            onClick={() => {
                onChange(item);
            }}
            className={`h-10 flex items-center justify-center snap-center cursor-pointer transition-all duration-200 ${
              item === value 
                ? 'text-white font-bold text-xl scale-110' 
                : 'text-white/30 text-sm scale-90'
            }`}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const { t } = useI18n();
  // State
  const [name, setName] = useState("");
  const [year, setYear] = useState(1998);
  const [month, setMonth] = useState(6);
  const [day, setDay] = useState(15);
  const [time, setTime] = useState("09:00");
  const [gender, setGender] = useState<Gender | null>(null);
  const [location, setLocation] = useState("");
  const [isAnalysing, setIsAnalysing] = useState(false);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Arrays for pickers
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: 101 }, (_, i) => currentYear - i), [currentYear]);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  useEffect(() => {
    if (day > daysInMonth) setDay(daysInMonth);
  }, [day, daysInMonth]);

  useEffect(() => () => {
    if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
  }, []);
  
  // Cities (Chinese Focus)
  const commonCities = ["北京", "上海", "广州", "深圳", "成都", "杭州", "武汉", "西安", "重庆", "纽约", "伦敦", "东京"];
  const [filteredCities, setFilteredCities] = useState<string[]>([]);

  const handleCityInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocation(val);
    if (val.length > 0) {
      setFilteredCities(commonCities.filter(c => c.includes(val)));
    } else {
      setFilteredCities([]);
    }
  };

  const handleSubmit = () => {
    if (isAnalysing || !gender || !location.trim() || !name.trim()) return;

    setIsAnalysing(true);

    completionTimerRef.current = setTimeout(() => {
        const birthDate = new Date(year, month - 1, day, 12, 0, 0);
        onComplete({
            name: name.trim(),
            birthDate,
            birthTime: time,
            gender,
            location: location.trim()
        });
    }, 2500);
  };

  const handleSkip = () => {
      if (isAnalysing) return;
      setIsAnalysing(true);
      completionTimerRef.current = setTimeout(() => {
        const birthDate = new Date(2000, 0, 1, 12, 0, 0);
        onComplete({
            name: "旅行者",
            birthDate,
            birthTime: "12:00",
            gender: "neutral",
            location: "赛博空间"
        });
      }, 1500);
  };

  const GENDER_LABELS: Record<string, string> = {
      male: t('onb_gender_male'),
      female: t('onb_gender_female'),
      neutral: t('onb_gender_secret')
  };

  if (isAnalysing) {
      return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#050505] text-white space-y-6 animate-in fade-in duration-700">
              <div className="relative">
                  <div className="w-24 h-24 rounded-full border-t-2 border-emerald-400 animate-spin" />
                  <div className="absolute inset-0 w-24 h-24 rounded-full border-b-2 border-purple-500 animate-spin-slow opacity-70" />
              </div>
              <h2 className="text-xl font-serif tracking-widest animate-pulse">{t('onb_analyzing')}</h2>
              <p className="text-xs text-white/40 uppercase tracking-[0.2em]">{t('onb_analyzing_sub')}</p>
          </div>
      )
  }

  return (
    <div className="w-full h-full bg-[#050505] text-gray-200 overflow-y-auto overflow-x-hidden relative">
        {/* Background Ambient Light */}
        <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-900/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-md mx-auto min-h-full p-8 flex flex-col justify-center relative z-10">
            
            {/* Header */}
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-serif text-white mb-2">{t('onb_title')}</h1>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">{t('onb_desc')}</p>
            </div>

            <div className="space-y-8">
                
                {/* 0. Name Input (Strict Requirement) */}
                <div className="space-y-3">
                     <div className="flex justify-between items-baseline">
                        <label className="text-xs uppercase tracking-wider text-white/70">{t('onb_name')}</label>
                        <span className="text-[10px] text-purple-400/80">{t('onb_name_sub')}</span>
                    </div>
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('onb_name_ph')}
                        className="w-full bg-transparent border-b border-white/20 py-2 text-lg text-white focus:outline-none focus:border-white/60 transition-colors placeholder:text-white/20"
                    />
                </div>

                {/* 1. Date of Birth */}
                <div className="space-y-3">
                    <div className="flex justify-between items-baseline">
                        <label className="text-xs uppercase tracking-wider text-white/70">{t('onb_date')}</label>
                        <span className="text-[10px] text-emerald-400/80">{t('onb_date_sub')}</span>
                    </div>
                    
                    <div className="flex h-32 bg-white/5 rounded-xl border border-white/5 backdrop-blur-sm relative overflow-hidden">
                        <WheelPicker items={years} value={year} onChange={setYear} />
                        <div className="w-px bg-white/10 h-16 self-center" />
                        <WheelPicker items={months} value={month} onChange={setMonth} />
                        <div className="w-px bg-white/10 h-16 self-center" />
                        <WheelPicker items={days} value={day} onChange={setDay} />
                    </div>
                </div>

                {/* 2. Birth Time */}
                <div className="space-y-3">
                     <div className="flex justify-between items-baseline">
                        <label className="text-xs uppercase tracking-wider text-white/70">{t('onb_time')}</label>
                    </div>

                    <div className="flex items-center gap-4">
                        <input 
                            type="time" 
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-xl text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                        />
                        <button 
                            onClick={() => setTime("23:30")}
                            className="px-4 py-3 text-[10px] uppercase tracking-wider text-white/40 border border-white/10 rounded-xl hover:bg-white/5 hover:text-white transition-all whitespace-nowrap"
                        >
                            {t('onb_unknown_time')}
                        </button>
                    </div>
                </div>

                {/* 3. Gender */}
                <div className="space-y-3">
                    <label className="text-xs uppercase tracking-wider text-white/70">{t('onb_gender')}</label>
                    <div className="flex gap-3">
                        {(['male', 'female', 'neutral'] as Gender[]).map((g) => (
                            <button
                                key={g}
                                onClick={() => setGender(g)}
                                className={`flex-1 py-4 rounded-xl border backdrop-blur-md transition-all duration-300 relative overflow-hidden group
                                    ${gender === g 
                                        ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.3)]' 
                                        : 'border-white/10 bg-white/5 hover:bg-white/10 text-white/40'
                                    }`}
                            >
                                <span className={`text-sm uppercase tracking-wider ${gender === g ? 'text-white' : ''}`}>
                                    {GENDER_LABELS[g]}
                                </span>
                                {gender === g && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent animate-pulse" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 4. Location */}
                <div className="space-y-3 relative">
                    <div className="flex justify-between items-baseline">
                        <label className="text-xs uppercase tracking-wider text-white/70">{t('onb_location')}</label>
                        <span className="text-[10px] text-purple-400/80">{t('onb_loc_sub')}</span>
                    </div>
                    
                    <input 
                        type="text" 
                        value={location}
                        onChange={handleCityInput}
                        placeholder={t('onb_loc_ph')}
                        className="w-full bg-transparent border-b border-white/20 py-3 text-lg text-white focus:outline-none focus:border-white/60 transition-colors placeholder:text-white/20"
                    />
                    
                    {filteredCities.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-[#1A1A1A] border border-white/10 rounded-b-xl z-20 max-h-32 overflow-y-auto">
                            {filteredCities.map(city => (
                                <div 
                                    key={city}
                                    onClick={() => { setLocation(city); setFilteredCities([]); }}
                                    className="px-4 py-2 text-sm text-white/70 hover:bg-white/10 cursor-pointer"
                                >
                                    {city}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Submit & Skip Actions */}
                <div className="mt-8 space-y-4">
                    <button 
                        onClick={handleSubmit}
                        disabled={!gender || !location || !name}
                        className={`w-full py-4 rounded-2xl text-sm uppercase tracking-[0.2em] font-bold transition-all duration-500
                            ${(gender && location && name) 
                                ? 'bg-white text-black hover:scale-[1.02] shadow-[0_0_30px_rgba(255,255,255,0.2)]' 
                                : 'bg-white/10 text-white/20 cursor-not-allowed'
                            }`}
                    >
                        {t('onb_start')}
                    </button>
                    
                    <div className="flex items-center justify-center gap-4 opacity-80 hover:opacity-100 transition-opacity">
                        <div className="h-px w-full bg-gradient-to-r from-transparent to-white/10" />
                        <button 
                            onClick={handleSkip}
                            className="whitespace-nowrap py-2 px-4 text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-white transition-colors"
                        >
                            {t('onb_demo')}
                        </button>
                        <div className="h-px w-full bg-gradient-to-l from-transparent to-white/10" />
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
};

export default Onboarding;
