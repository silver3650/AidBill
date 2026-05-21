import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Landmark, Users, Package, FileText, Building, ChevronRight, Menu, X, ShieldCheck 
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
import AdminDashboard from './components/AdminDashboard'; // 👈 추가됨

// 💡 내부 레이아웃 컴포넌트
function MainLayout({ isAdmin }) {
  const location = useLocation();
  const currentPath = location.pathname;
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 기본 메뉴
  let menuItems = [
    { id: 'dashboard', path: '/', text: '대시보드', icon: <LayoutDashboard size={22} /> },
    { id: 'claims', path: '/claims', text: '청구 관리', icon: <FileText size={22} /> },
    { id: 'customers', path: '/customers', text: '대상자 관리', icon: <Users size={22} /> },
    { id: 'devices', path: '/devices', text: '보조기기 품목', icon: <Package size={22} /> },
    { id: 'localGovs', path: '/localGovs', text: '지자체 관리', icon: <Landmark size={22} /> },
    { id: 'company', path: '/company', text: '업체 정보', icon: <Building size={22} /> },
  ];

  // 💡 관리자일 경우 메뉴 배열 맨 끝에 최고 관리자 메뉴 추가
  if (isAdmin) {
    menuItems.push({ 
      id: 'admin', 
      path: '/admin', 
      text: '최고 관리자', 
      icon: <ShieldCheck size={22} className="text-rose-500" /> 
    });
  }

  const activeMenu = menuItems.find(m => m.path === currentPath) || menuItems[0];

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentPath]);

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      
      {/* 모바일 사이드바 오버레이 */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      {/* 사이드바 */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 flex flex-col p-6 shadow-2xl transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:shadow-xl md:shadow-blue-500/5
      `}>
        <div className="flex items-center justify-between mb-10 px-2">
          <Logo size={40} />
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2">
          {menuItems.map((item) => {
            const isActive = currentPath === item.path;
            const isAdminMenu = item.id === 'admin';

            return (
              <Link
                key={item.id}
                to={item.path}
                className={`w-full flex items-center justify-between px-4 py-4 rounded-[1.25rem] transition-all duration-300 group ${
                  isActive && !isAdminMenu
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' 
                    : isActive && isAdminMenu
                    ? 'bg-gray-900 text-white shadow-xl shadow-gray-300'
                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-4 font-bold">
                  {item.icon}
                  <span className={isAdminMenu && !isActive ? 'text-rose-500' : ''}>{item.text}</span>
                </div>
                {isActive && <ChevronRight size={18} className="opacity-50" />}
              </Link>
            );
          })}
        </nav>

        {/* 사이드바 하단 로그아웃 */}
        <div className="pt-6 border-t border-gray-50 mt-4 shrink-0">
          <LogoutButton isFullWidth />
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        
        {/* 헤더 */}
        <header className="h-16 md:h-20 shrink-0 bg-white/80 backdrop-blur-md border-b border-gray-50 flex items-center justify-between px-4 md:px-10 z-10 sticky top-0 w-full">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="p-2 -ml-2 text-gray-600 md:hidden hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-lg md:text-xl font-black text-gray-900 tracking-tight line-clamp-1">
              {activeMenu.text}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && <span className="hidden md:inline-block bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest mr-2 shadow-sm"><ShieldCheck size={12} className="inline mr-1" /> Super Admin</span>}
            {!isAdmin && <span className="hidden md:inline-block bg-blue-50 text-blue-600 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest mr-2">Company Mode</span>}
          </div>
        </header>

        {/* 컨텐츠 영역 */}
        <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-4 md:p-10 w-full">
          <div className="max-w-7xl mx-auto min-h-full pb-20">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/claims" element={<Claims />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/devices" element={<Devices />} />
              <Route path="/localGovs" element={<LocalGovernments />} />
              <Route path="/company" element={<CompanyProfile />} />
              {/* 💡 관리자 권한이 없으면 루트로 리다이렉트 방어 */}
              <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
}

// ... (MainLayout 등 위쪽 코드는 그대로 유지)

export default function App() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    // 1. 초기 세션 및 권한 확인
    const checkSessionAndAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session?.user) {
        // 로그인 상태라면 admin_users 테이블 조회
        const { data } = await supabase.from('admin_users').select('id').eq('email', session.user.email).maybeSingle();
        setIsAdmin(!!data);
      } else {
        setIsAdmin(false);
      }
      setIsCheckingAdmin(false);
    };

    checkSessionAndAdmin();

    // 2. 세션 변경(로그인/로그아웃) 실시간 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const { data } = await supabase.from('admin_users').select('id').eq('id', session.user.id).maybeSingle();
        setIsAdmin(!!data);
      } else {
        setIsAdmin(false);
      }
      setIsCheckingAdmin(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 💡 해결: App 최상위를 BrowserRouter로 감싸서 라우팅 에러(하얀 화면) 방지
  return (
    <BrowserRouter>
      {isCheckingAdmin ? (
        // 세션 및 권한 체크 중일 때 로딩 스피너
        <div className="h-screen w-full flex items-center justify-center bg-[#F8FAFC]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : !session ? (
        // 세션이 없으면 로그인 페이지
        <AuthPage />
      ) : (
        // 세션이 있으면 메인 레이아웃 (관리자 권한 전달)
        <MainLayout isAdmin={isAdmin} />
      )}
    </BrowserRouter>
  );
}