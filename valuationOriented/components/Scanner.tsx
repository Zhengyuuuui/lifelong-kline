
import React, { useEffect, useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { X, Image as ImageIcon, ScanLine, Fingerprint, RefreshCcw } from 'lucide-react';
import { CameraMode } from '../types';

interface ScannerProps {
  onScanComplete: (imageSrc: string) => void;
  onCancel: () => void;
}

const TERMINAL_LOGS = [
  "正在连接南天门数据库...",
  "加载新春运势算法...",
  "检测面部红光...",
  "计算财库容量...",
  "正在匹配命定贵人...",
  "解析前世今生代码...",
];

const Scanner: React.FC<ScannerProps> = ({ onScanComplete, onCancel }) => {
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ritualTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  
  const [logs, setLogs] = useState<string[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanStage, setScanStage] = useState<'idle' | 'locking' | 'injecting' | 'complete'>('idle');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Matrix Rain / Log Effect
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setLogs(prev => {
        const newLogs = [...prev, TERMINAL_LOGS[index % TERMINAL_LOGS.length]];
        return newLogs.slice(-6); 
      });
      index++;
    }, 150);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => () => {
    ritualTimersRef.current.forEach(clearTimeout);
    ritualTimersRef.current = [];
  }, []);

  const startRitual = (imageSrc: string) => {
    if (scanStage !== 'idle') return;
    ritualTimersRef.current.forEach(clearTimeout);
    ritualTimersRef.current = [];
    setCapturedImage(imageSrc);
    setScanStage('locking');

    // Sequence of animations
    // 1. Lock Target (Grid aligns)
    ritualTimersRef.current.push(setTimeout(() => setScanStage('injecting'), 1500));
    // 2. Data Injection (Flash)
    ritualTimersRef.current.push(setTimeout(() => {
        setScanStage('complete');
        onScanComplete(imageSrc);
    }, 3500));
  };

  const handleCapture = useCallback(() => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
        startRitual(imageSrc);
    }
  }, [scanStage]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const result = reader.result as string;
              
              // Resize image to prevent large payloads
              const img = new Image();
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const MAX_WIDTH = 800;
                  const MAX_HEIGHT = 800;
                  let width = img.width;
                  let height = img.height;

                  if (width > height) {
                      if (width > MAX_WIDTH) {
                          height *= MAX_WIDTH / width;
                          width = MAX_WIDTH;
                      }
                  } else {
                      if (height > MAX_HEIGHT) {
                          width *= MAX_HEIGHT / height;
                          height = MAX_HEIGHT;
                      }
                  }
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                      ctx.drawImage(img, 0, 0, width, height);
                      const resizedImage = canvas.toDataURL('image/jpeg', 0.8);
                      startRitual(resizedImage);
                  } else {
                      startRitual(result);
                  }
              };
              img.src = result;
          };
          reader.readAsDataURL(file);
      }
  };

  const triggerFileInput = () => {
      fileInputRef.current?.click();
  };

  const toggleCamera = () => {
      setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Mobile-optimized constraints
  const videoConstraints = {
    width: { ideal: 1080 },
    height: { ideal: 1920 },
    facingMode: facingMode
  };

  return (
    <div className="relative h-full w-full bg-black overflow-hidden flex flex-col">
      <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileUpload} />

      {/* HUD Header */}
      <div className="absolute top-0 left-0 right-0 z-30 p-6 flex justify-between items-start pointer-events-none">
        <button onClick={onCancel} className="text-white pointer-events-auto hover:text-red-500 transition-colors">
            <X size={24} strokeWidth={1} />
        </button>
        <div className="flex flex-col items-end gap-1">
             <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${scanStage === 'idle' ? 'bg-red-500 animate-pulse' : 'bg-red-600'}`}></div>
                 <span className="text-[10px] text-red-500 font-mono-tech tracking-widest">LUNAR_SCAN_ACTIVE</span>
             </div>
             <div className="text-[8px] text-red-900/80 font-mono-tech flex gap-2">
                 <span>ISO 800</span>
                 <span>F/1.8</span>
                 <span>{facingMode.toUpperCase()}</span>
             </div>
        </div>
      </div>

      {/* Main Visual Area */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        
        {/* Layer 1: Camera/Image Source */}
        {capturedImage ? (
             <img 
                src={capturedImage} 
                alt="Target" 
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${scanStage === 'injecting' ? 'brightness-150 contrast-150 saturate-150 sepia-[.3] hue-rotate-[-30deg]' : 'brightness-90'} ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} 
             />
        ) : (
             <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                className={`absolute inset-0 w-full h-full object-cover grayscale brightness-90 contrast-110 ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                forceScreenshotSourceSize={true}
             />
        )}

        {/* Center Instruction Overlay */}
        {scanStage === 'idle' && !capturedImage && (
            <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                <div className="bg-black/40 backdrop-blur-md px-8 py-4 rounded-xl border border-red-500/40 shadow-[0_0_40px_rgba(220,38,38,0.4)] transform -translate-y-16">
                    <p className="text-red-400 text-base font-bold tracking-widest animate-pulse drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-center whitespace-nowrap">
                        请拍摄/上传本人正面照片
                    </p>
                </div>
            </div>
        )}

        {/* Layer 2: Biometric Grid & HUD (Red Theme) */}
        <div className="absolute inset-0 pointer-events-none">
            
            {/* Target Reticle */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${scanStage === 'locking' ? 'scale-90 border-red-500 shadow-[0_0_30px_rgba(220,38,38,0.5)]' : 'scale-100 border-red-900/30'}`}>
                 {/* Corner Brackets */}
                 <div className="absolute -top-10 -left-10 w-8 h-8 border-t-2 border-l-2 border-inherit"></div>
                 <div className="absolute -top-10 -right-10 w-8 h-8 border-t-2 border-r-2 border-inherit"></div>
                 <div className="absolute -bottom-10 -left-10 w-8 h-8 border-b-2 border-l-2 border-inherit"></div>
                 <div className="absolute -bottom-10 -right-10 w-8 h-8 border-b-2 border-r-2 border-inherit"></div>
                 
                 {/* Face Frame */}
                 <div className="w-64 h-80 border border-dashed border-inherit rounded-3xl relative overflow-hidden">
                     {/* Scanning Line - Red */}
                     <div className="absolute w-[200%] h-2 bg-red-500/50 blur-md top-0 -left-[50%] animate-[scan-line_2s_linear_infinite] shadow-[0_0_20px_rgba(239,68,68,0.8)]"></div>
                 </div>
            </div>

            {/* Dynamic Mesh (SVG) - Red */}
            {scanStage === 'locking' && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <svg viewBox="0 0 200 200" className="w-80 h-80 animate-spin-slow opacity-60">
                        <circle cx="100" cy="100" r="90" fill="none" stroke="#ef4444" strokeWidth="0.5" strokeDasharray="4 4" />
                        <circle cx="100" cy="100" r="70" fill="none" stroke="#ef4444" strokeWidth="0.5" strokeDasharray="2 4" />
                        <path d="M100 10 L100 190 M10 100 L190 100" stroke="#ef4444" strokeWidth="0.5" />
                    </svg>
                </div>
            )}

            {/* Injection Flash - Red/Gold */}
            {scanStage === 'injecting' && (
                <div className="absolute inset-0 bg-red-600 mix-blend-overlay animate-pulse"></div>
            )}
        </div>
      </div>

      {/* Footer / Logs */}
      <div className="absolute bottom-32 left-6 pointer-events-none flex flex-col items-start gap-1 z-30 mix-blend-screen">
        {logs.map((log, i) => (
            <div key={i} className="text-[10px] text-red-500 font-mono-tech leading-tight opacity-90 shadow-black drop-shadow-md">
                {`>> ${log}`}
            </div>
        ))}
      </div>

      {/* Controls */}
      {scanStage === 'idle' && (
          <div className="absolute bottom-0 w-full p-8 pb-12 z-30 bg-gradient-to-t from-black via-black/90 to-transparent">
            
            <div className="flex items-center justify-between px-8">
                <button onClick={triggerFileInput} className="group flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-full border border-gray-600 flex items-center justify-center group-hover:border-red-400 transition-colors bg-black/50 backdrop-blur-md">
                        <ImageIcon size={18} className="text-gray-400 group-hover:text-red-400" />
                    </div>
                </button>

                <button 
                onClick={handleCapture}
                className="w-24 h-24 rounded-full border border-red-900/40 flex items-center justify-center relative group active:scale-95 select-none transition-all duration-200 ease-out"
                >
                    <div className="absolute inset-0 rounded-full border-2 border-red-800 opacity-40 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="absolute inset-2 rounded-full border border-red-500 opacity-0 group-hover:opacity-100 animate-spin-slow"></div>
                    <div className="w-16 h-16 bg-red-600 rounded-full shadow-[0_0_30px_rgba(220,38,38,0.4)] group-hover:shadow-[0_0_50px_rgba(220,38,38,0.8)] transition-all"></div>
                </button>

                <button 
                    onClick={toggleCamera}
                    className="group flex flex-col items-center gap-1"
                >
                    <div className="w-12 h-12 rounded-full border border-gray-600 flex items-center justify-center bg-black/50 backdrop-blur-md hover:border-red-400 transition-colors">
                        <RefreshCcw size={18} className="text-gray-400 group-hover:text-red-400 transition-colors" />
                    </div>
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default Scanner;
