
import React, { useState } from 'react';
import Landing from './components/Landing';
import Scanner from './components/Scanner';
import ResultCard from './components/ResultCard';
import { analyzeFaceWithGemini, upgradeFate } from './services/faceService';
import { AppScreen, ValuationResult } from './types';
import { Loader2, Binary, ArrowLeft } from 'lucide-react';
import { ModuleHelperTag } from '../components/ModuleHelperTag';
import './valuation-style.css';

interface AppProps {
  onBack?: () => void;
  userProfile?: {
    name: string;
    birthDate: string;
    gender: string;
  };
}

const App: React.FC<AppProps> = ({ onBack, userProfile }) => {
  const [screen, setScreen] = useState<AppScreen>('LANDING');
  const [imgSrc, setImgSrc] = useState<string>('');
  const [result, setResult] = useState<ValuationResult | null>(null);

  const startScan = () => {
    setScreen('SCANNING');
  };

  const handleScanComplete = async (image: string) => {
    setImgSrc(image);
    setScreen('PROCESSING');

    // Use Real AI Processing with Fallback
    const analysis = await analyzeFaceWithGemini(image);

    setResult(analysis);
    setScreen('RESULT');
  };

  const handleRetake = () => {
    setImgSrc('');
    setResult(null);
    setScreen('SCANNING');
  };

  const handleCancelScan = () => {
    setScreen('LANDING');
  }

  const handleUpgrade = async () => {
    if (!result) return;
    setScreen('PROCESSING');
    // Upgrade is a deterministic game mechanic, keep local logic
    const upgradedResult = await upgradeFate(result);
    setResult(upgradedResult);
    setScreen('RESULT');
  }

  return (
    <div className="h-[100dvh] w-full bg-black text-[#E0E0E0] overflow-hidden flex flex-col mx-auto max-w-md shadow-2xl relative valuation-app">
      <ModuleHelperTag text="面容评估：上传照片，AI 帮你分析面相，看看你的隐藏潜力和运势。" />

      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-5 left-5 z-[60] w-9 h-9 flex items-center justify-center bg-black/20 backdrop-blur-md rounded-full border border-white/10 text-white/70 hover:text-white hover:bg-white/10 active:scale-95 select-none transition-all duration-200 ease-out"
          style={{ marginTop: 'env(safe-area-inset-top)' }}
        >
          <ArrowLeft size={18} />
        </button>
      )}

      {/* Content Container */}
      <div className="flex-1 w-full h-full overflow-hidden relative">
        {/* Screen Routing */}
        {screen === 'LANDING' && (
          <Landing onStart={startScan} />
        )}

        {screen === 'SCANNING' && (
          <Scanner onScanComplete={handleScanComplete} onCancel={handleCancelScan} />
        )}

        {screen === 'PROCESSING' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-8 p-8 text-center z-50">
            <div className="relative">
              {/* Liquid Orb effect */}
              <div className="w-32 h-32 rounded-full bg-neutral-800 animate-pulse blur-xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
              <div className="w-24 h-24 border border-[#39FF14] rounded-full animate-spin flex items-center justify-center backdrop-blur-sm">
                <div className="w-20 h-20 border-t border-b border-white rounded-full animate-ping opacity-20"></div>
              </div>
            </div>
            <div className="font-mono-tech uppercase tracking-[0.2em]">
              <h2 className="text-2xl text-white mb-2 glitch-text" data-text="PROCESSING">PROCESSING</h2>
              <div className="text-[#39FF14] text-xs flex flex-col gap-1">
                <span>&gt; MAPPING_FACE_TOPOLOGY</span>
                <span className="opacity-70">&gt; ACCESSING_GEMINI_NEURAL_NET</span>
                <span className="opacity-50">&gt; DECRYPTING_DESTINY_HASH</span>
              </div>
            </div>
          </div>
        )}

        {screen === 'RESULT' && result && (
          <ResultCard
            result={result}
            imageSrc={imgSrc}
            onRetake={handleRetake}
            onUpgrade={handleUpgrade}
          />
        )}
      </div>
    </div>
  );
};

export default App;
