import { useState, useRef, useEffect } from 'react';
import { 
  Building2, User, Calendar, Lock, Mail, 
  Upload, ArrowRight, CheckCircle2, Loader2, Award, X, FileText, ShieldCheck
} from 'lucide-react';
import { supabase } from '../supabaseClient';

// 💡 확정된 구독 플랜 데이터 (4단계)
const SUBSCRIPTION_PLANS = [
  { id: 'free', name: '프리', price: '0원', desc: '월 3건 이하 무료 지원. 시스템 도입 전 테스트용으로 적합한 스타터 플랜입니다.' },
  { id: 'basic', name: '베이직', price: '49,000원', desc: '월 10건 기본 제공 (초과 시 건당 3,000원 과금). 일반적인 중소규모 업체에 적합한 표준 플랜입니다.' },
  { id: 'pro', name: '프로', price: '99,000원', desc: '월 30건 기본 제공 (초과 시 건당 1,500원 과금). 매월 청구 건수가 많은 활발한 업체에 권장합니다.' },
  { id: 'enterprise', name: '엔터프라이즈', price: '별도 협의', desc: '무제한 청구 및 맞춤형 커스텀 기능 제공. 보조기기 제조사 및 전국 단위 대형 업체에 적합합니다.' }
];

// 💡 Supabase 에러 메시지 한국어 변환 헬퍼 함수
const translateAuthError = (err) => {
  const msg = err.message || '';
  if (msg.includes("User already registered")) return "이미 가입된 이메일입니다. 로그인해 주세요.";
  if (msg.includes("Password should be at least")) return "비밀번호는 최소 6자 이상이어야 합니다.";
  if (msg.includes("Invalid login credentials")) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (msg.includes("Email not confirmed")) return "이메일 인증이 완료되지 않았습니다.";
  return `요청 처리 중 문제가 발생했습니다.\n(${msg})`;
};

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // 💡 비동기 통신 중 컴포넌트 언마운트 시 상태 업데이트를 방지하기 위한 Ref
  const isMountedRef = useRef(true);

  const [selectedPlanInfo, setSelectedPlanInfo] = useState(null);

  // 💡 약관 동의 상태 및 모달 관리
  const [agreements, setAgreements] = useState({ terms: false, privacy: false });
  const [activeModal, setActiveModal] = useState(null); // 'terms' | 'privacy' | null
  const [termsText, setTermsText] = useState('이용약관 내용을 불러오는 중...');
  const [privacyText, setPrivacyText] = useState('개인정보 처리방침을 불러오는 중...');

  const [formData, setFormData] = useState({
    companyName: '', bizRegNumber: '', ownerName: '',
    ownerBirthDate: '', email: '', password: '', bizLicense: null,
    subscriptionPlan: 'free' // 기본 선택값을 '프리'로 설정
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // 💡 관리자 설정(app_settings)에서 이용약관/개인정보처리방침 내용 불러오기
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('terms_of_service, privacy_policy')
          .maybeSingle(); 
        
        if (data && isMountedRef.current) {
          if (data.terms_of_service) setTermsText(data.terms_of_service);
          if (data.privacy_policy) setPrivacyText(data.privacy_policy);
        }
      } catch (err) {
        if (isMountedRef.current) {
          console.warn("앱 설정 정보를 불러올 수 없습니다. 기본값을 사용합니다.");
          setTermsText("관리자 페이지에서 '이용약관' 내용을 설정해 주세요.");
          setPrivacyText("관리자 페이지에서 '개인정보 처리방침' 내용을 설정해 주세요.");
        }
      }
    };
    fetchSettings();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePlanClick = (plan) => {
    setFormData({ ...formData, subscriptionPlan: plan.id });
    setSelectedPlanInfo(plan); // 모달 띄우기
  };

  // 전체 필수 약관 동의 핸들러
  const handleAllAgree = (e) => {
    const isChecked = e.target.checked;
    setAgreements({ terms: isChecked, privacy: isChecked });
  };

  const handleSignUp = async () => {
    const { companyName, bizRegNumber, ownerName, ownerBirthDate, email, password, bizLicense, subscriptionPlan } = formData;
    
    // 💡 필수 값 검증
    if (!agreements.terms || !agreements.privacy) return alert('이용약관 및 개인정보 처리방침에 모두 동의해 주세요.');
    if (!bizLicense) return alert('사업자등록증 파일을 반드시 첨부해 주세요.');
    
    setLoading(true);

    // 무한 스피너 방지용 안전장치 (15초 후 강제 해제)
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) setLoading(false);
    }, 15000);

    try {
      // 1. Supabase Auth 계정 생성
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error("계정 생성에 실패했습니다.");

      try {
        // 3. 파일 확장자 안전 추출 및 타임스탬프 결합 (고유 파일명 생성)
        const originalName = bizLicense.name;
        const lastDotIndex = originalName.lastIndexOf('.');
        const fileExt = lastDotIndex !== -1 ? originalName.substring(lastDotIndex + 1) : 'png';
        const fileName = `${userId}/license_${Date.now()}.${fileExt}`;

        // 스토리지에 사업자등록증 업로드
        const { error: uploadError } = await supabase.storage
          .from('biz-licenses')
          .upload(fileName, bizLicense);
        
        if (uploadError) throw new Error(`파일 첨부 실패: ${uploadError.message}`);

        // 1. 익월 1일 과금 시작일 자동 계산
        const today = new Date();
        const nextMonthFirst = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const billingStartDate = `${nextMonthFirst.getFullYear()}-${String(nextMonthFirst.getMonth() + 1).padStart(2, '0')}-01`;

        // DB에 프로필 정보 저장
        const { error: dbError } = await supabase.from('company_profile').insert([{
          company_id: userId,
          company_name: companyName,
          business_number: bizRegNumber,
          representative_name: ownerName,
          representative_birth: ownerBirthDate,
          email: email,
          biz_reg_image: fileName,
          subscription_plan: subscriptionPlan, 
          is_approved: false,
          billing_start_date: billingStartDate // 과금 시작일 세팅
        }]);
        
        if (dbError) throw new Error(`업체 정보 저장 실패: ${dbError.message}`);

        alert('🎉 가입 신청이 완료되었습니다!\n관리자 승인 후 정식으로 이용하실 수 있습니다.');
        if (isMountedRef.current) setIsLogin(true);

      } catch (postError) {
        // 2. 고아 데이터 발생 방지 및 명확한 안내 (클라이언트 롤백 대체)
        console.error("가입 후속 처리 오류:", postError);
        alert(`계정은 생성되었으나 추가 정보 저장 중 오류가 발생했습니다.\n번거로우시겠지만 관리자에게 문의해 주세요.\n(사유: ${postError.message})`);
        await supabase.auth.signOut(); // 비정상 상태이므로 강제 로그아웃 처리
      }

    } catch (error) {
      alert(translateAuthError(error)); // 한국어 에러 메시지 출력
    } finally {
      clearTimeout(timeoutId);
      if (isMountedRef.current) setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);

    // 무한 스피너 방지용 안전장치 (10초 후 강제 해제)
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) setLoading(false);
    }, 10000);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });
      if (authError) throw authError;

      const userId = authData.user.id;

      // 최고 관리자 여부 확인
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      // 최고 관리자가 아닌 일반 업체인 경우 승인 여부 확인
      if (!adminData) {
        const { data: companyData, error: companyError } = await supabase
          .from('company_profile')
          .select('is_approved')
          .eq('company_id', userId)
          .maybeSingle();

        if (companyError) throw new Error(`업체 정보를 불러올 수 없습니다. (${companyError.message})`);

        if (companyData && companyData.is_approved === false) {
          await supabase.auth.signOut(); // 미승인 유저는 강제 로그아웃
          throw new Error('⏳ 가입 승인 대기 중입니다.\n관리자가 정보를 확인하고 승인한 후에 로그인하실 수 있습니다.');
        }
      }
    } catch (error) {
      alert(translateAuthError(error)); // 한국어 에러 메시지 출력
    } finally {
      clearTimeout(timeoutId);
      // 로그인이 성공하면 App.js의 라우터가 먼저 화면을 엎어버리므로 isMounted 검사가 필수입니다.
      if (isMountedRef.current) setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] flex items-center justify-center p-4 md:p-6 font-sans overflow-hidden relative">
      
      {/* 💡 약관 및 개인정보 처리방침 모달 */}
      {activeModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
            <div className="bg-gray-50 border-b border-gray-100 p-5 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                {activeModal === 'terms' ? <FileText size={20} className="text-blue-600"/> : <ShieldCheck size={20} className="text-blue-600"/>}
                {activeModal === 'terms' ? '이용약관' : '개인정보 처리방침'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <X size={20} />
              </button>
            </div>
            {/* 스크롤 가능한 텍스트 영역 */}
            <div className="p-6 overflow-y-auto custom-scrollbar whitespace-pre-wrap text-sm text-gray-600 leading-relaxed font-medium bg-white">
              {activeModal === 'terms' ? termsText : privacyText}
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 shrink-0">
              <button 
                onClick={() => {
                  setAgreements(prev => ({ ...prev, [activeModal]: true })); // 확인 시 자동 동의 체크
                  setActiveModal(null);
                }} 
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-black shadow-md hover:bg-blue-700 transition-colors"
              >
                확인 및 동의하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 요금제 상세 설명 팝업 모달 */}
      {selectedPlanInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-blue-50 border-b border-blue-100 p-5 flex items-center justify-between">
              <h3 className="text-lg font-black text-blue-700 flex items-center gap-2">
                <Award size={18} /> {selectedPlanInfo.name} 플랜 안내
              </h3>
              <button onClick={() => setSelectedPlanInfo(null)} className="text-blue-400 hover:text-blue-700 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-end gap-1 mb-2">
                <span className="text-2xl font-black text-gray-900">{selectedPlanInfo.price}</span>
                {selectedPlanInfo.id !== 'enterprise' && <span className="text-xs font-bold text-gray-400 mb-1">/ 월 기본</span>}
              </div>
              <p className="text-sm font-bold text-gray-600 leading-relaxed break-keep">
                {selectedPlanInfo.desc}
              </p>
              <button onClick={() => setSelectedPlanInfo(null)} className="w-full py-3 mt-4 bg-blue-600 text-white rounded-xl font-black shadow-md hover:bg-blue-700 transition-colors">
                확인 및 선택 완료
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-[1000px] bg-white rounded-3xl md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-500 max-h-[95dvh] md:max-h-[90vh]">
        <div className="w-full md:w-[40%] bg-blue-600 p-6 md:p-12 text-white flex flex-row md:flex-col justify-between items-center md:items-start shrink-0">
          <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-0 w-full">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-xl md:rounded-2xl flex items-center justify-center md:mb-8 backdrop-blur-md shrink-0">
              <Building2 size={24} className="md:w-7 md:h-7" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-black tracking-tighter leading-tight md:mb-4">
                AidBill<span className="hidden md:inline"><br /></span><span className="md:hidden"> </span>Partner Portal
              </h1>
              <p className="hidden md:block text-blue-100 text-sm font-bold opacity-80 leading-relaxed">
                장애인 보조기기 교부 업체를 위한<br />통합 청구 및 관리 시스템입니다.
              </p>
            </div>
          </div>
          <div className="hidden md:block space-y-3 w-full">
            <div className="flex items-center gap-3 text-[11px] font-black bg-white/10 p-4 rounded-2xl border border-white/5 uppercase tracking-widest w-fit">
              <CheckCircle2 size={16} className="text-blue-300" /> Secure Admin Access
            </div>
          </div>
        </div>

        <div className="w-full md:w-[60%] p-6 md:p-12 lg:p-16 overflow-y-auto custom-scrollbar flex-1">
          <div className="flex bg-gray-100 p-1 rounded-xl md:rounded-2xl mb-6 md:mb-10 shrink-0">
            <button type="button" onClick={() => setIsLogin(true)} className={`flex-1 py-2.5 md:py-3 rounded-lg md:rounded-xl text-sm font-black transition-all ${isLogin ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>로그인</button>
            <button type="button" onClick={() => setIsLogin(false)} className={`flex-1 py-2.5 md:py-3 rounded-lg md:rounded-xl text-sm font-black transition-all ${!isLogin ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>회원가입</button>
          </div>

          {isLogin ? (
            <div className="space-y-5 md:space-y-6 flex flex-col h-full justify-center">
              <div className="space-y-1">
                <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">반가워요!</h2>
                <p className="text-xs md:text-sm text-gray-400 font-bold">등록된 계정으로 로그인하세요.</p>
              </div>
              <div className="space-y-3 pt-2 md:pt-4">
                <input name="email" type="email" placeholder="이메일 주소" className="w-full bg-gray-50 p-4 md:p-5 rounded-xl md:rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-600 text-sm md:text-base transition-all" onChange={handleInputChange} />
                <input name="password" type="password" placeholder="비밀번호" className="w-full bg-gray-50 p-4 md:p-5 rounded-xl md:rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-600 text-sm md:text-base transition-all" onChange={handleInputChange} />
              </div>
              <button onClick={handleLogin} disabled={loading} className="w-full py-4 md:py-5 mt-2 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black shadow-xl shadow-blue-200 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70">
                {loading ? <Loader2 className="animate-spin" /> : <>서비스 시작하기 <ArrowRight size={18} className="md:w-5 md:h-5"/></>}
              </button>
            </div>
          ) : (
            <div className="space-y-4 md:space-y-5">
              <div className="space-y-1">
                <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">신규 가입</h2>
                <p className="text-xs md:text-sm text-gray-400 font-bold">정확한 업체 정보를 입력해 주세요.</p>
              </div>
              <div className="grid grid-cols-1 gap-2.5 md:gap-3 pt-2">
                <input name="companyName" placeholder="업체명" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-600 text-sm transition-all" onChange={handleInputChange} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3">
                  <input name="bizRegNumber" placeholder="사업자등록번호" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-600 text-sm transition-all" onChange={handleInputChange} />
                  <input name="ownerName" placeholder="대표자 성함" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-600 text-sm transition-all" onChange={handleInputChange} />
                </div>
                
                <div className="w-full space-y-1.5">
                  <div className="text-[11px] md:text-xs font-bold text-gray-400 pl-1">대표자 생년월일</div>
                  <input name="ownerBirthDate" type="date" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-600 text-sm transition-all" onChange={handleInputChange} />
                </div>
                
                <input name="email" type="email" placeholder="아이디(이메일)" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-600 text-sm transition-all" onChange={handleInputChange} />
                <input name="password" type="password" placeholder="비밀번호 설정" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-600 text-sm transition-all" onChange={handleInputChange} />
                
                {/* 요금제 선택 영역 */}
                <div className="w-full space-y-2 mt-2">
                  <div className="text-[11px] md:text-xs font-bold text-gray-400 pl-1 flex items-center gap-1">
                    <Award size={14} className="text-blue-500" /> 구독 플랜 선택 <span className="font-normal">(클릭하여 상세 확인)</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {SUBSCRIPTION_PLANS.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => handlePlanClick(plan)} 
                        className={`p-3 border-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                          formData.subscriptionPlan === plan.id 
                            ? 'border-blue-600 bg-blue-50/50 text-blue-600 shadow-sm scale-[1.02]' 
                            : 'border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <span className="text-xs font-black">{plan.name}</span>
                        <span className="text-[10px] font-bold opacity-80">{plan.price}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-1 md:mt-2">
                  <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => setFormData({...formData, bizLicense: e.target.files[0]})} />
                  <button type="button" onClick={() => fileInputRef.current.click()} className={`w-full p-4 md:p-6 border-2 border-dashed rounded-xl md:rounded-2xl flex flex-col items-center gap-1.5 md:gap-2 transition-all ${formData.bizLicense ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100'}`}>
                    <Upload size={18} className="md:w-5 md:h-5" />
                    <span className="text-[11px] md:text-xs font-black">{formData.bizLicense ? formData.bizLicense.name : '사업자등록증 첨부 (필수)'}</span>
                  </button>
                </div>

                {/* 💡 이용약관 및 개인정보 동의 영역 */}
                <div className="w-full mt-2 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <label className="flex items-center gap-2 text-sm font-black text-gray-800 cursor-pointer mb-3 pb-3 border-b border-gray-100">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      checked={agreements.terms && agreements.privacy}
                      onChange={handleAllAgree}
                    />
                    <span>전체 필수 약관에 동의합니다</span>
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          checked={agreements.terms}
                          onChange={(e) => setAgreements(prev => ({ ...prev, terms: e.target.checked }))}
                        />
                        <span>[필수] 이용약관 동의</span>
                      </label>
                      <button type="button" onClick={() => setActiveModal('terms')} className="text-[11px] text-gray-400 hover:text-blue-600 font-bold underline underline-offset-2">내용보기</button>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          checked={agreements.privacy}
                          onChange={(e) => setAgreements(prev => ({ ...prev, privacy: e.target.checked }))}
                        />
                        <span>[필수] 개인정보 처리방침 동의</span>
                      </label>
                      <button type="button" onClick={() => setActiveModal('privacy')} className="text-[11px] text-gray-400 hover:text-blue-600 font-bold underline underline-offset-2">내용보기</button>
                    </div>
                  </div>
                </div>

              </div>
              <button onClick={handleSignUp} disabled={loading} className="w-full py-4 md:py-5 mt-4 bg-gray-900 text-white rounded-xl md:rounded-2xl font-black shadow-xl hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70">
                {loading ? <Loader2 className="animate-spin mx-auto" /> : '회원가입 신청하기'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}