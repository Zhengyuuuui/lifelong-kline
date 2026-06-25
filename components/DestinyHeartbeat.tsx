import React, { useEffect, useRef } from 'react';

export const DestinyHeartbeat: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const SPEED = 3; 
    const BASELINE_Y_OFFSET = 0.5; 
    
    const WAVE_COMPONENTS = [
      { type: 'P', time: 150, amp: -0.15, width: 35 },
      { type: 'Q', time: 280, amp: 0.15, width: 10 }, 
      { type: 'R', time: 300, amp: -1.2, width: 12 }, 
      { type: 'S', time: 320, amp: 0.35, width: 12 }, 
      { type: 'T', time: 550, amp: -0.3, width: 60 }, 
    ];

    let animationFrameId: number;
    let x = 0; 
    let lastY = 0;
    
    let lastTime = performance.now();
    let beatTimer = 0; 
    let currentBeatDuration = 1000; 
    
    // Track logical dimensions
    let logicalWidth = 0;
    let logicalHeight = 0;

    const initCanvas = () => {
      if (!container || !canvas || !ctx) return;
      
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      
      logicalWidth = rect.width;
      logicalHeight = rect.height;

      // Set physical dimensions for High DPI
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Scale context to match logical dimensions
      ctx.scale(dpr, dpr);
      
      // Style width/height to match container
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      x = 0;
      lastY = logicalHeight * BASELINE_Y_OFFSET;
      
      // Clear with transparent rect
      ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    };
    
    // Use ResizeObserver for more robust resizing detection
    const resizeObserver = new ResizeObserver(() => {
        initCanvas();
    });
    resizeObserver.observe(container);
    
    // Initial setup
    initCanvas();

    const gaussian = (t: number, center: number, amp: number, width: number) => {
      return amp * Math.exp(-Math.pow(t - center, 2) / (2 * Math.pow(width, 2)));
    };

    const getVoltageAtTime = (ms: number) => {
      let voltage = 0;
      WAVE_COMPONENTS.forEach(comp => {
        voltage += gaussian(ms, comp.time, comp.amp, comp.width);
      });
      const noise = (Math.random() - 0.5) * 0.04; 
      voltage += noise;
      return voltage;
    };

    const getNextBeatDuration = () => {
      return 800 + Math.random() * 400; 
    };

    const render = (now: number) => {
      if (!ctx) return;

      const dt = now - lastTime;
      lastTime = now;

      beatTimer += dt;
      if (beatTimer > currentBeatDuration) {
        beatTimer = 0; 
        currentBeatDuration = getNextBeatDuration(); 
      }

      // Use logical dimensions
      const w = logicalWidth;
      const h = logicalHeight;
      const centerY = h * BASELINE_Y_OFFSET;
      const amplitudeScale = h * 0.5; 

      const fadeWidth = SPEED + 30; 
      
      // Eraser logic (Scanner effect)
      if (x + fadeWidth > w) {
        ctx.clearRect(x, 0, w - x, h);
        ctx.clearRect(0, 0, (x + fadeWidth) % w, h);
      } else {
        ctx.clearRect(x, 0, fadeWidth, h);
      }

      ctx.beginPath();
      ctx.moveTo(x, lastY);

      const nextX = (x + SPEED) % w;
      
      if (nextX < x) {
        ctx.stroke(); 
        ctx.beginPath(); 
        ctx.moveTo(0, lastY);
        x = 0;
      } else {
        x = nextX;
      }

      const voltage = getVoltageAtTime(beatTimer);
      const newY = centerY + voltage * amplitudeScale;
      
      ctx.lineTo(x, newY);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(62, 243, 197, 0.8)';
      ctx.strokeStyle = '#3EF3C5';
      ctx.lineWidth = 2; // Slightly thicker for better visibility
      
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, newY, 1.5, 0, Math.PI * 2);
      ctx.fill();

      lastY = newY;
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-12 relative overflow-hidden bg-white/[0.02] backdrop-blur-sm">
      {/* Subtle Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(62, 243, 197, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(62, 243, 197, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#000000] via-transparent to-[#000000] z-20 pointer-events-none opacity-80" />

      {/* Canvas Layer */}
      <canvas ref={canvasRef} className="block relative z-10 w-full h-full" />
      
      {/* Metadata Overlay */}
      <div className="absolute top-1 right-3 z-30 flex flex-col items-end opacity-50">
         <div className="flex items-center gap-1.5">
           <div className="w-1 h-1 rounded-full bg-teal-400 animate-pulse"></div>
           <span className="text-[8px] font-mono text-teal-300 tracking-wider">MONITOR</span>
         </div>
      </div>
    </div>
  );
};