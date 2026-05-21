import { LogOut } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function LogoutButton({ isFullWidth = false }) {
  const handleLogout = async () => {
    if (!window.confirm('정말 로그아웃 하시겠습니까?')) return;
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // 💡 핵심 수정: 단순히 상태 변화를 기다리지 않고
      // 강제로 페이지를 새로고침하여 메모리를 초기화합니다.
      // 이것이 무한 로딩을 방지하는 가장 확실한 방법입니다.
      window.location.href = '/';
      
    } catch (error) {
      alert('로그아웃 실패: ' + error.message);
    }
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
      <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
      <span>로그아웃</span>
    </button>
  );
}