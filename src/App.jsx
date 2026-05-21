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
import AdminDashboard from './components/AdminDashboard';

// 💡 1. 원래 있던 내부 레이아웃 컴포넌트 (UI와 모든 기능 100% 그대로 유지)
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

  // 최고 관리자 메뉴 추가 (아이디 'admin'으로 매칭 버그 수정)
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
              <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
}

// 💡 2. 최상위 App 컴포넌트 (안전 장치가 추가된 최신 로직)
export default function App() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  // 관리자 체크 기능 (대소문자 .maybeSingle 로 수정완료)
  const checkAdminStatus = async (user) => {
    if (!user) return false;
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle(); 

      if (error) {
        console.error("Admin DB 조회 실패:", error.message);
        return false;
      }
      return !!data;
    } catch (err) {
      console.error("Admin 체크 예외 발생:", err);
      return false;
    }
  };

  useEffect(() => {
    // 💡 안전 장치: Supabase 응답이 지연되어 하얗게 멈추는 현상을 방지하는 2.5초 타임아웃
    const safetyTimeout = setTimeout(() => {
      console.warn("인증 체크 시간이 초과되어 강제로 로딩을 해제합니다.");
      setIsCheckingAdmin(false);
    }, 2500);

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) throw error;

        setSession(initialSession);
        
        if (initialSession?.user) {
          const adminActive = await checkAdminStatus(initialSession.user);
          setIsAdmin(adminActive);
        }
      } catch (error) {
        console.error("초기 인증 설정 에러:", error);
      } finally {
        clearTimeout(safetyTimeout);
        setIsCheckingAdmin(false); // 💡 어떤 에러가 나도 로딩 상태를 무조건 종료시킴
      }
    };

    initializeAuth();

    // 실시간 세션 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);
      if (currentSession?.user) {
        const adminActive = await checkAdminStatus(currentSession.user);
        setIsAdmin(adminActive);
      } else {
        setIsAdmin(false);
      }
      setIsCheckingAdmin(false);
    });

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // 로딩 스피너 화면 (하얀 화면 방지)
  if (isCheckingAdmin) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-sm font-bold text-gray-500 mt-4">보안 세션을 연결하는 중...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {!session ? (
        <AuthPage />
      ) : (
        <MainLayout isAdmin={isAdmin} />
      )}
    </BrowserRouter>
  );
}