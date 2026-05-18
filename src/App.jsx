import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Landmark, Users, Package, FileText, Building, ChevronRight 
} from 'lucide-react';
import { supabase } from './supabaseClient';

// 컴포넌트 임포트
import Dashboard from './components/Dashboard';
import LocalGovernments from './components/LocalGovernments';
import Customers from './components/Customers';
import Devices from './components/Devices';
import Claims from './components/Claims';
import CompanyProfile from './components/CompanyProfile';
import AuthPage from './components/AuthPage';
import LogoutButton from './components/LogoutButton';
import Logo from './components/Logo';

// 💡 react-router-dom의 훅(useLocation 등)을 사용하기 위해 내부 레이아웃을 분리했습니다.
function MainLayout() {
  const location = useLocation();
  const currentPath = location.pathname;

  // 상태 기반 탭 대신 URL path를 지정하여 라우팅 체계로 완전히 전환했습니다.
  const menuItems = [
    { id: 'dashboard', path: '/', text: '대시보드', icon: <LayoutDashboard size={22} /> },
    { id: 'claims', path: '/claims', text: '청구 관리', icon: <FileText size={22} /> },
    { id: 'customers', path: '/customers', text: '대상자 관리', icon: <Users size={22} /> },
    { id: 'devices', path: '/devices', text: '보조기기 품목', icon: <Package size={22} /> },
    { id: 'localGovs', path: '/localGovs', text: '지자체 관리', icon: <Landmark size={22} /> },
    { id: 'company', path: '/company', text: '업체 정보', icon: <Building size={22} /> },
  ];

  // 현재 활성화된 메뉴 타이틀 매칭
  const activeMenu = menuItems.find(m => m.path === currentPath) || menuItems[0];

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans">
      {/* --- 사이드바 --- */}
      <aside className="w-72 bg-white border-r border-gray-100 flex flex-col p-6 shadow-xl shadow-blue-500/5 z-20">
        <Logo size={48} className="mb-10 px-2" />

        <nav className="flex-1 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`w-full flex items-center justify-between px-4 py-4 rounded-[1.25rem] transition-all duration-300 group ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' 
                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-4 font-bold">
                  {item.icon}
                  <span>{item.text}</span>
                </div>
                {isActive && <ChevronRight size={18} className="opacity-50" />}
              </Link>
            );
          })}
        </nav>

        {/* 사이드바 하단 로그아웃 */}
        <div className="pt-6 border-t border-gray-50">
          <LogoutButton isFullWidth />
        </div>
      </aside>

      {/* --- 메인 콘텐츠 --- */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-50 flex items-center justify-between px-10 z-10">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">
            {activeMenu.text}
          </h2>
          <div className="flex items-center gap-4">
            <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest mr-2">Admin Mode</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto h-full">
            {/* 💡 조건부 렌더링 대신 <Routes> 컴포넌트를 통한 실제 라우팅 적용 */}
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/claims" element={<Claims />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/devices" element={<Devices />} />
              <Route path="/localGovs" element={<LocalGovernments />} />
              <Route path="/company" element={<CompanyProfile />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);

  // --- 로그인 세션 실시간 감시 ---
  useEffect(() => {
    // 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 상태 변화 감지 (로그인/로그아웃)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 세션이 없으면 무조건 로그인 페이지를 띄움
  if (!session) {
    return <AuthPage />;
  }

  return (
    // 💡 최상위를 BrowserRouter로 감싸주어 전체 앱에서 Link와 라우팅이 동작하도록 설정
    <BrowserRouter>
      <MainLayout />
    </BrowserRouter>
  );
}