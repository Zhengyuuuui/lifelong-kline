import React, { useState } from 'react';
import { UserInput } from '../types';
import { Button } from './Button';

interface InputFormProps {
  onSubmit: (data: UserInput) => void;
}

export const InputForm: React.FC<InputFormProps> = ({ onSubmit }) => {
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && birthdate) {
      onSubmit({ name, birthdate, gender });
    }
  };

  return (
    <div className="flex flex-col h-full p-6 relative">
      {/* 顶部标题区 */}
      <div className="mt-8 text-center space-y-4 relative z-10">
        <div className="inline-flex items-center gap-2 opacity-80">
            <span className="w-8 h-[1px] bg-rich-gold"></span>
            <span className="text-xs tracking-[0.3em] text-rich-gold uppercase">Fortune Valuation</span>
            <span className="w-8 h-[1px] bg-rich-gold"></span>
        </div>
        
        <h1 className="text-5xl font-black text-gradient-gold drop-shadow-md tracking-wider">
          天命<br/>估值
        </h1>
        
        <p className="text-white/70 text-sm tracking-widest font-bold">
            马年暴富 · 全网身价PK
        </p>
      </div>

      {/* 装饰马元素 (CSS绘制或Emoji代替) */}
      <div className="absolute top-20 right-0 opacity-10 pointer-events-none">
         <span className="text-9xl"></span>
      </div>

      {/* 表单区域 - 仿奏折质感 */}
      <form onSubmit={handleSubmit} className="mt-12 flex-1 flex flex-col justify-center space-y-8 relative z-20">
        
        <div className="space-y-6 bg-black/20 p-6 rounded-2xl border border-rich-gold/20 backdrop-blur-sm">
            {/* 姓名 */}
            <div className="relative">
              <label className="text-rich-gold text-xs font-bold mb-1 block pl-1">
                尊姓大名 / NAME
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-deep-red/50 border-b-2 border-rich-gold/50 text-pale-gold text-2xl font-bold py-2 px-1 focus:outline-none focus:border-rich-gold transition-colors placeholder-white/20 text-center"
                placeholder="请输入"
                required
              />
            </div>

            {/* 生辰 */}
            <div className="relative">
              <label className="text-rich-gold text-xs font-bold mb-1 block pl-1">
                生辰八字 / BIRTHDATE
              </label>
              <input
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                className="w-full bg-deep-red/50 border-b-2 border-rich-gold/50 text-pale-gold text-xl font-bold py-2 px-1 focus:outline-none focus:border-rich-gold transition-colors text-center"
                required
              />
            </div>

            {/* 性别 */}
            <div className="flex gap-4 pt-2">
                {['male', 'female'].map((g) => (
                    <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g as 'male' | 'female')}
                        className={`flex-1 py-3 rounded-lg border transition-all duration-300 font-bold ${
                            gender === g 
                            ? 'bg-gold-sheet text-deep-red border-transparent shadow-[0_0_15px_rgba(255,215,0,0.4)] transform scale-105' 
                            : 'bg-transparent text-white/50 border-white/10 hover:border-rich-gold/30'
                        }`}
                    >
                        {g === 'male' ? '乾 (男)' : '坤 (女)'}
                    </button>
                ))}
            </div>
        </div>

        <div className="pt-4">
          <Button type="submit" fullWidth>
            开启运势红包
          </Button>
          <p className="text-center text-[10px] text-white/30 mt-4">
            已有 9,928,310 人参与测算
          </p>
        </div>
      </form>
    </div>
  );
};