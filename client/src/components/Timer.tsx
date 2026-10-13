import React, { useEffect, useState } from 'react';

interface TimerProps {
  deadlineTimestamp: number; // ms
  totalSeconds: number;
  onExpire?: () => void;
  size?: 'normal' | 'large';
}

export const Timer: React.FC<TimerProps> = ({
  deadlineTimestamp,
  totalSeconds,
  onExpire,
  size = 'normal'
}) => {
  const [remainingMs, setRemainingMs] = useState<number>(() => {
    return Math.max(0, deadlineTimestamp - Date.now());
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = deadlineTimestamp - Date.now();
      if (diff <= 0) {
        setRemainingMs(0);
        clearInterval(interval);
        if (onExpire) onExpire();
      } else {
        setRemainingMs(diff);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [deadlineTimestamp, onExpire]);

  const seconds = Math.ceil(remainingMs / 1000);
  const progressPercent = Math.min(100, Math.max(0, (remainingMs / (totalSeconds * 1000)) * 100));

  // Determine color status
  let strokeColor = '#06B6D4'; // Brand Cyan
  let textColor = 'text-brand-cyan';
  if (seconds <= 5) {
    strokeColor = '#F43F5E'; // Brand Rose (danger)
    textColor = 'text-brand-rose animate-pulse';
  } else if (seconds <= 10) {
    strokeColor = '#F59E0B'; // Brand Amber (warning)
    textColor = 'text-brand-amber';
  }

  const radius = size === 'large' ? 44 : 26;
  const strokeWidth = size === 'large' ? 6 : 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;
  const svgSize = size === 'large' ? 104 : 64;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={svgSize} height={svgSize} className="-rotate-90">
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="transparent"
          stroke="#1E293B"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-100 ease-linear"
        />
      </svg>
      <div className={`absolute flex flex-col items-center justify-center font-mono font-bold ${textColor}`}>
        <span className={size === 'large' ? 'text-3xl font-extrabold tracking-tighter' : 'text-lg tracking-tight'}>
          {seconds}
        </span>
        {size === 'large' && <span className="text-[10px] uppercase text-slate-400 font-sans tracking-widest -mt-1">sec</span>}
      </div>
    </div>
  );
};
