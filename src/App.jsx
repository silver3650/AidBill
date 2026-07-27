import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Landmark, Users, Package, FileText, Building, ChevronRight, Menu, X, ShieldCheck, Building2 
} from 'lucide-react';
import { supabase } from './supabaseClient';

// --- 💡 최고관리자 업체 접속(Impersonation)을 위한 세션 가로채기 ---
const originalGetSession = supabase.auth.getSession.bind(supabase.auth);
const originalGetUser = supabase.auth.getUser.bind(supabase.auth);

supabase.auth.getSession = async () => {
  const res = await originalGetSession();
  const targetId = sessionStorage.getItem('impersonatedCompanyId');
  if (res.data?.session?.user && targetId) {
    res.data.session.originalUser = { ...res.data.session.user }; 
    res.data.session.user.id = targetId;
    res.data.session.user.isImpersonating = true;
  }
  return res;
};

supabase.auth.getUser = async () => {
  const res = await originalGetUser();
  const targetId = sessionStorage.getItem('impersonatedCompanyId');
  if (res.data?.user && targetId) {
    res.data.originalUser = { ...res.data.user };
    res.data.user.id = targetId;
    res.data.user.isImpersonating = true;
  }
  return res;
};
// -----------------------------------------------------------------

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
import ManualDownload from './components/ManualDownload';

// 내부 레이아웃 컴포넌트
function MainLayout({ isAdmin, companyName }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);

  const isImpersonating = !!sessionStorage.getItem('impersonatedCompanyId');
  const exitImpersonation = () => {
    sessionStorage.removeItem('impersonatedCompanyId');
    window.location.href = '/admin'; 
  };

  useEffect(() => {
    if (!isAdmin) return;
    const fetchPendingApprovals = async () => {
      const { count, error } = await supabase
        .from('company_profile')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', false);
      if (!error) setPendingApprovalCount(count || 0);
    };
    fetchPendingApprovals();
    const subscription = supabase
      .channel('admin-approval-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_profile' }, () => {
         fetchPendingApprovals();
      })
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, [isAdmin]);

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
      icon: <ShieldCheck size={22} className="text-rose-500" />,
      badge: pendingApprovalCount > 0 ? 'NEW' : null 
    });
  }

  const activeMenu = menuItems.find(m => m.path === currentPath) || menuItems[0];
  useEffect(() => { setIsMobileMenuOpen(false); }, [currentPath]);

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 flex flex-col p-6 shadow-2xl transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 md:shadow-xl md:shadow-blue-500/5`}>
        <div className="flex items-center justify-between mb-10 px-2">
          <Logo size={40} />
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 text-gray-500 hover:bg-gray-50 rounded-xl"><X size={24} /></button>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2">
          {menuItems.map((item) => {
            const isActive = currentPath === item.path;
            const isAdminMenu = item.id === 'admin';
            return (
              <Link key={item.id} to={item.path} className={`w-full flex items-center justify-between px-4 py-4 rounded-[1.25rem] transition-all group ${isActive && !isAdminMenu ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : isActive && isAdminMenu ? 'bg-gray-900 text-white shadow-xl shadow-gray-300' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'}`}>
                <div className="flex items-center gap-4 font-bold">
                  {item.icon}
                  <div className="flex items-center gap-2">
                    <span className={isAdminMenu && !isActive ? 'text-rose-500' : ''}>{item.text}</span>
                    {item.badge && (
                      <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-md font-black shadow-sm animate-pulse tracking-wide">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
                {isActive && <ChevronRight size={18} className="opacity-50" />}
              </Link>
            );
          })}
        </nav>
        <div className="pt-6 border-t border-gray-50 mt-4 shrink-0"><LogoutButton isFullWidth /></div>
      </aside>
      <main className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        <header className="h-16 md:h-20 shrink-0 bg-white/80 backdrop-blur-md border-b border-gray-50 flex items-center justify-between px-4 md:px-10 z-10 sticky top-0 w-full">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-gray-600 md:hidden hover:bg-gray-100 rounded-xl"><Menu size={24} /></button>
            <h2 className="text-lg md:text-xl font-black text-gray-900 tracking-tight">{activeMenu.text}</h2>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {isImpersonating && (
              <button onClick={exitImpersonation} className="bg-rose-500 text-white text-[10px] md:text-xs font-black px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg hover:bg-rose-600 flex items-center gap-1 shadow-md transition-all animate-pulse mr-1">
                <X size={14} /> 열람 모드 종료
              </button>
            )}
            {isAdmin && <span className="hidden md:inline-block bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-sm"><ShieldCheck size={12} className="inline mr-1" /> Super Admin</span>}
            <span className="hidden md:inline-flex items-center bg-gray-50 text-gray-600 px-4 py-2 rounded-full text-xs font-black border"><Building2 size={14} className="mr-2" /> {companyName}</span>
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

export default function App() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [companyName, setCompanyName] = useState(''); 
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadUserData = async (sessionUser) => {
      if (!sessionUser) { setIsAdmin(false); setCompanyName(''); return; }
      try {
        const realUserId = sessionUser.originalUser ? sessionUser.originalUser.id : sessionUser.id;
        
        const { data: adminCheck } = await supabase.from('admin_users').select('id').eq('id', realUserId).maybeSingle();
        setIsAdmin(!!adminCheck);
        
        const { data: companyData } = await supabase.from('company_profile').select('company_name').eq('company_id', sessionUser.id).maybeSingle();
        setCompanyName(companyData?.company_name || (adminCheck ? '최고 관리자' : '미설정 업체'));
      } catch (err) {
        console.error("데이터 로드 실패:", err);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setSession(session);
        if (session) loadUserData(session.user);
        setIsCheckingAdmin(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (isMounted) {
        setSession(currentSession);
        if (currentSession) {
          loadUserData(currentSession.user);
        } else {
          setIsAdmin(false);
          setCompanyName('');
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (isCheckingAdmin) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-sm font-bold text-gray-500 mt-4">보안 세션을 확인 중...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {!session ? <AuthPage /> : <MainLayout isAdmin={isAdmin} companyName={companyName} />}
    </BrowserRouter>
  );
}