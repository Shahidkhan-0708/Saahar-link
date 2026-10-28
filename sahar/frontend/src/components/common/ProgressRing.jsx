import React from 'react';

export default function ProgressRing({
  percentage = 68,
  size = 110,
  strokeWidth = 10,
  color = '#2563EB',
  trackColor = '#E2E8F0',
  label = '',
  centerText = null,
  textSize = null
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const fontClass = textSize || (
    size < 70 ? 'text-xs font-black' :
    size < 85 ? 'text-sm font-black' :
    size < 100 ? 'text-base sm:text-lg font-black' :
    'text-xl sm:text-2xl font-black'
  );

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-1">
        {centerText ? (
          centerText
        ) : (
          <>
            <span className={`${fontClass} text-slate-900 tracking-tight leading-none`}>
              {percentage}%
            </span>
            {label && (
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                {label}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
