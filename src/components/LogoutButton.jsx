import React from 'react';
import { LogOut } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function LogoutButton({ isFullWidth = false }) {
  const handleLogout = () => {
    // 1. 사용자에게 로그아웃 여부 확인
    if (!window.confirm('정말 로그아웃 하시겠습니까?')) return;
    
    // 2. 서버에 로그아웃 요청만 던지고 응답을 기다리지 않음 (무한 로딩 원천 차단)
    supabase.auth.signOut().catch((err) => {
      console.warn('서버 로그아웃 지연 (무시됨):', err.message);
    });
    
    // 3. 서버 응답과 상관없이 즉시 로컬 메모리(좀비 세션) 완전 폭파
    localStorage.clear();
    sessionStorage.clear();
    
    // 4. 즉시 최상위 경로(로그인 창)로 강제 이동 및 새로고침
    window.location.href = '/';
  };

  return (
    <button 
      onClick={handleLogout}
      className={`
        flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all group
        ${isFullWidth 
          ? 'w-full bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600' 
          : 'bg-white border border-gray-100 text-gray-500 hover:border-red-100 hover:text-red-600 shadow-sm'
        }
      `}
    >
      {/* 호버 시 아이콘이 오른쪽으로 살짝 이동하는 애니메이션 유지 */}
      <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
      <span>로그아웃</span>
    </button>
  );
}