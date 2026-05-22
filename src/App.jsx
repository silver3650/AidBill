import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Landmark, Users, Package, FileText, Building, ChevronRight, Menu, X, ShieldCheck, Building2 
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

// 💡 세션 만료 감지 컴포넌트
function SessionTimeoutHandler({ children }) {
  const timeoutRef = useRef(null);
  const TIMEOUT_DURATION = 30 * 60 * 1000; // 30분을 밀리초로 설정

  const handleLogout = useCallback(async () => {
    alert('30분 동안 활동이 없어 안전을 위해 자동 로그아웃되었습니다.');
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('자동 로그아웃 에러:', e);
    } finally {
      // 잔여 좀비 세션으로 인한 데이터 증발 버그를 막기 위해 강제 새로고침
      window.location.replace('/'); 
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(handleLogout, TIMEOUT_DURATION);
  }, [handleLogout, TIMEOUT_DURATION]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const activityHandler = () => resetTimer();

    events.forEach(event => document.addEventListener(event, activityHandler));
    resetTimer();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(event => document.removeEventListener(event, activityHandler));
    };
  }, [resetTimer]);

  return <>{children}</>;
}

// 내부 레이아웃 컴포넌트
function MainLayout({ isAdmin, companyName }) {
  const location = useLocation();
  const currentPath = location.pathname;
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  let menuItems = [
    { id: 'dashboard', path: '/', text: '대시보드', icon: <LayoutDashboard size={22} /> },
    { id: 'claims', path: '/claims', text: '청구 관리', icon: <FileText size={22} /> },
    { id: 'customers', path: '/customers', text: '대상자 관리', icon: <Users size={22} /> },
    { id: 'devices', path: '/devices', text: '보조기기 품목', icon: <Package size={22} /> },
    { id: 'localGovs', path: '/localGovs', text: '지자체 관리', icon: <Landmark size={22} /> },
    { id: 'company', path: '/company', text: '업체 정보', icon: <Building size={22} /> },
  ];

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
      
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

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

        <div className="pt-6 border-t border-gray-50 mt-4 shrink-0">
          <LogoutButton isFullWidth />
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
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
            <span className="hidden md:inline-flex items-center bg-gray-50 text-gray-600 px-4 py-2 rounded-full text-xs font-black border">
              <Building2 size={14} className="mr-2" /> {companyName}
            </span>
          </div>
        </header>

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

// 최상위 App 컴포넌트
export default function App() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [companyName, setCompanyName] = useState(''); 
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  const loadUserData = async (user) => {
    if (!user) {
      setIsAdmin(false);
      setCompanyName('');
      return;
    }
    
    try {
      const { data: adminCheck } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      setIsAdmin(!!adminCheck);

      const { data: companyData } = await supabase
        .from('company_profile')
        .select('company_name')
        .eq('company_id', user.id)
        .maybeSingle();

      if (companyData && companyData.company_name) {
        setCompanyName(companyData.company_name);
      } else {
        setCompanyName(adminCheck ? '최고 관리자' : '미설정 업체');
      }
    } catch (err) {
      console.error("데이터 바인딩 실패:", err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const { data: sessionData, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        const initialSession = sessionData?.session;
        if (initialSession) {
          setSession(initialSession);
          await loadUserData(initialSession.user);
        }
      } catch (error) {
        console.error("초기 인증 설정 에러:", error);
      } finally {
        // 💡 핵심 수정 1: isMounted 조건 제거. 
        // React 18의 Strict Mode에서 마운트/언마운트 반복 시 상태가 어긋나 무한 스피너가 도는 현상을 방지합니다.
        setIsCheckingAdmin(false); 
      }
    };

    initializeAuth();

    // 💡 핵심 수정 2: 구독 해제 시 에러 방지를 위해 객체 파괴 구조 할당을 안전하게 처리합니다.
    const authListener = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;
      
      // 이미 initializeAuth에서 최초 로드를 처리하므로 스킵
      if (event === 'INITIAL_SESSION') return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(currentSession);
        if (currentSession?.user) {
          await loadUserData(currentSession.user);
        }
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setSession(null);
        setIsAdmin(false);
        setCompanyName('');
      }
    });

    // 💡 핵심 수정 3: 네트워크 지연 등으로 인한 무한 스피너 방지용 안전장치 (5초 후 무조건 해제)
    const timeoutId = setTimeout(() => {
      setIsCheckingAdmin(false);
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (authListener && authListener.data && authListener.data.subscription) {
        authListener.data.subscription.unsubscribe();
      }
    };
  }, []);

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
        <SessionTimeoutHandler>
          <MainLayout isAdmin={isAdmin} companyName={companyName} />
        </SessionTimeoutHandler>
      )}
    </BrowserRouter>
  );
}