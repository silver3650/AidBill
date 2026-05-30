import { useState, useEffect, useRef } from 'react';
import { 
  Package, Plus, X, Search, Image as ImageIcon, 
  Edit3, Trash2, Upload, CheckCircle, Building2, Banknote, Clock, Info
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAutoSave } from '../hooks/useAutoSave'; // 💡 자동 저장 훅 임포트

const NHIS_CATEGORY_DATA = {
  '수동휠체어': { standard_price: 480000, lifespan: 5 },
  '전동휠체어': { standard_price: 2090000, lifespan: 6 },
  '전동스쿠터': { standard_price: 1670000, lifespan: 6 },
  '자세보조용구': { standard_price: 1500000, lifespan: 1 },
  '욕창예방방석': { standard_price: 250000, lifespan: 3 },
  '욕창예방매트리스': { standard_price: 400000, lifespan: 3 },
  '이동식전동리프트': { standard_price: 2500000, lifespan: 5 },
  '보청기': { standard_price: 1310000, lifespan: 5 },
  '맞춤형 교정용 신발': { standard_price: 250000, lifespan: 1 },
  '의지·보조기': { standard_price: 0, lifespan: 3 }, 
  '보행기': { standard_price: 250000, lifespan: 5 },
  '지팡이/목발': { standard_price: 0, lifespan: 2 },
  '기타 보조기기': { standard_price: 0, lifespan: 0 }
};

const NHIS_CATEGORIES = Object.keys(NHIS_CATEGORY_DATA);

// 공단(NHIS) 표준 카테고리인지 확인
const isStandardNHIS = (category) => NHIS_CATEGORIES.includes(category);

// 공단 기기 중 처방전 및 검수확인서 필요 여부 판별
const isPrescriptionRequired = (category, name) => {
  if (!isStandardNHIS(category)) return false; 
  const text = `${category || ''} ${name || ''}`.toLowerCase();
  const req = ['휠체어', '스쿠터', '보청기', '자세보조용구', '의지', '보조기', '교정용 신발', '이동식전동리프트'];
  return req.some(k => text.includes(k));
};

const isInspectionRequired = (category, name) => {
  if (!isStandardNHIS(category)) return false; 
  const text = `${category || ''} ${name || ''}`.toLowerCase();
  const exempt = ['지팡이', '목발', '보행차', '보행기', '전지', '배터리', '흰지팡이'];
  return !exempt.some(k => text.includes(k));
};

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 💡 모달 상태 및 폼 데이터를 useAutoSave로 관리하여 새로고침 시에도 유지
  const [isModalOpen, setIsModalOpen] = useAutoSave('devices_modal_open', false);
  const [searchTerm, setSearchTerm] = useAutoSave('devices_search_term', '');
  const [editingId, setEditingId] = useAutoSave('devices_editing_id', null);

  const [formData, setFormData, clearFormData] = useAutoSave('devices_form_data', {
    name: '',
    category: '',
    customCategory: '',
    standard_price: '', 
    price: '', 
    tax_type: '영세',
    manufacturer: '',
    lifespan: '',
    image: null
  });

  const fileInputRef = useRef(null);

  useEffect(() => { 
    fetchData(); 
    
    // 💡 탭으로 다시 돌아왔을 때 자동 갱신 방어벽 추가
    const handleFocus = () => fetchData();
    window.addEventListener('focus', handleFocus);
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchData();
      }
    });
    
    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      // 💡 서버 통신(getUser) 대신, 지연이 없는 getSession() 사용
      const { data: { session }, error: userError } = await supabase.auth.getSession();
      const user = session?.user;
      
      if (userError || !user) {
        setDevices([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('company_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDevices(data || []);
      
    } catch (error) {
      console.error("데이터 로드 에러:", error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCategoryChange = (e) => {
    const selectedCategory = e.target.value;
    const categoryInfo = NHIS_CATEGORY_DATA[selectedCategory];

    setFormData(prev => ({
      ...prev,
      category: selectedCategory,
      standard_price: categoryInfo ? categoryInfo.standard_price : prev.standard_price,
      lifespan: categoryInfo ? categoryInfo.lifespan : prev.lifespan
    }));
  };

  async function handleSave() {
    const finalCategory = formData.category === 'custom' ? formData.customCategory : formData.category;

    if (!formData.name || !finalCategory || !formData.price) {
      return alert('품목명, 카테고리, 고시금액(단가)은 필수 입력 항목입니다!');
    }

    try {
      // 💡 사용자 인증 확인 (getSession 교체)
      const { data: { session }, error: userError } = await supabase.auth.getSession();
      const user = session?.user;
      if (userError || !user) {
        alert('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
        return;
      }

      const payload = {
        name: formData.name,
        category: finalCategory,
        standard_price: Number(formData.standard_price) || 0,
        price: Number(formData.price),
        tax_type: formData.tax_type,
        manufacturer: formData.manufacturer,
        lifespan: formData.lifespan,
        image: formData.image,
        company_id: user.id
      };

      if (editingId) {
        const { error } = await supabase.from('devices').update(payload).eq('id', editingId);
        if (error) throw error;
        alert('성공적으로 수정되었습니다.');
      } else {
        const { error } = await supabase.from('devices').insert([payload]);
        if (error) throw error;
        alert('신규 품목이 등록되었습니다.');
      }
      
      closeModal();
      fetchData();
    } catch (error) {
      alert('저장 실패: ' + error.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('이 품목을 정말 삭제하시겠습니까?')) return;
    try {
      const { error } = await supabase.from('devices').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      alert('삭제 실패: ' + error.message);
    }
  }

  const openEditModal = (device) => {
    const isStandardCategory = NHIS_CATEGORIES.includes(device.category);
    setFormData({
      name: device.name,
      category: isStandardCategory ? device.category : 'custom',
      customCategory: isStandardCategory ? '' : device.category,
      standard_price: device.standard_price || '',
      price: device.price,
      tax_type: device.tax_type || '영세',
      manufacturer: device.manufacturer || '',
      lifespan: device.lifespan || '',
      image: device.image || null
    });
    setEditingId(device.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    clearFormData(); // 💡 닫을 때 폼 데이터 깔끔하게 초기화
  };

  const filteredDevices = devices.filter(d => 
    d.name.includes(searchTerm) || d.category.includes(searchTerm)
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter">보조기기 품목</h1>
          <p className="text-gray-500 mt-2 font-medium text-sm md:text-base">청구 가능한 장애인보조기기 단가 및 카테고리를 관리합니다.</p>
        </div>
        <button 
          onClick={() => { clearFormData(); setIsModalOpen(true); }} // 💡 열 때 폼 데이터 초기화
          className="w-full md:w-auto bg-indigo-600 text-white px-6 md:px-8 py-3.5 md:py-4 rounded-2xl md:rounded-[1.5rem] font-black shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 hover:scale-105 transition-all"
        >
          <Plus size={22} /> 품목 등록
        </button>
      </div>

      <div className="bg-white p-2 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-sm flex items-center group focus-within:border-indigo-200 transition-all">
        <Search className="ml-4 md:ml-6 text-gray-400 group-focus-within:text-indigo-600" size={20} />
        <input 
          type="text" placeholder="품목명 또는 카테고리로 검색하세요..." 
          className="w-full p-4 md:p-5 outline-none font-bold text-gray-900 bg-transparent text-sm md:text-base"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {filteredDevices.map((device) => (
          <div key={device.id} className="bg-white rounded-3xl md:rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/10 overflow-hidden group hover:border-indigo-200 transition-all flex flex-col">
            
            <div 
              onClick={() => openEditModal(device)}
              className="h-40 md:h-48 bg-gray-50 flex items-center justify-center relative overflow-hidden border-b border-gray-100 p-4 md:p-6 cursor-pointer"
            >
              {device.image ? (
                <img src={device.image} alt={device.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-all duration-500" />
              ) : (
                <ImageIcon size={40} className="text-gray-200 md:w-12 md:h-12" />
              )}
              
              <div className="absolute top-3 right-3 md:top-4 md:right-4 flex gap-1.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={(e) => { e.stopPropagation(); openEditModal(device); }} className="w-8 h-8 bg-white/90 border border-gray-200 md:border-transparent backdrop-blur rounded-lg flex items-center justify-center text-gray-600 hover:text-indigo-600 shadow-sm">
                  <Edit3 size={16}/>
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(device.id); }} className="w-8 h-8 bg-white/90 border border-gray-200 md:border-transparent backdrop-blur rounded-lg flex items-center justify-center text-gray-600 hover:text-red-500 shadow-sm">
                  <Trash2 size={16}/>
                </button>
              </div>
            </div>

            <div className="p-5 md:p-6 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-3 gap-2">
                <div className="flex flex-wrap gap-1 items-center">
                  <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg tracking-widest uppercase">
                    {device.category}
                  </span>
                  {/* 💡 공단(NHIS) 카테고리이면서 조건 충족 시에만 뱃지 표시 */}
                  {isPrescriptionRequired(device.category, device.name) && (
                    <span className="inline-block px-1.5 py-0.5 bg-rose-50 text-rose-500 text-[9px] font-black rounded border border-rose-100 shadow-sm">처방전</span>
                  )}
                  {isInspectionRequired(device.category, device.name) && (
                    <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-500 text-[9px] font-black rounded border border-blue-100 shadow-sm">검수</span>
                  )}
                </div>
                <span className="text-[11px] md:text-xs font-bold text-gray-400 flex items-center gap-1 shrink-0 mt-0.5">
                  <Clock size={12}/> {device.lifespan ? `${device.lifespan}년` : '미입력'}
                </span>
              </div>
              
              <h4 className="text-lg md:text-xl font-black text-gray-900 tracking-tight leading-tight mb-2 line-clamp-2">
                {device.name}
              </h4>
  
              <div className="mt-auto pt-3 md:pt-4 space-y-1">
                <p className="text-[11px] md:text-xs font-bold text-gray-400 flex items-center gap-1.5">
                  <Building2 size={12}/> {device.manufacturer || '제조사 미상'}
                </p>
                <p className="text-[11px] md:text-xs font-bold text-indigo-400 flex items-center gap-1.5 pt-1">
                  <Info size={12}/> 기준금액 ₩ {Number(device.standard_price || 0).toLocaleString()}
                </p>
                <p className="text-base md:text-lg font-black text-gray-900 flex items-center gap-1.5">
                  <Banknote size={16} className="text-indigo-600"/> 
                  고시 ₩ {Number(device.price).toLocaleString()}
                  
                  <span className={`text-[9px] md:text-[10px] px-2 py-0.5 rounded-md ml-1 tracking-wider ${
                    device.tax_type === '과세' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'
                  }`}>
                    {device.tax_type || '영세'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        ))}

        {!isLoading && filteredDevices.length === 0 && (
           <div className="col-span-full py-16 md:py-20 text-center bg-gray-50 rounded-[2rem] md:rounded-[3rem] border-2 border-dashed border-gray-200">
             <Package size={40} className="mx-auto mb-4 text-gray-300 md:w-12 md:h-12" />
             <p className="text-sm md:text-base text-gray-500 font-bold">등록된 품목이 없거나 검색 결과가 없습니다.</p>
           </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-md overflow-y-auto font-sans">
          <div className="bg-white w-full max-w-3xl rounded-3xl md:rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            
            <div className="p-6 md:p-10 border-b border-gray-50 flex justify-between items-center bg-indigo-50/30 shrink-0">
              <div>
                <h4 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2">
                  <Package className="text-indigo-600" size={24} /> {editingId ? '품목 정보 수정' : '신규 보조기기 품목 등록'}
                </h4>
                <p className="text-xs md:text-sm text-gray-500 font-medium mt-1">공단 카테고리에 맞춰 기기의 단가 및 내구연한을 등록하세요.</p>
              </div>
              <button onClick={closeModal} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white border border-gray-100 rounded-xl md:rounded-2xl text-gray-400 hover:text-black transition-all shrink-0">
                <X size={20} className="md:w-6 md:h-6"/>
              </button>
            </div>
            
            <div className="p-6 md:p-10 space-y-6 md:space-y-8 flex-1 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                
                <div className="space-y-5 md:space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">품목명 *</label>
                    <input 
                      className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl border-none outline-none font-bold text-gray-800 focus:ring-2 focus:ring-indigo-600 transition-all text-sm md:text-base"
                      placeholder="제품명을 입력하세요"
                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">카테고리 *</label>
                    <div className="space-y-3">
                      <select 
                        className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl border-none outline-none font-bold text-gray-800 focus:ring-2 focus:ring-indigo-600 transition-all text-sm md:text-base"
                        value={formData.category} onChange={handleCategoryChange} 
                      >
                        <option value="">공단 분류 선택</option>
                        {NHIS_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        <option value="custom">직접 입력...</option>
                      </select>
                      
                      {formData.category === 'custom' && (
                        <div className="animate-in slide-in-from-top-2">
                          <input 
                            type="text"
                            className="w-full bg-indigo-50/50 p-3.5 md:p-4 rounded-xl md:rounded-2xl border-2 border-indigo-100 outline-none font-bold text-indigo-900 focus:border-indigo-400 transition-all text-sm md:text-base"
                            placeholder="새로운 카테고리명을 입력하세요"
                            value={formData.customCategory} onChange={e => setFormData({...formData, customCategory: e.target.value})}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1 flex items-center gap-1">
                      공단 기준금액 (원)
                    </label>
                    <input 
                      type="number"
                      className="w-full bg-indigo-50/30 text-indigo-900 p-3.5 md:p-4 rounded-xl md:rounded-2xl border border-indigo-100 outline-none font-bold focus:ring-2 focus:ring-indigo-600 transition-all text-sm md:text-base"
                      placeholder="카테고리 선택 시 자동 입력 (수정 가능)"
                      value={formData.standard_price} onChange={e => setFormData({...formData, standard_price: e.target.value})}
                    />
                  </div>

                  <div className="flex gap-3 md:gap-4">
                    <div className="space-y-2 flex-1">
                      <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">고시금액 / 단가 (원) *</label>
                      <input 
                        type="number"
                        className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl border-none outline-none font-bold text-gray-800 focus:ring-2 focus:ring-indigo-600 transition-all text-sm md:text-base"
                        placeholder="실제 판매/고시가"
                        value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2 w-28 md:w-32 flex-shrink-0">
                      <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">과세 구분</label>
                      <div className="flex bg-gray-50 p-1 rounded-xl md:rounded-2xl">
                        {['과세', '영세'].map(type => (
                          <button 
                            key={type} type="button"
                            onClick={() => setFormData({...formData, tax_type: type})}
                            className={`flex-1 py-2.5 md:py-3 text-xs md:text-sm rounded-lg md:rounded-xl transition-all font-bold ${
                              formData.tax_type === type ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">내구연한 (년)</label>
                    <input 
                      type="number"
                      className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl border-none outline-none font-bold text-gray-800 focus:ring-2 focus:ring-indigo-600 transition-all text-sm md:text-base"
                      placeholder="카테고리 선택 시 자동 입력"
                      value={formData.lifespan} onChange={e => setFormData({...formData, lifespan: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">제조사</label>
                    <input 
                      className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl border-none outline-none font-bold text-gray-800 focus:ring-2 focus:ring-indigo-600 transition-all text-sm md:text-base"
                      placeholder="제조사명 입력"
                      value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2 h-full flex flex-col">
                  <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">제품 대표 이미지</label>
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    className={`flex-1 min-h-[200px] md:min-h-[240px] rounded-2xl md:rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group
                      ${formData.image ? 'border-indigo-200 bg-white' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-indigo-400'}
                    `}
                  >
                    <input 
                      type="file" accept="image/*" className="hidden" 
                      ref={fileInputRef} onChange={handleImageUpload} 
                    />
                    
                    {formData.image ? (
                      <div className="relative w-full h-full p-4">
                        <img src={formData.image} alt="제품" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all rounded-2xl md:rounded-3xl">
                          <span className="text-white font-black text-sm flex items-center gap-2"><Upload size={16}/> 이미지 변경</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-gray-400 group-hover:text-indigo-500 transition-all">
                        <ImageIcon size={40} className="mb-2 md:mb-3 md:w-12 md:h-12" />
                        <span className="font-bold text-sm md:text-base">여기를 클릭하여 이미지 업로드</span>
                        <span className="text-[10px] md:text-xs mt-1">권장 사이즈: 1:1 비율</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            <div className="p-5 md:p-8 bg-gray-50 flex gap-3 md:gap-4 border-t border-gray-100 shrink-0">
              <button 
                onClick={closeModal} 
                className="flex-1 py-3.5 md:py-5 bg-white border border-gray-200 rounded-xl md:rounded-[1.5rem] font-black text-gray-500 hover:bg-gray-50 transition-all text-sm md:text-base"
              >
                취소
              </button>
              <button 
                onClick={handleSave} 
                className="flex-1 py-3.5 md:py-5 bg-indigo-600 text-white rounded-xl md:rounded-[1.5rem] font-black shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm md:text-base"
              >
                <CheckCircle size={20} className="w-4 h-4 md:w-5 md:h-5"/> {editingId ? '수정 완료' : '품목 등록하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}