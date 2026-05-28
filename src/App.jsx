import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Landmark, Users, Package, FileText, Building, ChevronRight, Menu, X, ShieldCheck, Building2 
} from 'lucide-react';
import { supabase } from './supabaseClient';

// 컴포넌트 임포트
import Dashboard from './components/Dashboard';
import LocalGovernments from './components/LocalGovernments';
import NHISBranches from './components/NHISBranches';
import Customers from './components/Customers';
import Devices from './components/Devices';
import Claims from './components/Claims';
import CompanyProfile from './components/CompanyProfile';
import AuthPage from './components/AuthPage';
import LogoutButton from './components/LogoutButton';
import Logo from './components/Logo';
import AdminDashboard from './components/AdminDashboard';
import ManualDownload from './components/ManualDownload'; // 💡 매뉴얼 다운로드 컴포넌트 임포트

// -------------------------------------------------------------
// 🚀 핵심 해결 로직 1: 사용자 30분 미활동 시에만 작동하는 '진짜' 자동 로그아웃 타이머
// -------------------------------------------------------------
function SessionTimeoutHandler({ children }) {
  const TIMEOUT_DURATION = 30 * 60 * 1000; // 정확히 30분 (밀리초)
  const lastWriteRef = useRef(0);

  const handleLogout = useCallback(async () => {
    // 중복 로그아웃 방지 플래그 (세션 스토리지 사용으로 탭 간 충돌 방지)
    if (sessionStorage.getItem('isLoggingOut') === 'true') return;
    sessionStorage.setItem('isLoggingOut', 'true');
    
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('자동 로그아웃 에러:', e);
    } finally {
      // 잔여 데이터 초기화 및 로그인 페이지로 강제 리다이렉트
      localStorage.removeItem('lastActivityTime');
      sessionStorage.removeItem('isLoggingOut');
      alert('30분 동안 활동이 없어 안전을 위해 자동 로그아웃되었습니다.');
      window.location.replace('/'); 
    }
  }, []);

  const updateActivity = useCallback(() => {
    const now = Date.now();
    // 브라우저 과부하 방지: 마우스를 움직일 때마다 저장하지 않고 2초에 한 번만 갱신
    if (now - lastWriteRef.current > 2000) {
      localStorage.setItem('lastActivityTime', now.toString());
      lastWriteRef.current = now;
    }
  }, []);

  const checkTimeout = useCallback(() => {
    const lastActivityStr = localStorage.getItem('lastActivityTime');
    if (!lastActivityStr) return;

    const lastActivity = parseInt(lastActivityStr, 10);
    // 기록된 마지막 시간과 현재 시간을 비교하여 진짜 30분이 넘었을 때만 로그아웃
    if (Date.now() - lastActivity > TIMEOUT_DURATION) {
      handleLogout();
    }
  }, [handleLogout, TIMEOUT_DURATION]);

  useEffect(() => {
    updateActivity();

    const intervalId = setInterval(checkTimeout, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkTimeout();
        updateActivity(); 
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => document.addEventListener(event, updateActivity, { passive: true }));

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      events.forEach(event => document.removeEventListener(event, updateActivity));
    };
  }, [checkTimeout, updateActivity]);

  return <>{children}</>;
}
// -------------------------------------------------------------

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
    { id: 'nhis', path: '/nhis', text: '공단지사 관리', icon: <Building2 size={22} /> },
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
          <div className="flex items-center gap-2 md:gap-4">
            {isAdmin && <span className="hidden md:inline-block bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-sm"><ShieldCheck size={12} className="inline mr-1" /> Super Admin</span>}
            <span className="hidden md:inline-flex items-center bg-gray-50 text-gray-600 px-4 py-2 rounded-full text-xs font-black border">
              <Building2 size={14} className="mr-2" /> {companyName}
            </span>
            {/* 💡 매뉴얼 다운로드 버튼 추가 */}
            <ManualDownload />
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
              <Route path="/nhis" element={<NHISBranches />} />
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

  // 권한 및 업체명 세팅 함수
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

    // 💡 초기 인증 (무조건 서버에서 getUser로 토큰을 갱신 및 검증)
    const initializeAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          setSession(null);
        } else {
          const { data: { session: validSession } } = await supabase.auth.getSession();
          setSession(validSession);
          await loadUserData(user); // user 객체를 전달
        }
      } catch (error) {
        console.error("초기 인증 설정 에러:", error);
      } finally {
        if (isMounted) setIsCheckingAdmin(false); 
      }
    };

    initializeAuth();

    // -------------------------------------------------------------
    // 🚀 핵심 해결 로직 2: Supabase의 가짜 SIGNED_OUT 이벤트 원천 차단
    // -------------------------------------------------------------
    const authListener = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;
      if (event === 'INITIAL_SESSION') return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(currentSession);
        if (currentSession?.user) {
          await loadUserData(currentSession.user);
        }
      } else if (event === 'SIGNED_OUT') {
        
        // 브라우저 탭 절전 모드 복귀 시 발생하는 '가짜 로그아웃(False Alarm)'을 차단합니다.
        // 이벤트를 맹신하지 않고, 서버에 한 번 더 강제로 물어봅니다.
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          // 서버에서도 죽었다고 판단하면 비로소 진짜 로그아웃 처리
          setSession(null);
          setIsAdmin(false);
          setCompanyName('');
        } else {
          // 서버에서 유효한 유저를 살려냈다면(Refresh 성공), 세션을 즉시 복구합니다!
          const { data: { session: recoveredSession } } = await supabase.auth.getSession();
          setSession(recoveredSession);
          await loadUserData(user);
        }
      }
    });

    const timeoutId = setTimeout(() => {
      if (isMounted) setIsCheckingAdmin(false);
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