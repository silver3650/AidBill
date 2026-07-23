import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fmjvvrtzodsihmbzsacl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtanZ2cnR6b2RzaWhtYnpzYWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjI4NTEsImV4cCI6MjA5NDIzODg1MX0.ZqN7W0V1wPX2hJbTbDZHL8eTijC3iHvQTWfKeL-rgAg'

// 💡 튕김 현상을 유발하던 customFetch(재시도 로직)와 
// 불필요한 글로벌 캐싱, 수동 visibilitychange 이벤트를 모두 제거한 순수/표준 연결 코드입니다.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  }
});