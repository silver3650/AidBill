import React from 'react';

export default function Logo({ size = 40, className = "" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* SVG 심볼 마크 */}
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm transition-transform hover:scale-105"
      >
        {/* 부드러운 배경 */}
        <rect width="100" height="100" rx="24" fill="#F0F9FF" />
        
        {/* 알파벳 A의 왼쪽 다리 */}
        <path 
          d="M 50 25 L 25 75" 
          stroke="#2563EB" /* Blue 600 */
          strokeWidth="12" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        
        {/* 알파벳 A의 오른쪽 다리 */}
        <path 
          d="M 50 25 L 75 75" 
          stroke="#2563EB" /* Blue 600 */
          strokeWidth="12" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />

        {/* 가로선을 대체하는 '체크마크' (Bill/승인 완료) */}
        <path 
          d="M 32 55 L 45 68 L 85 28" 
          stroke="#059669" /* Emerald 600 */
          strokeWidth="12" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
      </svg>
      
      {/* 텍스트 로고 */}
      <div className="flex flex-col justify-center">
        <span className="text-2xl font-black tracking-tighter text-gray-900 leading-none">
          Aid<span className="text-blue-600">Bill</span>
        </span>
        <span className="text-[10px] font-extrabold text-gray-400 tracking-widest mt-1">
          장애인 보조기기 청구관리
        </span>
      </div>
    </div>
  );
}