import { LogOut } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function LogoutButton({ isFullWidth = false }) {
  const handleLogout = async () => {
    if (!window.confirm('정말 로그아웃 하시겠습니까?')) return;
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert('로그아웃 실패: ' + error.message);
    }
    // 로그아웃 시 App.jsx의 onAuthStateChange가 감지하여 자동으로 로그인 페이지로 전환됩니다.
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