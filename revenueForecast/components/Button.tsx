import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'glitch' | 'wechat' | 'action';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '',
  ...props 
}) => {
  const baseStyle = "font-bold py-3 px-6 rounded-lg text-lg transform active:scale-95 select-none transition-all duration-200 ease-out disabled:opacity-50 flex items-center justify-center gap-2 relative overflow-hidden";
  
  let variantStyle = "";
  switch (variant) {
    case 'primary':
      // 鎏金按钮
      variantStyle = "bg-gradient-to-b from-[#F2C97D] to-[#E5B865] text-[#8E0000] shadow-[0_4px_10px_rgba(142,0,0,0.3)] border border-[#FFF5CC]/50";
      break;
    case 'secondary':
      // 幽灵按钮
      variantStyle = "bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20";
      break;
    case 'glitch':
      // 强调/警告
      variantStyle = "bg-[#2C1608] text-[#F2C97D] border border-[#F2C97D]/30";
      break;
    case 'wechat':
      variantStyle = "bg-[#07C160] text-white shadow-lg";
        break;
    case 'action':
      // 微信ActionSheet风格
      variantStyle = "bg-white text-black border-t border-gray-100 rounded-none active:bg-gray-100 py-4 font-normal";
      break;
  }

  return (
    <button 
      className={`${baseStyle} ${variantStyle} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {/* 按钮高光 */}
      {variant === 'primary' && (
          <div className="absolute top-0 left-0 w-full h-[30%] bg-white/40 rounded-t-lg"></div>
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
};