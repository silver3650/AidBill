import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

// 인증 상태를 전역으로 관리할 Context 생성
const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // 💡 핵심: 세션 확인 전까지 로딩 상태 유지

  useEffect(() => {
    // 1. 최초 렌더링 시 세션 확인
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false); // 세션 확인 완료 후 로딩 해제
    };
    
    checkSession();

    // 2. 로그인/로그아웃 등 세션 변경 이벤트 감지 (탭 이동 시 동기화 역할)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children} {/* 로딩이 끝난 후에만 앱을 렌더링 */}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};