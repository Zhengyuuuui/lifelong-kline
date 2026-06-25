import React, { useState, useEffect } from 'react';
import { UserInput, ValuationResult } from './types';
import { calculateFate } from './utils';
import { FingerprintScanner } from './components/FingerprintScanner';
import { ValuationCard } from './components/ValuationCard';
import { PkBattle } from './components/PkBattle';
import { BankDashboard } from './components/BankDashboard';
import { api } from './services/api';
import './revenue-style.css';
import { ArrowLeft } from 'lucide-react';

import { ModuleHelperTag } from '../components/ModuleHelperTag';

interface AppProps {
  onBack?: () => void;
  userProfile?: {
    name: string;
    birthDate: string;
    gender: string;
  };
}

enum AppState {
  INPUT,
  SCANNING,
  RESULT,
  PK,
  BANK // 新增银行界面状态
}

const App: React.FC<AppProps> = ({ onBack, userProfile }) => {
  const [state, setState] = useState<AppState>(AppState.SCANNING);
  const [userResult, setUserResult] = useState<ValuationResult | null>(null);
  const [currentPkId, setCurrentPkId] = useState<string | null>(null); // 新增：当前PK房间ID

  // 应用初始化：连接后端，登录用户
  useEffect(() => {
    const initApp = async () => {
      // Only login if no profile provided (standalone mode)
      if (!userProfile) {
        try {
          const user = await api.loginOrRegister();
          console.log("System initialized for user:", user.id);
        } catch (e) {
          console.error("Failed to connect to backend", e);
        }
      }
    };
    initApp();
  }, [userProfile]);

  const handleOpenPacket = async () => {
    let input: UserInput;

    if (userProfile) {
      input = {
        name: userProfile.name,
        birthdate: userProfile.birthDate,
        gender: userProfile.gender === 'female' ? 'female' : 'male'
      };
    } else {
      // 模拟不同用户的随机输入
      input = {
        name: `User_${Math.floor(Math.random() * 10000)}`,
        birthdate: '2000-01-01',
        gender: Math.random() > 0.5 ? 'male' : 'female'
      };
    }

    const result = calculateFate(input);

    // 调用后端保存估值数据
    try {
      await api.saveValuation(result);
    } catch (e) {
      console.warn("Save valuation skipped/failed");
    }

    setUserResult(result);
    setState(AppState.RESULT);
  };

  // 从银行发起PK (需要传入pkId)
  const startPkFromBank = (pkId: string) => {
    setCurrentPkId(pkId);
    setState(AppState.PK);
  };

  // 从结果页直接发起 (旧逻辑，兼容处理，创建一个临时PK)
  const startPkDirectly = async () => {
    if (userResult) {
      const pkId = await api.createPkSession(userResult.valuation);
      // 直接进入，但在 PK 页面内还是需要等待逻辑
      setCurrentPkId(pkId);
      setState(AppState.PK);
    }
  };

  const enterBank = () => {
    setState(AppState.BANK);
  };

  return (
    <div className="fixed inset-0 bg-[#A60012] text-champagne font-serif overflow-hidden flex flex-col items-center justify-center">
      <ModuleHelperTag text="财运预测：看看你今天的财运指数，是该冲刺还是该稳住。" />

      {/* 全局胶片噪点 */}
      <div className="bg-noise-overlay"></div>

      {/* Back Button - Hidden in BANK state */}
      {onBack && state !== AppState.BANK && (
        <button
          onClick={onBack}
          className="fixed top-5 left-4 z-[90] w-9 h-9 flex items-center justify-center bg-black/20 backdrop-blur-md rounded-full border border-white/10 text-white/70 hover:text-white hover:bg-white/10 active:scale-95 select-none transition-all duration-200 ease-out"
          style={{ marginTop: 'env(safe-area-inset-top)' }}
        >
          <ArrowLeft size={18} />
        </button>
      )}

      {/* 主容器：手机比例 */}
      <div className="relative z-10 w-full h-full md:max-w-md md:h-[90vh] md:rounded-[40px] md:border-4 md:border-antique-gold/30 md:shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden bg-black/10 backdrop-blur-sm flex flex-col">

        {/* 顶部状态栏装饰 */}
        <div className="absolute top-0 w-full h-6 flex justify-center items-center opacity-30 z-50 pointer-events-none">
          <div className="w-20 h-1 bg-champagne rounded-full shadow-[0_0_5px_rgba(255,255,255,0.5)]"></div>
        </div>

        <div className="flex-1 relative overflow-hidden flex flex-col">
          {state === AppState.SCANNING && (
            <FingerprintScanner onComplete={handleOpenPacket} />
          )}

          {state === AppState.RESULT && userResult && (
            <ValuationCard
              result={userResult}
              onPkStart={startPkDirectly}
              onShare={() => console.log('Sharing triggered')}
              onUnlockComplete={enterBank} // 解冻完成进入银行
            />
          )}

          {state === AppState.PK && userResult && (
            <PkBattle
              userResult={userResult}
              pkId={currentPkId} // 传入真实的后端PK ID
              onReset={() => {
                setState(AppState.SCANNING);
                setUserResult(null);
                setCurrentPkId(null);
              }}
              onClose={() => setState(AppState.BANK)} // 退出 PK 返回银行
            />
          )}

          {state === AppState.BANK && userResult && (
            <BankDashboard
              userResult={userResult}
              onBack={() => {
                // 返回到结果页
                setState(AppState.RESULT);
              }}
              onPkStart={startPkFromBank} // 传入带ID的回调
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
