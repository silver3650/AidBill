import { useState, useEffect, useRef } from 'react';
import { 
  Building, MapPin, Image as ImageIcon, Save, 
  Upload, CheckCircle, Search, FileText, Stamp, CreditCard, Clock
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function CompanyProfile() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: 1, // 단일 업체 정보 관리를 위해 고정 ID 사용
    company_name: '',
    business_number: '', // DB 컬럼명과 일치
    biz_type: '',        // 👈 추가됨: 업태
    biz_item: '',        // 👈 추가됨: 종목
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

  // 카카오 우편번호 API 스크립트 로드
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.body.appendChild(script);
    
    fetchCompanyData();

    return () => { document.body.removeChild(script); };
  }, []);

  async function fetchCompanyData() {
    const { data, error } = await supabase.from('company_profile').select('*').eq('id', 1).single();
    if (data) {
      setFormData({ ...formData, ...data });
    }
  }

  // --- 카카오 주소 검색 ---
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

  // --- 이미지 업로드 미리보기 처리 ---
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

  // --- 저장 로직 ---
  async function handleSave() {
    setIsLoading(true);
    const { error } = await supabase.from('company_profile').upsert([formData]);
    
    setIsLoading(false);
    if (error) {
      alert('저장 실패: ' + error.message);
    } else {
      alert('업체 정보가 성공적으로 저장되었습니다. (이 정보는 청구 서류 및 이메일 발송에 자동 입력됩니다.)');
      fetchCompanyData();
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* --- 상단 헤더 --- */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">업체 정보</h1>
          <p className="text-gray-500 mt-2 font-medium">청구서 및 필수 제출 서류에 자동 입력될 자사의 정보를 관리합니다.</p>
        </div>
        <button 
          onClick={handleSave} disabled={isLoading}
          className="bg-blue-600 text-white px-8 py-4 rounded-[1.5rem] font-black shadow-xl shadow-blue-200 flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50"
        >
          {isLoading ? <Clock className="animate-spin" size={22} /> : <Save size={22} />} 
          {isLoading ? '저장 중...' : '정보 저장하기'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --- 좌측: 텍스트 정보 입력 --- */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 1. 기본 정보 */}
          <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/10 space-y-6">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-8">
              <Building className="text-blue-600" size={22} /> 기본 정보
            </h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-extrabold text-gray-800 ml-1">상호명</label>
                <input 
                  type="text" className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-600 transition-all border-none"
                  placeholder="예: 주식회사 에이드빌"
                  value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-extrabold text-gray-800 ml-1">사업자 등록번호</label>
                <input 
                  type="text" className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-600 transition-all border-none"
                  placeholder="000-00-00000"
                  value={formData.business_number} onChange={e => setFormData({...formData, business_number: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-extrabold text-gray-800 ml-1">대표자명</label>
                <input 
                  type="text" className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-600 transition-all border-none"
                  value={formData.representative_name} onChange={e => setFormData({...formData, representative_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-extrabold text-gray-800 ml-1">대표자 생년월일</label>
                <input 
                  type="date" className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-600 transition-all border-none"
                  value={formData.representative_birth} onChange={e => setFormData({...formData, representative_birth: e.target.value})}
                />
              </div>
              
              {/* 🚨 새로 추가된 업태/종목 필드 */}
              <div className="space-y-2">
                <label className="text-sm font-extrabold text-gray-800 ml-1">업태</label>
                <input 
                  type="text" className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-600 transition-all border-none"
                  placeholder="예: 도소매"
                  value={formData.biz_type} onChange={e => setFormData({...formData, biz_type: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-extrabold text-gray-800 ml-1">종목</label>
                <input 
                  type="text" className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-600 transition-all border-none"
                  placeholder="예: 의료기기"
                  value={formData.biz_item} onChange={e => setFormData({...formData, biz_item: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-extrabold text-gray-800 ml-1">회사 연락처</label>
                <input 
                  type="text" className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-600 transition-all border-none"
                  placeholder="02-000-0000"
                  value={formData.contact_number} onChange={e => setFormData({...formData, contact_number: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-extrabold text-gray-800 ml-1">이메일 주소</label>
                <input 
                  type="email" className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-600 transition-all border-none"
                  placeholder="admin@careplus.com"
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* 2. 주소 정보 (카카오 우편번호 연동) */}
          <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/10 space-y-6">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-8">
              <MapPin className="text-blue-600" size={22} /> 사업장 주소
            </h3>
            
            <div className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="space-y-2 w-48">
                  <label className="text-sm font-extrabold text-gray-800 ml-1">우편번호</label>
                  <input 
                    type="text" readOnly className="w-full bg-gray-100 p-4 rounded-2xl outline-none font-black text-gray-600 border-none cursor-not-allowed"
                    placeholder="우편번호" value={formData.zip_code}
                  />
                </div>
                <button 
                  onClick={handleAddressSearch}
                  className="bg-gray-800 text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-black transition-all"
                >
                  <Search size={18} /> 주소 검색
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-extrabold text-gray-800 ml-1">기본 주소</label>
                <input 
                  type="text" readOnly className="w-full bg-gray-100 p-4 rounded-2xl outline-none font-black text-gray-600 border-none cursor-not-allowed"
                  placeholder="주소 검색을 이용해 주세요." value={formData.address}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-extrabold text-gray-800 ml-1">상세 주소</label>
                <input 
                  type="text" className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-600 transition-all border-none"
                  placeholder="나머지 상세 주소를 입력해 주세요."
                  value={formData.detail_address} onChange={e => setFormData({...formData, detail_address: e.target.value})}
                />
              </div>
            </div>
          </div>

        </div>

        {/* --- 우측: 증빙 이미지 첨부 --- */}
        <div className="space-y-8">
          <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/10 space-y-6 h-full">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-8">
              <ImageIcon className="text-blue-600" size={22} /> 첨부 이미지
            </h3>
            <p className="text-xs font-bold text-gray-400 mb-6 leading-relaxed">
              등록된 이미지는 청구서 및 관련 서류 자동 생성 시 해당 영역에 자동으로 삽입됩니다.
            </p>

            <div className="space-y-6">
              <ImageUploadBox 
                title="회사 직인 (도장)" icon={<Stamp size={24}/>} 
                image={formData.seal_image} 
                onChange={(e) => handleImageUpload(e, 'seal_image')} 
              />
              <ImageUploadBox 
                title="사업자 등록증 사본" icon={<FileText size={24}/>} 
                image={formData.biz_reg_image} 
                onChange={(e) => handleImageUpload(e, 'biz_reg_image')} 
              />
              <ImageUploadBox 
                title="통장 사본" icon={<CreditCard size={24}/>} 
                image={formData.bankbook_image} 
                onChange={(e) => handleImageUpload(e, 'bankbook_image')} 
              />
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 보조 컴포넌트: 이미지 업로드 박스 ---
function ImageUploadBox({ title, icon, image, onChange }) {
  const fileInputRef = useRef(null);

  return (
    <div className="space-y-2">
      <label className="text-sm font-extrabold text-gray-800 ml-1">{title}</label>
      <div 
        onClick={() => fileInputRef.current.click()}
        className={`relative w-full h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group
          ${image ? 'border-blue-200 bg-white' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-blue-400'}
        `}
      >
        <input 
          type="file" accept="image/*" className="hidden" 
          ref={fileInputRef} onChange={onChange} 
        />
        
        {image ? (
          <>
            <img src={image} alt={title} className="w-full h-full object-contain p-2" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
              <span className="text-white font-black text-sm flex items-center gap-2"><Upload size={16}/> 변경하기</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center text-gray-400 group-hover:text-blue-500 transition-all">
            {icon}
            <span className="text-xs font-bold mt-2">클릭하여 이미지 업로드</span>
          </div>
        )}
      </div>
      {image && <p className="text-[10px] text-blue-600 font-bold text-right flex items-center justify-end gap-1"><CheckCircle size={10}/> 등록 완료</p>}
    </div>
  );
}