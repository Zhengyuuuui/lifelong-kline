import React, { useState, useEffect, useMemo } from 'react';
import { DayData, TimelineSegment } from '../types';
import { Cat, Heart, Rocket } from 'lucide-react';
import { COLORS } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  data: DayData;
  onHourSelect?: (segment: TimelineSegment) => void;
  selectedHour?: number;
}

// --- CSS Animations for Real Cats ---
const styles = `
  /* Good: Playful Bounce - Energetic & Happy */
  @keyframes good-bounce {
    0%, 100% { transform: translateY(0) scale(1); }
    25% { transform: translateY(-8px) scale(1.1) rotate(-3deg); }
    50% { transform: translateY(0) scale(0.95) rotate(0deg); }
    75% { transform: translateY(-4px) scale(1.05) rotate(3deg); }
  }

  /* Bad/Warn: Headwind - Struggling against resistance */
  @keyframes warn-headwind {
    0% { transform: translateX(0) rotate(-5deg) scale(1); }
    25% { transform: translateX(-2px) rotate(-8deg) scale(0.98); }
    50% { transform: translateX(0) rotate(-5deg) scale(1); }
    75% { transform: translateX(1px) rotate(-3deg) scale(1.02); }
    100% { transform: translateX(0) rotate(-5deg) scale(1); }
  }

  /* Slow: Drifting - Zero gravity feel */
  @keyframes slow-drift {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-6px) rotate(2deg); }
  }

  /* Neutral: Idle - Simple confident breathing */
  @keyframes neutral-idle {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  
  /* Inactive Float - Gentle background motion */
  @keyframes inactive-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  .anim-good { animation: good-bounce 2s ease-in-out infinite; }
  .anim-bad { animation: warn-headwind 0.8s ease-in-out infinite; } /* Reused warn animation for bad/avoid */
  .anim-warn { animation: warn-headwind 0.8s ease-in-out infinite; }
  .anim-slow { animation: slow-drift 6s ease-in-out infinite; }
  .anim-neutral { animation: neutral-idle 3s ease-in-out infinite; }
  .anim-inactive { animation: inactive-float 4s ease-in-out infinite; }
`;

// --- Locally bundled status avatars ---
const CAT_IMAGES = {
  rocketCat: "/status-avatars/grinning-cat.png",
  stableCat: "/status-avatars/cat.png",
  lyingCat: "/status-avatars/kissing-cat.png",
  avoidCat: "/status-avatars/weary-cat.png"
};

type VisualType = 'good' | 'neutral' | 'bad' | 'warn' | 'slow';

// --- Real Cat Component with Fallback ---
const RealCat = ({ type, size, isActive, catName }: { type: VisualType, size: number, isActive: boolean, catName: string }) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state if type changes to try loading the new image
  useEffect(() => {
    setHasError(false);
  }, [type]);

  const mapTypeToSource = (t: VisualType) => {
      if (t === 'good') return CAT_IMAGES.rocketCat;
      if (t === 'neutral') return CAT_IMAGES.stableCat;
      if (t === 'slow') return CAT_IMAGES.lyingCat;
      if (t === 'warn' || t === 'bad') return CAT_IMAGES.avoidCat;
      return CAT_IMAGES.stableCat;
  };

  const imgSrc = mapTypeToSource(type);

  let animationClass = "";
  switch (type) {
    case 'good': animationClass = isActive ? "anim-good" : "anim-inactive"; break;
    case 'warn': case 'bad': animationClass = isActive ? "anim-warn" : "anim-inactive"; break;
    case 'slow': animationClass = isActive ? "anim-slow" : "anim-inactive"; break;
    case 'neutral': default: animationClass = isActive ? "anim-neutral" : "anim-inactive"; break;
  }
  
  // High-End Glows
  const activeGlow = type === 'good' ? "drop-shadow-[0_0_25px_rgba(52,211,153,0.8)]" : 
                     type === 'warn' ? "drop-shadow-[0_0_25px_rgba(251,146,60,0.8)]" :
                     type === 'bad' ? "drop-shadow-[0_0_25px_rgba(239,68,68,0.8)]" :
                     type === 'slow' ? "drop-shadow-[0_0_25px_rgba(129,140,248,0.8)]" :
                     "drop-shadow-[0_0_25px_rgba(255,255,255,0.6)]";

  // Label Styling Logic
  const labelBaseClasses = "absolute -bottom-7 whitespace-nowrap px-2 py-0.5 rounded-full border transition-all duration-300 flex items-center justify-center pointer-events-none";
  const labelActiveClasses = "bg-black/90 backdrop-blur-md border-white/20 scale-100 opacity-100 z-[60] text-white shadow-lg";
  const labelInactiveClasses = "bg-black/60 backdrop-blur-sm border-white/10 scale-90 opacity-80 z-20 text-white/80"; 

  return (
    <div 
      className={`relative flex flex-col items-center justify-center transition-all duration-700 ease-out`}
      style={{ width: size, height: size }}
    >
      {hasError ? (
         <div 
            className={`w-full h-full flex items-center justify-center text-white/80 select-none transition-all duration-500 ${animationClass} ${isActive ? 'scale-110' : 'opacity-60 scale-95'}`}
         >
            <Cat size={size * 0.72} strokeWidth={1.7} aria-hidden="true" />
         </div>
      ) : (
         // 3D Image
         <img 
            src={imgSrc} 
            alt="Cat" 
            onError={() => setHasError(true)}
            className={`w-full h-full object-contain pointer-events-none select-none transition-all duration-500 
                ${isActive ? activeGlow : 'grayscale opacity-60 scale-95 brightness-90'} 
                ${animationClass}
            `}
         />
      )}
      
      {/* Explicit Cat Name Label */}
      <div className={`${labelBaseClasses} ${isActive ? labelActiveClasses : labelInactiveClasses}`}>
        <span className="text-[9px] font-bold tracking-wide">{catName}</span>
      </div>
      
      {/* Decorative Rocket Icon for "Rocket Cat" */}
      {type === 'good' && isActive && !hasError && (
         <Rocket
           size={16}
           aria-hidden="true"
           className="absolute -right-2 -top-2 text-emerald-300 animate-bounce z-[70]"
         />
      )}
    </div>
  );
};


// --- SVG Helpers ---
const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
};

const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(" ");
};

const TopTimeRadar: React.FC<Props> = ({ data, onHourSelect, selectedHour }) => {
  const { t } = useLanguage();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const size = 380; 
  const center = size / 2;
  const rOuterRim = 175; 
  const rSegments = 142; // Cat position
  const rTrack = 142; 
  const rTextLabel = 88; // Text Label position

  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const currentAngle = (hours * 15) + (minutes * 0.25);

  // Optimized Logic: Spacing Enforcer
  const charactersToShow = useMemo(() => {
    const indices = new Set<number>();
    indices.add(hours); // Always show current hour

    const typesFound = new Set<string>();
    const currentSeg = data.segments.find(s => s.hour === hours);
    if (currentSeg) typesFound.add(currentSeg.type);

    const MIN_GAP = 3; 

    const isTooClose = (h: number) => {
        for (let existing of indices) {
            let diff = Math.abs(existing - h);
            if (diff > 12) diff = 24 - diff; 
            if (diff < MIN_GAP) return true;
        }
        return false;
    };

    // 1. First Pass: Try to find different TYPES
    for (let i = 1; i < 24; i++) {
        const h = (hours + i) % 24;
        if (isTooClose(h)) continue; 

        const seg = data.segments.find(s => s.hour === h);
        if (seg) {
            if (!typesFound.has(seg.type) && indices.size < 4) {
                indices.add(h);
                typesFound.add(seg.type);
            }
        }
        if (indices.size >= 4) break;
    }

    // 2. Second Pass: Fill remaining
    if (indices.size < 4) {
         for (let i = MIN_GAP; i < 24; i++) {
            const h = (hours + i) % 24;
            if (!isTooClose(h) && indices.size < 4) {
                 indices.add(h);
            }
            if (indices.size >= 4) break;
         }
    }
    return indices;
  }, [data.segments, hours]);

  const segments = useMemo(() => {
    return data.segments.map((seg) => {
      const startAngle = (seg.hour * 15);
      const endAngle = ((seg.hour + 1) * 15);
      const hitPathData = describeArc(center, center, rOuterRim, startAngle, endAngle);
      const midAngle = (startAngle + endAngle) / 2;
      const glyphPos = polarToCartesian(center, center, rSegments, midAngle);
      const labelPos = polarToCartesian(center, center, rTextLabel, midAngle); 
      
      const gap = 2; 
      const linePathData = describeArc(center, center, rTrack, startAngle + gap, endAngle - gap);
      
      let visualType: VisualType = 'neutral';
      let stateLabel = t('radar.state.neutral');
      let catNameLabel = t('radar.cat.neutral');
      let stateColor = COLORS.neutral; 
      
      let iconSize = 36; 
      
      if (seg.type === 'good') { 
          visualType = 'good';
          stateLabel = t('radar.state.good');
          catNameLabel = t('radar.cat.good');
          stateColor = COLORS.good;
          iconSize = 44; 
      } 
      else if (seg.type === 'neutral') {
          visualType = 'neutral';
          stateLabel = t('radar.state.neutral');
          catNameLabel = t('radar.cat.neutral');
          stateColor = COLORS.neutral;
          iconSize = 38; 
      } 
      else if (seg.type === 'slow') { 
          visualType = 'slow';
          stateLabel = t('radar.state.slow');
          catNameLabel = t('radar.cat.slow');
          stateColor = COLORS.slow;
          iconSize = 36; 
      } 
      else if (seg.type === 'warn' || seg.type === 'bad') { 
          visualType = 'warn';
          stateLabel = t('radar.state.warn');
          catNameLabel = t('radar.cat.warn');
          stateColor = COLORS.warn;
          iconSize = 38; 
      }

      const isCurrent = hours === seg.hour;
      const isSelected = selectedHour === seg.hour;
      const isActive = isCurrent || isSelected;

      const shouldShowCharacter = charactersToShow.has(seg.hour);

      const labelOpacity = isActive ? 0.95 : 0.4;
      const labelColor = isActive ? stateColor : '#64748b'; 

      return (
        <g key={seg.hour} onClick={() => onHourSelect && onHourSelect(seg)} className="cursor-pointer group">
           
           {/* Track Line */}
           <path 
             d={linePathData} 
             fill="none" 
             stroke="rgba(255,255,255,0.08)" 
             strokeWidth={isActive ? 4 : 2} 
             strokeLinecap="round"
             className="transition-all duration-300 group-hover:stroke-white/30"
           />

           {/* Hit Area */}
           <path d={hitPathData} fill="none" stroke="transparent" strokeWidth={45} className="pointer-events-auto" />

           {/* Character Icon & Text Label */}
           {shouldShowCharacter && (
               <>
                   {/* Emoji/Cat Image Container */}
                   <foreignObject 
                      x={glyphPos.x - (isActive ? iconSize : iconSize/1.1)} 
                      y={glyphPos.y - (isActive ? iconSize : iconSize/1.1)} 
                      width={isActive ? iconSize*2.2 : iconSize*2} 
                      height={200}
                      className="overflow-visible" 
                      style={{ overflow: 'visible' }} 
                   >
                      <div className={`relative flex flex-col items-center justify-start w-full h-full transition-all duration-500 ${isActive ? 'scale-110 z-50' : 'z-10'}`}>
                         <RealCat 
                            type={visualType} 
                            size={isActive ? iconSize + 10 : iconSize} 
                            isActive={isActive} 
                            catName={catNameLabel}
                         />
                      </div>
                   </foreignObject>
                   
                   {/* Arc Text Label */}
                   <text
                        x={labelPos.x}
                        y={labelPos.y}
                        fill={labelColor}
                        fontSize="9"
                        fontWeight="700"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="pointer-events-none drop-shadow-md tracking-widest font-mono transition-colors duration-500"
                        style={{ opacity: labelOpacity }}
                        transform={`rotate(${midAngle + 90}, ${labelPos.x}, ${labelPos.y})`}
                   >
                       {stateLabel}
                   </text>
               </>
           )}
        </g>
      );
    });
  }, [data.segments, onHourSelect, hours, charactersToShow, selectedHour, t]);

  const handEnd = polarToCartesian(center, center, rOuterRim, currentAngle);

  return (
    <div id="tutorial-radar" className="relative w-full aspect-square max-w-[380px] max-h-[380px] mx-auto mb-16 shrink-0 group select-none">
      <style>{styles}</style>
      
      {/* Layer 1: Background & Sonar */}
      <div className="absolute inset-0 rounded-full overflow-hidden bg-[#050505] shadow-[0_0_80px_-20px_rgba(0,0,0,0.9)] border-[6px] border-[#161616] z-0 pointer-events-none">
          {/* Sonar Sweep */}
           <div className="absolute inset-[-50%] w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_200deg,rgba(168,85,247,0.02)_240deg,rgba(168,85,247,0.4)_360deg)] animate-[spin_4s_linear_infinite] origin-center opacity-100 mix-blend-screen"></div>

           {/* Static Grid */}
           <div className="absolute inset-0 z-0">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[22%] h-[22%] border border-white/5 rounded-full"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[44%] h-[44%] border border-white/5 rounded-full"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[66%] h-[66%] border border-white/5 rounded-full"></div>
           </div>
      </div>

      {/* Layer 2: Data & Icons */}
      <div className="relative w-full h-full z-10 pointer-events-none">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible pointer-events-auto">
            <g>{segments}</g>

            {/* Current Time Hand */}
            <line x1={center} y1={center} x2={handEnd.x} y2={handEnd.y} stroke="url(#handGradient)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            <circle cx={handEnd.x} cy={handEnd.y} r={3} fill="#fff" className="animate-pulse shadow-[0_0_15px_white]" />
            <defs>
               <linearGradient id="handGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="transparent" />
                  <stop offset="100%" stopColor="white" />
               </linearGradient>
            </defs>
            
            {/* Hour Labels */}
            {[0, 6, 12, 18].map(h => {
                const p = polarToCartesian(center, center, rOuterRim - 12, h * 15);
                const label = h === 0 ? '00' : h < 10 ? `0${h}` : `${h}`;
                return (
                    <text 
                        key={h} 
                        x={p.x} 
                        y={p.y} 
                        fill="rgba(255,255,255,0.3)" 
                        fontSize="10" 
                        fontFamily="SF Mono, monospace" 
                        fontWeight="500"
                        textAnchor="middle" 
                        dominantBaseline="middle"
                        className="drop-shadow-md"
                    >
                        {label}
                    </text>
                );
            })}
          </svg>
      </div>

      {/* Layer 3: Center Core */}
      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
           <div className="relative flex flex-col items-center justify-center pt-2">
                <Heart 
                  size={76} 
                  className="text-purple-400/90 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse drop-shadow-[0_0_30px_rgba(192,132,252,0.6)]" 
                  fill="currentColor" 
                  strokeWidth={0} 
                />
                <div className="relative text-[52px] font-bold text-white font-mono-num leading-none drop-shadow-[0_0_20px_rgba(168,85,247,0.8)] z-10">
                  {data.winScore}
                </div>
                <div className="text-[9px] text-purple-200/80 tracking-[0.25em] uppercase font-bold mt-1 mb-2 z-10 shadow-black drop-shadow-md">
                   {t('radar.scoreLabel')}
                </div>
           </div>
      </div>
      
    </div>
  );
};

export default TopTimeRadar;
