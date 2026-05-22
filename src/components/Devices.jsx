import { useState, useEffect, useRef } from 'react';
import { 
  Package, Plus, X, Search, Image as ImageIcon, 
  Edit3, Trash2, Upload, CheckCircle, Tag, Building2, Banknote, Clock 
} from 'lucide-react';
import { supabase } from '../supabaseClient';

// 국민건강보험공단 장애인보조기기 표준 카테고리
const NHIS_CATEGORIES = [
  '수동휠체어',
  '전동휠체어',
  '전동스쿠터',
  '자세보조용구',
  '욕창예방방석',
  '욕창예방매트리스',
  '이동식전동리프트',
  '보청기',
  '맞춤형 교정용 신발',
  '의지·보조기',
  '보행기',
  '지팡이/목발',
  '기타 보조기기'
];

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // 💡 로딩 상태 추가

  // --- 품목 등록 폼 상태 (과세 여부 포함) ---
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    customCategory: '',
    price: '',
    tax_type: '영세',
    manufacturer: '',
    lifespan: '',
    image: null
  });

  const fileInputRef = useRef(null);

  useEffect(() => { 
    fetchData(); 

    // 💡 세션 변경(새로고침 복구, 토큰 갱신 등) 감지 리스너 추가
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchData();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      // 💡 1. 현재 로그인한 업체의 계정 정보를 가져옵니다.
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.warn("인증 세션을 기다리는 중이거나 만료되었습니다.");
        setDevices([]);
        return;
      }

      // 💡 2. 본인 업체(company_id)가 등록한 품목만 불러오도록 필터링합니다.
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

  // --- 이미지 업로드 처리 ---
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

  // --- 저장 및 수정 로직 ---
  async function handleSave() {
    const finalCategory = formData.category === 'custom' ? formData.customCategory : formData.category;

    if (!formData.name || !finalCategory || !formData.price) {
      return alert('품목명, 카테고리, 단가는 필수 입력 항목입니다!');
    }

    try {
      // 💡 3. 저장 시에도 사용자 확인 후 company_id를 추가하여 권한을 부여합니다.
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        alert('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
        return;
      }

      const payload = {
        name: formData.name,
        category: finalCategory,
        price: Number(formData.price),
        tax_type: formData.tax_type,
        manufacturer: formData.manufacturer,
        lifespan: formData.lifespan,
        image: formData.image,
        company_id: user.id // 등록하는 업체의 ID 저장
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

  // --- 삭제 로직 ---
  async function handleDelete(id) {
    if (!window.confirm('이 품목을 정말 삭제하시겠습니까? (청구 내역에 포함된 기기는 삭제 시 주의가 필요합니다)')) return;
    try {
      const { error } = await supabase.from('devices').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      alert('삭제 실패: ' + error.message);
    }
  }

  // --- 모달 제어 ---
  const openEditModal = (device) => {
    const isStandardCategory = NHIS_CATEGORIES.includes(device.category);
    setFormData({
      name: device.name,
      category: isStandardCategory ? device.category : 'custom',
      customCategory: isStandardCategory ? '' : device.category,
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
    setFormData({ name: '', category: '', customCategory: '', price: '', tax_type: '영세', manufacturer: '', lifespan: '', image: null });
  };

  // --- 검색 필터 ---
  const filteredDevices = devices.filter(d => 
    d.name.includes(searchTerm) || d.category.includes(searchTerm)
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-20">
      
      {/* 상단 헤더 (모바일 반응형) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter">보조기기 품목</h1>
          <p className="text-gray-500 mt-2 font-medium text-sm md:text-base">청구 가능한 장애인보조기기 단가 및 카테고리를 관리합니다.</p>
        </div>
      
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto bg-indigo-600 text-white px-6 md:px-8 py-3.5 md:py-4 rounded-2xl md:rounded-[1.5rem] font-black shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 hover:scale-105 transition-all"
        >
          <Plus size={22} /> 품목 등록
        </button>
      </div>

      {/* 검색 바 */}
      <div className="bg-white p-2 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-sm flex items-center group focus-within:border-indigo-200 transition-all">
        <Search className="ml-4 md:ml-6 text-gray-400 group-focus-within:text-indigo-600" size={20} />
        <input 
          type="text" placeholder="품목명 또는 카테고리로 검색하세요..." 
          className="w-full p-4 md:p-5 outline-none font-bold text-gray-900 bg-transparent text-sm md:text-base"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 품목 리스트 (카드형 Grid 배열) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {filteredDevices.map((device) => (
          <div key={device.id} className="bg-white rounded-3xl md:rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/10 overflow-hidden group hover:border-indigo-200 transition-all flex flex-col">
            
            {/* ⭐️ 이미지 영역 ⭐️ (onClick 이벤트 및 모바일에서 버튼 상시 노출 적용) */}
            <div 
              onClick={() => openEditModal(device)}
              className="h-40 md:h-48 bg-gray-50 flex items-center justify-center relative overflow-hidden border-b border-gray-100 p-4 md:p-6 cursor-pointer"
            >
              {device.image ? (
                <img 
                  src={device.image} 
                  alt={device.name} 
                  className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-all duration-500" 
                />
              ) : (
                <ImageIcon size={40} className="text-gray-200 md:w-12 md:h-12" />
              )}
              
              {/* 모바일에서는 버튼 상시 노출, PC에서는 Hover 시 노출 */}
              <div className="absolute top-3 right-3 md:top-4 md:right-4 flex gap-1.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                <button 
                  onClick={(e) => { e.stopPropagation(); openEditModal(device); }} 
                  className="w-8 h-8 bg-white/90 border border-gray-200 md:border-transparent backdrop-blur rounded-lg flex items-center justify-center text-gray-600 hover:text-indigo-600 shadow-sm"
                >
                  <Edit3 size={16}/>
                </button>
                
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(device.id); }} 
                  className="w-8 h-8 bg-white/90 border border-gray-200 md:border-transparent backdrop-blur rounded-lg flex items-center justify-center text-gray-600 hover:text-red-500 shadow-sm"
                >
                  <Trash2 size={16}/>
                </button>
              </div>
            </div>

            {/* 정보 영역 */}
            <div className="p-5 md:p-6 flex-1 flex flex-col">
              {/* 카테고리 & 내구연한 가로 배치 */}
              <div className="flex justify-between items-center mb-3">
                <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg w-fit tracking-widest uppercase">
                  {device.category}
                </span>
                <span className="text-[11px] md:text-xs font-bold text-gray-400 flex items-center gap-1">
                  <Clock size={12}/> 내구연한: {device.lifespan ? `${device.lifespan}년` : '미입력'}
                </span>
              </div>
              
              <h4 className="text-lg md:text-xl font-black text-gray-900 tracking-tight leading-tight mb-2 line-clamp-2">
                {device.name}
              </h4>
  
              <div className="mt-auto pt-3 md:pt-4 space-y-1">
                <p className="text-[11px] md:text-xs font-bold text-gray-400 flex items-center gap-1.5">
                  <Building2 size={12}/> {device.manufacturer || '제조사 미상'}
                </p>
                <p className="text-base md:text-lg font-black text-gray-900 flex items-center gap-1.5">
                  <Banknote size={16} className="text-indigo-400"/> 
                  ₩ {Number(device.price).toLocaleString()}
                  
                  {/* 과세/영세 뱃지 표시 */}
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

        {/* 💡 로딩 중이 아닐 때만 빈 화면 표시 */}
        {!isLoading && filteredDevices.length === 0 && (
           <div className="col-span-full py-16 md:py-20 text-center bg-gray-50 rounded-[2rem] md:rounded-[3rem] border-2 border-dashed border-gray-200">
             <Package size={40} className="mx-auto mb-4 text-gray-300 md:w-12 md:h-12" />
             <p className="text-sm md:text-base text-gray-500 font-bold">등록된 품목이 없거나 검색 결과가 없습니다.</p>
           </div>
        )}
      </div>

      {/* --- 신규 품목 등록 모달 (모바일 반응형 최적화) --- */}
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
                
                {/* 좌측: 정보 입력 */}
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
                        value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
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

                  <div className="flex gap-3 md:gap-4">
                    <div className="space-y-2 flex-1">
                      <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">단가 (원) *</label>
                      <input 
                        type="number"
                        className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl border-none outline-none font-bold text-gray-800 focus:ring-2 focus:ring-indigo-600 transition-all text-sm md:text-base"
                        placeholder="0"
                        value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})}
                      />
                    </div>
                    
                    {/* 과세 구분 입력 필드 */}
                    <div className="space-y-2 w-28 md:w-32 flex-shrink-0">
                      <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">과세 구분</label>
                      <div className="flex bg-gray-50 p-1 rounded-xl md:rounded-2xl">
                        {['과세', '영세'].map(type => (
                          <button 
                            key={type}
                            type="button"
                            onClick={() => setFormData({...formData, tax_type: type})}
                            className={`flex-1 py-2.5 md:py-3 text-xs md:text-sm rounded-lg md:rounded-xl transition-all font-bold ${
                              formData.tax_type === type 
                                ? 'bg-white shadow-sm text-indigo-600' 
                                : 'text-gray-400 hover:text-gray-600'
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
                      placeholder="예: 5"
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

                {/* 우측: 제품 이미지 첨부 */}
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