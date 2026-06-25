import React from 'react';
import { RadarStats } from '../types';

interface RadarChartProps {
  stats: RadarStats;
  color?: string;
}

export const RadarChart: React.FC<RadarChartProps> = ({ stats, color = "#8E0000" }) => {
  const size = 100;
  const center = size / 2;
  const radius = (size / 2) - 10;
  const data = Object.values(stats) as number[];
  const labels = ["吸金", "桃花", "搞事", "躺平", "贵人", "硬骨"];

  const getPoint = (value: number, index: number, total: number) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const r = (value / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  const points = data.map((val, i) => getPoint(val, i, 6)).map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* 背景网格 - 罗盘风格 */}
        {[0.4, 0.7, 1].map((scale, idx) => (
             <circle 
                key={scale} 
                cx={center} 
                cy={center} 
                r={radius * scale} 
                fill="none" 
                stroke="#D1D5DB" 
                strokeWidth="0.5" 
                strokeDasharray={idx === 2 ? "2 2" : "0"}
             />
        ))}
        
        {/* 轴线 */}
        {[0, 1, 2].map((i) => (
            <line 
                key={i}
                x1={center + radius * Math.cos(Math.PI * i / 3)} 
                y1={center + radius * Math.sin(Math.PI * i / 3)}
                x2={center - radius * Math.cos(Math.PI * i / 3)} 
                y2={center - radius * Math.sin(Math.PI * i / 3)}
                stroke="#E5E7EB"
                strokeWidth="0.5"
            />
        ))}

        {/* 数据区域 */}
        <polygon 
            points={points} 
            fill={`${color}33`} 
            stroke={color} 
            strokeWidth="1.5" 
        />

        {/* 顶点 */}
        {data.map((val, i) => {
            const p = getPoint(val, i, 6);
            return <circle key={i} cx={p.x} cy={p.y} r="1.5" fill={color} />;
        })}

        {/* 标签 */}
        {labels.map((label, i) => {
             const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
             const labelRadius = radius + 8;
             const x = center + labelRadius * Math.cos(angle);
             const y = center + labelRadius * Math.sin(angle);
             return (
                 <text 
                    key={i} 
                    x={x} 
                    y={y} 
                    textAnchor="middle" 
                    dominantBaseline="middle" 
                    fill="#4B5563" 
                    fontSize="8" 
                 >
                     {label}
                 </text>
             );
        })}
      </svg>
    </div>
  );
};