import React, { useMemo, useState } from "react";
import { UserInputProfile } from "../types";
import {
  Sparkles,
  MapPin,
  User,
  Calendar,
  Clock,
  X,
  ArrowRight,
} from "lucide-react";
import { i18n } from "../services/i18n";

interface UserInfoFormProps {
  onSubmit: (data: UserInputProfile) => void;
  onCancel?: () => void;
  mode?: "guest" | "authenticated";
  initialValue?: UserInputProfile | null;
  onGuestSubmit?: (data: UserInputProfile) => void;
}

const pad2 = (value: number) => String(value).padStart(2, "0");
const currentYear = new Date().getFullYear();
const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

const parseDateParts = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return {
    year: Number.isFinite(year) ? year : 1990,
    month: Number.isFinite(month) ? month : 1,
    day: Number.isFinite(day) ? day : 1,
  };
};

const parseTimeParts = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return {
    hour: Number.isFinite(hour) ? hour : 12,
    minute: Number.isFinite(minute) ? minute : 0,
  };
};

export const UserInfoForm: React.FC<UserInfoFormProps> = ({
  onSubmit,
  onCancel,
  mode = "authenticated",
  initialValue,
  onGuestSubmit,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(initialValue?.name || "");
  const [gender, setGender] = useState<"male" | "female">(
    initialValue?.gender === "female" ? "female" : "male"
  );
  const [date, setDate] = useState(initialValue?.birthDate || "1990-01-01");
  const [time, setTime] = useState(initialValue?.birthTime || "12:00");
  const [place, setPlace] = useState(initialValue?.birthPlace || "");
  const dateParts = useMemo(() => parseDateParts(date), [date]);
  const timeParts = useMemo(() => parseTimeParts(time), [time]);
  const yearOptions = useMemo(
    () => Array.from({ length: currentYear - 1919 }, (_, index) => currentYear - index),
    []
  );
  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, index) => index + 1), []);
  const dayOptions = useMemo(
    () => Array.from({ length: daysInMonth(dateParts.year, dateParts.month) }, (_, index) => index + 1),
    [dateParts.year, dateParts.month]
  );
  const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, index) => index), []);
  const minuteOptions = useMemo(() => Array.from({ length: 60 }, (_, index) => index), []);

  const updateDatePart = (part: "year" | "month" | "day", value: number) => {
    const next = { ...dateParts, [part]: value };
    const maxDay = daysInMonth(next.year, next.month);
    const safeDay = Math.min(next.day, maxDay);
    setDate(`${next.year}-${pad2(next.month)}-${pad2(safeDay)}`);
  };

  const updateTimePart = (part: "hour" | "minute", value: number) => {
    const next = { ...timeParts, [part]: value };
    setTime(`${pad2(next.hour)}:${pad2(next.minute)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !place.trim() || !date || !time) return;

    setIsSubmitting(true);
    // Simulate a brief calculation/processing time for the "high-end" feel
    await new Promise((r) => setTimeout(r, 650));
    const payload = {
      name,
      gender,
      birthDate: date,
      birthTime: time,
      birthPlace: place,
    };
    if (mode === "guest" && onGuestSubmit) {
      onGuestSubmit(payload);
    } else {
      onSubmit(payload);
    }
  };

  if (isSubmitting) {
    return (
      <div className="fixed inset-0 z-[200] bg-[#020202] text-[#E5D3B3] flex flex-col items-center justify-center font-sans">
        <div className="relative w-48 h-48 mb-8">
          <div className="absolute inset-0 border border-white/5 rounded-full" />
          <div className="absolute inset-4 border border-dashed border-[#D4AF37]/20 rounded-full animate-spin-slow-variable" />
          <div className="absolute inset-8 border border-t-[#D4AF37] border-r-transparent border-b-[#D4AF37] border-l-transparent rounded-full animate-[spin_3s_linear_infinite]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 bg-[#D4AF37]/5 rounded-full blur-xl animate-pulse" />
            <Sparkles size={32} className="text-[#D4AF37] relative z-10" />
          </div>
        </div>
        <div className="text-center space-y-3 relative z-10">
          <h2 className="text-lg font-bold text-white tracking-[0.3em] font-serif uppercase">
            {mode === "guest" ? "正在生成免费预览" : i18n.t("form.submit_verify") || "推演生命星轨"}
          </h2>
          <div className="inline-block px-4 py-1 bg-black/60 rounded-full border border-white/5">
            <p className="text-[10px] text-[#D4AF37] font-mono uppercase tracking-[0.15em] animate-pulse">
              ESTABLISHING GEOMANTIC ARCHIVE...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-[#030303] text-white overflow-y-auto overflow-x-hidden font-sans flex flex-col justify-start items-center py-6 sm:py-12 px-4 scrollbar-none ios-fluid-scroll">
      {/* Ambient Premium Graphics */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120vw] h-[40vh] bg-gradient-to-b from-[#251f15]/10 via-[#120f0a]/5 to-transparent blur-3xl rounded-full" />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-[#D4AF37]/5 blur-[100px] rounded-full" />
        {/* Subtle Golden Constellation Effect */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
      </div>

      {onCancel && (
        <button 
          onClick={onCancel}
          className="fixed right-5 z-50 w-10 h-10 flex items-center justify-center bg-white/[0.03] hover:bg-white/[0.08] active:scale-95 rounded-full text-stone-400 hover:text-white transition-all backdrop-blur-md border border-white/5"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 20px)' }}
        >
          <X size={18} />
        </button>
      )}

      {/* Form Wrapper Container with Max scroll headroom to prevent mobile clipping */}
      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center pt-8 pb-16 my-auto animate-fade-in">
        {/* Premium High-End Header */}
        <div className="mb-8 text-center space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/[0.02] border border-[#D4AF37]/15 rounded-full backdrop-blur-md mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
            <span className="text-[8.5px] font-mono uppercase tracking-[0.18em] text-[#D4AF37]">
              AETHER DESTINY CORE
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-normal text-[#E5D3B3] tracking-[0.1em] font-serif leading-tight">
            {mode === "guest" ? "生成免费预览" : "生辰密码初始化"}
          </h2>
          <p className="text-xs text-stone-400 font-light max-w-xs mx-auto leading-relaxed">
            {mode === "guest"
              ? "先填写基础生辰信息，系统会生成可试看内容。完整章节可登录并解锁。"
              : "输入您的本源参数，即刻推演星轨流转、解码专属生命心电图"}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full space-y-6 bg-[#09090b]/90 border border-[#D4AF37]/10 rounded-[28px] p-6 sm:p-8 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative"
        >
          {/* Master Top-side brass lighting accent line */}
          <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

          {/* Field 1: Name Section */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="flex items-center gap-2 text-[10px] font-medium text-[#D4AF37] uppercase tracking-[0.18em]">
                <User size={11} className="text-[#D4AF37]/70" /> 姓名 /
                Signature
              </label>
              <span className="text-[8.5px] text-stone-500 font-mono">
                STEP 01
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="您的真实姓名或代称"
                className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-[#121214] border border-[#D4AF37]/15 focus:border-[#D4AF37] rounded-xl px-4 py-3.5 text-white placeholder-stone-600 focus:outline-none transition-all duration-300 font-medium text-[15px] shadow-sm"
                required
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                enterKeyHint="next"
              />
            </div>
          </div>

          {/* Field 2: Gender Selector */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-medium text-[#D4AF37] uppercase tracking-[0.18em]">
                本源磁场 / Gender Orientation
              </label>
              <span className="text-[8.5px] text-stone-500 font-mono">
                STEP 02
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {["male", "female"].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g as any)}
                  className={`py-3 rounded-xl border transition-all duration-300 font-medium text-xs tracking-wider flex items-center justify-center gap-2 touch-manipulation cursor-pointer
                           ${
                             gender === g
                               ? "bg-[#D4AF37] text-black border-[#D4AF37] font-semibold shadow-[0_4px_15px_rgba(212,175,55,0.2)]"
                               : "bg-[#121214]/60 border-[#D4AF37]/10 text-stone-400 hover:bg-white/[0.03] hover:text-white"
                           }`}
                >
                  {g === "male" ? "乾造 (男)" : "坤造 (女)"}
                </button>
              ))}
            </div>
          </div>

          {/* Field 3 & 4: Smooth Date & Time Selectors */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="flex items-center gap-1.5 text-[10px] font-medium text-[#D4AF37] uppercase tracking-[0.18em]">
                  <Calendar size={11} className="text-[#D4AF37]/70" /> 阳历生日
                </label>
              </div>
              <div className="grid grid-cols-[1.35fr_1fr_1fr] gap-2 rounded-xl border border-[#D4AF37]/15 bg-white/[0.02] p-2">
                <div className="relative">
                  <select
                    value={dateParts.year}
                    onChange={(e) => updateDatePart("year", Number(e.target.value))}
                    className="w-full h-11 rounded-lg bg-[#121214] border border-white/5 px-3 text-[14px] text-white font-bold focus:outline-none focus:border-[#D4AF37] [color-scheme:dark] touch-manipulation"
                    aria-label="出生年份"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>{year} 年</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <select
                    value={dateParts.month}
                    onChange={(e) => updateDatePart("month", Number(e.target.value))}
                    className="w-full h-11 rounded-lg bg-[#121214] border border-white/5 px-2 text-[14px] text-white font-bold focus:outline-none focus:border-[#D4AF37] [color-scheme:dark] touch-manipulation"
                    aria-label="出生月份"
                  >
                    {monthOptions.map((month) => (
                      <option key={month} value={month}>{pad2(month)} 月</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <select
                    value={dateParts.day}
                    onChange={(e) => updateDatePart("day", Number(e.target.value))}
                    className="w-full h-11 rounded-lg bg-[#121214] border border-white/5 px-2 text-[14px] text-white font-bold focus:outline-none focus:border-[#D4AF37] [color-scheme:dark] touch-manipulation"
                    aria-label="出生日期"
                  >
                    {dayOptions.map((day) => (
                      <option key={day} value={day}>{pad2(day)} 日</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="flex items-center gap-1.5 text-[10px] font-medium text-[#D4AF37] uppercase tracking-[0.18em]">
                  <Clock size={11} className="text-[#D4AF37]/70" /> 出生时刻
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#D4AF37]/15 bg-white/[0.02] p-2">
                <select
                  value={timeParts.hour}
                  onChange={(e) => updateTimePart("hour", Number(e.target.value))}
                  className="w-full h-11 rounded-lg bg-[#121214] border border-white/5 px-3 text-[14px] text-white font-bold focus:outline-none focus:border-[#D4AF37] [color-scheme:dark] touch-manipulation"
                  aria-label="出生小时"
                >
                  {hourOptions.map((hour) => (
                    <option key={hour} value={hour}>{pad2(hour)} 时</option>
                  ))}
                </select>
                <select
                  value={timeParts.minute}
                  onChange={(e) => updateTimePart("minute", Number(e.target.value))}
                  className="w-full h-11 rounded-lg bg-[#121214] border border-white/5 px-3 text-[14px] text-white font-bold focus:outline-none focus:border-[#D4AF37] [color-scheme:dark] touch-manipulation"
                  aria-label="出生分钟"
                >
                  {minuteOptions.map((minute) => (
                    <option key={minute} value={minute}>{pad2(minute)} 分</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Field 5: Birth Place */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="flex items-center gap-2 text-[10px] font-medium text-[#D4AF37] uppercase tracking-[0.18em]">
                <MapPin size={11} className="text-[#D4AF37]/70" /> 出生地 /
                Birthplace
              </label>
              <span className="text-[8.5px] text-stone-500 font-mono">
                STEP 03
              </span>
            </div>
            <div className="relative group">
              <input
                type="text"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="请输入出生地点"
                className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-[#121214] border border-[#D4AF37]/15 focus:border-[#D4AF37] rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-stone-600 focus:outline-none transition-all duration-300 font-medium text-[15px]"
                required
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                enterKeyHint="done"
              />
              <MapPin
                size={14}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4AF37]/60 group-focus-within:text-[#D4AF37] transition-colors"
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={!name.trim() || !place.trim() || !date || !time}
              className="w-full py-4 bg-gradient-to-r from-[#D4AF37] via-[#E5D3B3] to-[#D4AF37] disabled:from-stone-800 disabled:via-stone-900 disabled:to-stone-800 disabled:text-stone-600 text-black rounded-xl font-bold text-sm tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 group shadow-[0_4px_25px_rgba(212,175,55,0.15)] active:scale-[0.98] cursor-pointer"
            >
              <span>{mode === "guest" ? "生成免费预览" : "即刻生成人生说明书"}</span>
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform duration-300"
              />
            </button>
          </div>
        </form>

        {/* Secure Alignment Footnote */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[9px] text-[#D4AF37]/40 font-mono tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]/50 animate-[ping_2.5s_linear_infinite]" />
          DATALINK SECURED & ENCRYPTED
        </div>
      </div>
    </div>
  );
};
