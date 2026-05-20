import { useState, useRef } from 'react';
import { 
  Building2, User, Calendar, Lock, Mail, 
  Upload, ArrowRight, CheckCircle2, Loader2 
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    companyName: '', bizRegNumber: '', ownerName: '',
    ownerBirthDate: '', email: '', password: '', bizLicense: null
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 회원가입 로직
  const handleSignUp = async () => {
    const { companyName, bizRegNumber, ownerName, ownerBirthDate, email, password, bizLicense } = formData;
    if (!bizLicense) return alert('사업자등록증 파일을 반드시 첨부해 주세요.');
    
    setLoading(true);
    try {
      // 1. Supabase Auth 계정 생성
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;

      // 2. 사업자등록증 Storage 업로드
      const fileExt = bizLicense.name.split('.').pop();
      const fileName = `${authData.user.id}/license.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('biz-licenses')
        .upload(fileName, bizLicense);
      if (uploadError) throw uploadError;

      // 3. 업체 상세 정보 DB 저장 (companies 테이블)
      const { error: dbError } = await supabase.from('companies').insert([{
        id: authData.user.id,
        company_name: companyName,
        biz_reg_number: bizRegNumber,
        owner_name: ownerName,
        owner_birth_date: ownerBirthDate,
        email: email,
        biz_license_url: fileName
      }]);
      if (dbError) throw dbError;

      alert('가입 신청이 완료되었습니다! 관리자 승인 후 이용 가능합니다.');
      setIsLogin(true);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 로그인 로직
  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password
    });
    if (error) alert('로그인 실패: ' + error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] flex items-center justify-center p-4 md:p-6 font-sans overflow-hidden">
      {/* 카드 래퍼 - 모바일에서는 화면을 거의 꽉 채우도록 여백과 둥근 모서리 최적화 */}
      <div className="w-full max-w-[1000px] bg-white rounded-3xl md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-500 max-h-[95dvh] md:max-h-[90vh]">
        
        {/* 왼쪽 섹션 (브랜드) - 모바일에서는 가로형 미니 헤더로 압축 */}
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
          {/* PC에서만 하단 보안 뱃지 표시 */}
          <div className="hidden md:block space-y-3 w-full">
            <div className="flex items-center gap-3 text-[11px] font-black bg-white/10 p-4 rounded-2xl border border-white/5 uppercase tracking-widest w-fit">
              <CheckCircle2 size={16} className="text-blue-300" /> Secure Admin Access
            </div>
          </div>
        </div>

        {/* 오른쪽 섹션 (폼) - 모바일 스크롤 가능하도록 설정 */}
        <div className="w-full md:w-[60%] p-6 md:p-12 lg:p-16 overflow-y-auto custom-scrollbar flex-1">
          {/* 탭 버튼 */}
          <div className="flex bg-gray-100 p-1 rounded-xl md:rounded-2xl mb-6 md:mb-10 shrink-0">
            <button 
              onClick={() => setIsLogin(true)} 
              className={`flex-1 py-2.5 md:py-3 rounded-lg md:rounded-xl text-sm font-black transition-all ${isLogin ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              로그인
            </button>
            <button 
              onClick={() => setIsLogin(false)} 
              className={`flex-1 py-2.5 md:py-3 rounded-lg md:rounded-xl text-sm font-black transition-all ${!isLogin ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              회원가입
            </button>
          </div>

          {isLogin ? (
            <div className="space-y-5 md:space-y-6 flex flex-col h-full justify-center">
              <div className="space-y-1">
                <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">반가워요!</h2>
                <p className="text-xs md:text-sm text-gray-400 font-bold">등록된 계정으로 로그인하세요.</p>
              </div>
              <div className="space-y-3 pt-2 md:pt-4">
                <input 
                  name="email" type="email" placeholder="이메일 주소" 
                  className="w-full bg-gray-50 p-4 md:p-5 rounded-xl md:rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-600 text-sm md:text-base transition-all" 
                  onChange={handleInputChange}
                />
                <input 
                  name="password" type="password" placeholder="비밀번호" 
                  className="w-full bg-gray-50 p-4 md:p-5 rounded-xl md:rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-600 text-sm md:text-base transition-all" 
                  onChange={handleInputChange}
                />
              </div>
              <button 
                onClick={handleLogin} disabled={loading} 
                className="w-full py-4 md:py-5 mt-2 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black shadow-xl shadow-blue-200 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70"
              >
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
                <input 
                  name="companyName" placeholder="업체명" 
                  className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-600 text-sm transition-all" 
                  onChange={handleInputChange}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3">
                  <input 
                    name="bizRegNumber" placeholder="사업자등록번호" 
                    className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-600 text-sm transition-all" 
                    onChange={handleInputChange}
                  />
                  <input 
                    name="ownerName" placeholder="대표자 성함" 
                    className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-600 text-sm transition-all" 
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="w-full space-y-1.5">
                  <div className="text-[11px] md:text-xs font-bold text-gray-400 pl-1">대표자 생년월일</div>
                  <input 
                    name="ownerBirthDate" type="date" 
                    className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-600 text-sm transition-all" 
                    onChange={handleInputChange}
                  />
                </div>
                
                <input 
                  name="email" type="email" placeholder="아이디(이메일)" 
                  className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-600 text-sm transition-all" 
                  onChange={handleInputChange}
                />
                <input 
                  name="password" type="password" placeholder="비밀번호 설정" 
                  className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-600 text-sm transition-all" 
                  onChange={handleInputChange}
                />
                
                <div className="mt-1 md:mt-2">
                  <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => setFormData({...formData, bizLicense: e.target.files[0]})} />
                  <button 
                    onClick={() => fileInputRef.current.click()} 
                    className={`w-full p-4 md:p-6 border-2 border-dashed rounded-xl md:rounded-2xl flex flex-col items-center gap-1.5 md:gap-2 transition-all ${formData.bizLicense ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100'}`}
                  >
                    <Upload size={18} className="md:w-5 md:h-5" />
                    <span className="text-[11px] md:text-xs font-black">{formData.bizLicense ? formData.bizLicense.name : '사업자등록증 첨부 (필수)'}</span>
                  </button>
                </div>
              </div>
              <button 
                onClick={handleSignUp} disabled={loading} 
                className="w-full py-4 md:py-5 mt-2 bg-gray-900 text-white rounded-xl md:rounded-2xl font-black shadow-xl hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70"
              >
                {loading ? <Loader2 className="animate-spin mx-auto" /> : '회원가입 신청하기'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}