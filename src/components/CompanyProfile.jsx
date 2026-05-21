import { useState, useEffect, useRef } from 'react';
import { 
  Building, MapPin, Image as ImageIcon, Save, 
  Upload, CheckCircle, Search, FileText, Stamp, CreditCard, Clock
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function CompanyProfile() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    business_number: '',
    biz_type: '',
    biz_item: '',
    representative_name: '',
    representative_birth: '',
    contact_number: '',
    email: '', 
    zip_code: '',
    address: '',
    detail_address: '',
    seal_image: null,
    biz_reg_image: null,
    bankbook_image: null
  });

  useEffect(() => {
    const script = document.createElement('script');
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.body.appendChild(script);
    
    fetchCompanyData();

    return () => { document.body.removeChild(script); };
  }, []);

  async function fetchCompanyData() {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return;

    // 💡 로그인한 업체의 company_id와 일치하는 프로필을 조회
    const { data } = await supabase
      .from('company_profile')
      .select('*')
      .eq('company_id', user.id)
      .single();
      
    if (data) {
      setFormData(data);
    }
  }

  const handleAddressSearch = () => {
    if (!window.daum || !window.daum.Postcode) return alert('주소 검색 서비스를 불러오는 중입니다.');
    
    new window.daum.Postcode({
      oncomplete: function(data) {
        setFormData(prev => ({
          ...prev,
          zip_code: data.zonecode,
          address: data.address
        }));
      }
    }).open();
  };

  const handleImageUpload = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  async function handleSave() {
    setIsLoading(true);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      alert('로그인 세션이 만료되었습니다.');
      setIsLoading(false);
      return;
    }

    // 💡 company_id를 항상 payload에 포함
    const payload = { 
      ...formData, 
      company_id: user.id 
    };

    // 💡 upsert를 사용하되, 기존 데이터가 있으면 업데이트, 없으면 생성
    const { error } = await supabase
      .from('company_profile')
      .upsert(payload, { onConflict: 'company_id' });
    
    setIsLoading(false);
    if (error) {
      alert('저장 실패: ' + error.message);
    } else {
      alert('업체 정보가 성공적으로 저장되었습니다.');
      fetchCompanyData();
    }
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-20 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter">업체 정보</h1>
          <p className="text-sm md:text-base text-gray-500 mt-2 font-medium">청구서 및 필수 제출 서류에 자동 입력될 자사의 정보를 관리합니다.</p>
        </div>
        <button 
          onClick={handleSave} disabled={isLoading}
          className="w-full md:w-auto bg-blue-600 text-white px-6 md:px-8 py-3.5 md:py-4 rounded-2xl md:rounded-[1.5rem] font-black shadow-xl shadow-blue-200 flex items-center justify-center gap-2 hover:scale-105 transition-all disabled:opacity-50 shrink-0"
        >
          {isLoading ? <Clock className="animate-spin" size={20} /> : <Save size={20} />} 
          {isLoading ? '저장 중...' : '정보 저장하기'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/10 space-y-5 md:space-y-6">
            <h3 className="text-lg md:text-xl font-black text-gray-900 flex items-center gap-2 mb-4 md:mb-8">
              <Building className="text-blue-600" size={20} /> 기본 정보
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">상호명</label>
                <input type="text" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl border-none outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-600 transition-all text-sm md:text-base" placeholder="예: 주식회사 에이드빌" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} />
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">사업자 등록번호</label>
                <input type="text" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl border-none outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-600 transition-all text-sm md:text-base" placeholder="000-00-00000" value={formData.business_number} onChange={e => setFormData({...formData, business_number: e.target.value})} />
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">대표자명</label>
                <input type="text" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl border-none outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-600 transition-all text-sm md:text-base" placeholder="대표자명" value={formData.representative_name} onChange={e => setFormData({...formData, representative_name: e.target.value})} />
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">대표자 생년월일</label>
                <input type="date" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl border-none outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-600 transition-all text-sm md:text-base" value={formData.representative_birth} onChange={e => setFormData({...formData, representative_birth: e.target.value})} />
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">업태</label>
                <input type="text" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl border-none outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-600 transition-all text-sm md:text-base" placeholder="예: 도소매" value={formData.biz_type} onChange={e => setFormData({...formData, biz_type: e.target.value})} />
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">종목</label>
                <input type="text" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl border-none outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-600 transition-all text-sm md:text-base" placeholder="예: 의료기기" value={formData.biz_item} onChange={e => setFormData({...formData, biz_item: e.target.value})} />
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">회사 연락처</label>
                <input type="text" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl border-none outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-600 transition-all text-sm md:text-base" placeholder="02-000-0000" value={formData.contact_number} onChange={e => setFormData({...formData, contact_number: e.target.value})} />
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">이메일 주소</label>
                <input type="email" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl border-none outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-600 transition-all text-sm md:text-base" placeholder="admin@careplus.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/10 space-y-5 md:space-y-6">
            <h3 className="text-lg md:text-xl font-black text-gray-900 flex items-center gap-2 mb-4 md:mb-8">
              <MapPin className="text-blue-600" size={20} /> 사업장 주소
            </h3>
            <div className="space-y-4">
              <div className="flex gap-2 md:gap-4 items-end">
                <div className="space-y-1.5 md:space-y-2 flex-1 md:flex-none md:w-48">
                  <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">우편번호</label>
                  <input type="text" readOnly className="w-full bg-gray-100 p-3.5 md:p-4 rounded-xl md:rounded-2xl outline-none font-black text-gray-600 border-none cursor-not-allowed text-sm md:text-base" placeholder="우편번호" value={formData.zip_code} />
                </div>
                <button onClick={handleAddressSearch} className="bg-gray-800 text-white px-5 md:px-6 py-3.5 md:py-4 rounded-xl md:rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black transition-all text-sm md:text-base whitespace-nowrap">
                  <Search size={18} /> 주소 검색
                </button>
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">기본 주소</label>
                <input type="text" readOnly className="w-full bg-gray-100 p-3.5 md:p-4 rounded-xl md:rounded-2xl outline-none font-black text-gray-600 border-none cursor-not-allowed text-sm md:text-base" placeholder="주소 검색을 이용해 주세요." value={formData.address} />
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">상세 주소</label>
                <input type="text" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl border-none outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-600 transition-all text-sm md:text-base" placeholder="상세 주소를 입력하세요." value={formData.detail_address} onChange={e => setFormData({...formData, detail_address: e.target.value})} />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 md:space-y-8">
          <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/10 space-y-5 md:space-y-6 h-full">
            <h3 className="text-lg md:text-xl font-black text-gray-900 flex items-center gap-2 mb-2 md:mb-4">
              <ImageIcon className="text-blue-600" size={20} /> 첨부 이미지
            </h3>
            <p className="text-xs font-bold text-gray-400 mb-4 md:mb-6 leading-relaxed">등록된 이미지는 청구 서류 생성 시 자동으로 삽입됩니다.</p>
            <div className="space-y-6">
              <ImageUploadBox title="회사 직인 (도장)" icon={<Stamp size={24}/>} image={formData.seal_image} onChange={(e) => handleImageUpload(e, 'seal_image')} />
              <ImageUploadBox title="사업자 등록증 사본" icon={<FileText size={24}/>} image={formData.biz_reg_image} onChange={(e) => handleImageUpload(e, 'biz_reg_image')} />
              <ImageUploadBox title="통장 사본" icon={<CreditCard size={24}/>} image={formData.bankbook_image} onChange={(e) => handleImageUpload(e, 'bankbook_image')} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageUploadBox({ title, icon, image, onChange }) {
  const fileInputRef = useRef(null);
  return (
    <div className="space-y-1.5 md:space-y-2">
      <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">{title}</label>
      <div onClick={() => fileInputRef.current.click()} className={`relative w-full h-32 md:h-40 rounded-xl md:rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group ${image ? 'border-blue-200 bg-white' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-blue-400'}`}>
        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={onChange} />
        {image ? (
          <>
            <img src={image} alt={title} className="w-full h-full object-contain p-2" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
              <span className="text-white font-black text-xs md:text-sm flex items-center gap-1.5"><Upload size={16}/> 변경</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center text-gray-400 group-hover:text-blue-500 transition-all">
            <div className="md:scale-110 mb-1 md:mb-2">{icon}</div>
            <span className="text-[11px] md:text-xs font-bold mt-1 md:mt-2">클릭하여 이미지 업로드</span>
          </div>
        )}
      </div>
    </div>
  );
}