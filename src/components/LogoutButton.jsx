import React, { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function LogoutButton({ isFullWidth = false }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (!window.confirm('정말 로그아웃 하시겠습니까?')) return;
    
    setIsLoggingOut(true);

    try {
      // 1. 타임아웃 프로미스 생성 (최대 1.5초 대기)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('서버 응답 지연 타임아웃')), 1500)
      );
      
      // 2. 서버 로그아웃 요청과 타임아웃 중 먼저 끝나는 것을 채택 (네트워크 취소 방지)
      await Promise.race([
        supabase.auth.signOut(),
        timeoutPromise
      ]);
    } catch (err) {
      // 3. 서버 응답이 없거나 타임아웃에 걸려도 에러만 찍고 아래 단계로 무조건 넘어감
      console.warn('서버 로그아웃 지연 (무시하고 로컬 초기화 진행):', err.message);
    } finally {
      // 4. 로컬 메모리 완전 폭파
      localStorage.clear();
      sessionStorage.clear();
      
      // 5. 서버 요청이 안전하게 발송된 후 최상위 경로로 강제 이동
      window.location.href = '/';
    }
  };

  return (
    <button 
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={`
        flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all group
        ${isFullWidth 
          ? 'w-full bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600' 
          : 'bg-white border border-gray-100 text-gray-500 hover:border-red-100 hover:text-red-600 shadow-sm'
        }
        disabled:opacity-50 disabled:cursor-wait
      `}
    >
      {/* 로그아웃 진행 중일 때는 스피너로 변환 */}
      {isLoggingOut ? (
        <Loader2 size={18} className="animate-spin text-red-500" />
      ) : (
        <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
      )}
      <span>{isLoggingOut ? '로그아웃 중...' : '로그아웃'}</span>
    </button>
  );
}