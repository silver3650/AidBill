import { useState, useEffect, useRef } from 'react';
import { 
  Building, MapPin, Image as ImageIcon, Save, 
  Upload, Clock, Search, FileText, Stamp, CreditCard, Plus, Trash2
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const DOC_TYPES = [
  '의료기기 판매업 신고증',
  '의료기기 수리업 신고증',
  '의지·보조기 제조·수리업 신고증'
];

export default function CompanyProfile() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '', business_number: '', biz_type: '', biz_item: '',
    representative_name: '', representative_birth: '', contact_number: '',
    email: '', zip_code: '', address: '', detail_address: '',
    // 💡 실제 DB 컬럼에 맞게 bank_name 으로 복구
    bank_name: '', account_number: '', account_holder: '',
    seal_image: null, biz_reg_image: null, bankbook_image: null,
    qualifying_docs: [] 
  });

  useEffect(() => {
    let isMounted = true;
    const script = document.createElement('script');
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.body.appendChild(script);
    
    async function fetchCompanyData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        
        const { data } = await supabase.from('company_profile').select('*').eq('company_id', session.user.id).maybeSingle();
        
        if (data && isMounted) {
          setFormData(prev => ({ 
            ...prev, 
            ...data, 
            qualifying_docs: data.qualifying_docs || prev.qualifying_docs 
          }));
        }
      } catch(e) {
        console.error("데이터 로딩 오류:", e);
      }
    }
    
    fetchCompanyData();
    
    return () => { 
      isMounted = false;
      document.body.removeChild(script); 
    };
  }, []);

  const handleAddressSearch = () => {
    if (!window.daum || !window.daum.Postcode) return alert('주소 검색 서비스를 불러오는 중입니다.');
    new window.daum.Postcode({
      oncomplete: function(data) {
        setFormData(prev => ({ ...prev, zip_code: data.zonecode, address: data.address }));
      }
    }).open();
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; 
          let scaleSize = 1;
          if (img.width > MAX_WIDTH) {
            scaleSize = MAX_WIDTH / img.width;
          }
          canvas.width = img.width * scaleSize;
          canvas.height = img.height * scaleSize;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = (err) => reject(err);
      };
    });
  };

  const handleImageUpload = async (e, field, index = null) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const compressedBase64 = await compressImage(file);

      if (index !== null) {
        setFormData(prev => {
          const newDocs = [...prev.qualifying_docs];
          newDocs[index] = { ...newDocs[index], image: compressedBase64 };
          return { ...prev, qualifying_docs: newDocs };
        });
      } else {
        setFormData(prev => ({ ...prev, [field]: compressedBase64 }));
      }
    } catch (err) {
      alert('이미지 처리 중 오류가 발생했습니다.');
    }
  };

  const addQualifyingDoc = () => {
    setFormData(prev => ({
      ...prev,
      qualifying_docs: [...prev.qualifying_docs, { type: DOC_TYPES[0], image: null }]
    }));
  };

  const removeQualifyingDoc = (index) => {
    setFormData(prev => ({
      ...prev,
      qualifying_docs: prev.qualifying_docs.filter((_, i) => i !== index)
    }));
  };

  async function handleSave() {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        throw new Error('로그인 세션이 만료되었습니다. 새로고침 후 다시 시도해주세요.');
      }

      const payload = { ...formData, company_id: session.user.id };

      const { error } = await supabase
        .from('company_profile')
        .upsert(payload, { onConflict: 'company_id' });
      
      if (error) throw error; 

      alert('업체 정보가 성공적으로 저장되었습니다.');
      
      const { data } = await supabase.from('company_profile').select('*').eq('company_id', session.user.id).maybeSingle();
      if (data) {
        setFormData(prev => ({ 
          ...prev, 
          ...data, 
          qualifying_docs: data.qualifying_docs || prev.qualifying_docs 
        }));
      }
    } catch (error) {
      console.error("저장 오류 상세:", error);
      alert(`저장 실패: ${error.message || '서버 에러'}\n(F12를 눌러 콘솔 창의 빨간색 에러 메시지를 확인해 주세요)`);
    } finally {
      setIsLoading(false);
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
          {isLoading ? '저장 중 (이미지 용량에 따라 수 초 소요)...' : '정보 저장하기'}
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
              <CreditCard className="text-blue-600" size={20} /> 정산 계좌 정보
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">금융기관(은행명)</label>
                {/* 💡 bank_name 으로 복구 */}
                <input type="text" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl border-none outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-600 transition-all text-sm md:text-base" placeholder="예: 기업은행" value={formData.bank_name || ''} onChange={e => setFormData({...formData, bank_name: e.target.value})} />
              </div>
              <div className="space-y-1.5 md:space-y-2 md:col-span-1">
                <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">예금주</label>
                <input type="text" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl border-none outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-600 transition-all text-sm md:text-base" placeholder="예금주명" value={formData.account_holder || ''} onChange={e => setFormData({...formData, account_holder: e.target.value})} />
              </div>
              <div className="space-y-1.5 md:space-y-2 md:col-span-3">
                <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">계좌번호</label>
                <input type="text" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl border-none outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-600 transition-all text-sm md:text-base" placeholder="계좌번호 ( - 제외)" value={formData.account_number || ''} onChange={e => setFormData({...formData, account_number: e.target.value})} />
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

            <div className="pt-6 border-t border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <label className="text-sm font-extrabold text-gray-800 ml-1 flex items-center gap-1.5">
                  <FileText size={16} className="text-blue-600"/> 업체 자격 서류
                </label>
                <button 
                  onClick={addQualifyingDoc} 
                  className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition-colors"
                >
                  <Plus size={14}/> 서류 추가
                </button>
              </div>
              
              <div className="space-y-4">
                {formData.qualifying_docs.map((doc, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3 relative group transition-all">
                    <div className="flex gap-2">
                      <select 
                        className="flex-1 bg-white p-3 rounded-xl border border-gray-200 outline-none font-bold text-xs md:text-sm text-gray-700 focus:ring-2 focus:ring-blue-600 transition-all"
                        value={doc.type}
                        onChange={(e) => {
                          const newDocs = [...formData.qualifying_docs];
                          newDocs[index] = { ...newDocs[index], type: e.target.value };
                          setFormData({ ...formData, qualifying_docs: newDocs });
                        }}
                      >
                        {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <button 
                        onClick={() => removeQualifyingDoc(index)} 
                        className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shrink-0"
                        title="서류 삭제"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <DynamicImageUploadBox 
                      image={doc.image} 
                      onChange={(e) => handleImageUpload(e, null, index)} 
                      id={`doc-file-${index}`}
                    />
                  </div>
                ))}
                
                {formData.qualifying_docs.length === 0 && (
                  <div className="text-center py-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <p className="text-xs font-bold text-gray-400">등록된 자격 서류가 없습니다.</p>
                  </div>
                )}
              </div>
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

function DynamicImageUploadBox({ image, onChange, id }) {
  return (
    <div 
      onClick={() => document.getElementById(id).click()} 
      className={`relative w-full h-24 md:h-32 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden group ${image ? 'border-blue-200 bg-white' : 'border-gray-300 bg-white hover:bg-gray-50 hover:border-blue-400'}`}
    >
      <input type="file" id={id} accept="image/*" className="hidden" onChange={onChange} />
      {image ? (
        <>
          <img src={image} alt="자격 서류" className="w-full h-full object-contain p-1" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
            <span className="text-white font-black text-xs flex items-center gap-1"><Upload size={14}/> 이미지 변경</span>
          </div>
        </>
      ) : (
        <span className="text-xs font-bold text-gray-400 flex items-center gap-1 group-hover:text-blue-500">
          <Upload size={14}/> 이미지 업로드
        </span>
      )}
    </div>
  );
}