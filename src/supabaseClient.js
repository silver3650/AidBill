import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fmjvvrtzodsihmbzsacl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtanZ2cnR6b2RzaWhtYnpzYWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjI4NTEsImV4cCI6MjA5NDIzODg1MX0.ZqN7W0V1wPX2hJbTbDZHL8eTijC3iHvQTWfKeL-rgAg'

// 💡 세션 자동 연장 및 로컬 저장소 영구 보관 옵션 추가
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,      // 브라우저 탭을 닫아도 로그인 상태(로컬 스토리지) 유지
    autoRefreshToken: true,    // 토큰 만료 시간이 다가오면 자동으로 새 토큰 발급
    detectSessionInUrl: true   // 외부 인증이나 리다이렉트 후 세션 자동 복구
  }
})