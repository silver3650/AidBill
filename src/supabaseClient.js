import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fmjvvrtzodsihmbzsacl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtanZ2cnR6b2RzaWhtYnpzYWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjI4NTEsImV4cCI6MjA5NDIzODg1MX0.ZqN7W0V1wPX2hJbTbDZHL8eTijC3iHvQTWfKeL-rgAg'

const customFetch = async (url, options) => {
  let retries = 3;
  while (retries > 0) {
    try {
      return await fetch(url, options);
    } catch (error) {
      retries -= 1;
      if (retries === 0) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

// 💡 핵심: HMR(새로고침) 시 중복 생성을 완벽히 차단하는 글로벌 캐싱 패턴
const supabase = globalThis.supabase || createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
  global: {
    fetch: customFetch,
  }
});

// 개발 환경에서만 글로벌 객체에 저장하여 중복 실행 방지
if (process.env.NODE_ENV !== 'production') {
  globalThis.supabase = supabase;
}

export { supabase };

// 탭 활성화 시 세션 동기화 (1회만 등록)
if (typeof window !== 'undefined' && !globalThis.__VISIBILITY_EVENT_SET__) {
  globalThis.__VISIBILITY_EVENT_SET__ = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      supabase.auth.getSession().catch(() => {});
    }
  });
}