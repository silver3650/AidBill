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

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data } = await supabase
      .from('devices')
      .select('*')
      .order('created_at', { ascending: false });
    setDevices(data || []);
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

    const payload = {
      name: formData.name,
      category: finalCategory,
      price: Number(formData.price),
      tax_type: formData.tax_type,
      manufacturer: formData.manufacturer,
      lifespan: formData.lifespan,
      image: formData.image
    };

    if (editingId) {
      const { error } = await supabase.from('devices').update(payload).eq('id', editingId);
      if (error) alert('수정 실패: ' + error.message);
      else alert('성공적으로 수정되었습니다.');
    } else {
      const { error } = await supabase.from('devices').insert([payload]);
      if (error) alert('저장 실패: ' + error.message);
      else alert('신규 품목이 등록되었습니다.');
    }
    
    closeModal();
    fetchData();
  }

  // --- 삭제 로직 ---
  async function handleDelete(id) {
    if (!window.confirm('이 품목을 정말 삭제하시겠습니까? (청구 내역에 포함된 기기는 삭제 시 주의가 필요합니다)')) return;
    const { error } = await supabase.from('devices').delete().eq('id', id);
    if (!error) fetchData();
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
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* 상단 헤더 */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">보조기기 품목</h1>
          <p className="text-gray-500 mt-2 font-medium">청구 가능한 장애인보조기기 단가 및 카테고리를 관리합니다.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-8 py-4 rounded-[1.5rem] font-black shadow-xl shadow-indigo-200 flex items-center gap-2 hover:scale-105 transition-all"
        >
          <Plus size={22} /> 품목 등록
        </button>
      </div>

      {/* 검색 바 */}
      <div className="bg-white p-2 rounded-[2rem] border border-gray-100 shadow-sm flex items-center group focus-within:border-indigo-200 transition-all">
        <Search className="ml-6 text-gray-400 group-focus-within:text-indigo-600" size={20} />
        <input 
          type="text" placeholder="품목명 또는 카테고리로 검색하세요..." 
          className="w-full p-5 outline-none font-bold text-gray-900 bg-transparent"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 품목 리스트 (카드형 Grid 배열) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredDevices.map((device) => (
          <div key={device.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/10 overflow-hidden group hover:border-indigo-200 transition-all flex flex-col">
            
            {/* ⭐️ 이미지 영역 ⭐️ (onClick 이벤트 및 cursor-pointer 추가) */}
            <div 
              onClick={() => openEditModal(device)}
              className="h-48 bg-gray-50 flex items-center justify-center relative overflow-hidden border-b border-gray-100 p-6 cursor-pointer"
            >
              {device.image ? (
                <img 
                  src={device.image} 
                  alt={device.name} 
                  className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-all duration-500" 
                />
              ) : (
                <ImageIcon size={48} className="text-gray-200" />
              )}
              
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button 
                  onClick={(e) => { e.stopPropagation(); openEditModal(device); }} 
                  className="w-8 h-8 bg-white/90 backdrop-blur rounded-lg flex items-center justify-center text-gray-600 hover:text-indigo-600 shadow-sm"
                >
                  <Edit3 size={16}/>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(device.id); }} 
                  className="w-8 h-8 bg-white/90 backdrop-blur rounded-lg flex items-center justify-center text-gray-600 hover:text-red-500 shadow-sm"
                >
                  <Trash2 size={16}/>
                </button>
              </div>
            </div>

            {/* 정보 영역 */}
            <div className="p-6 flex-1 flex flex-col">
              {/* 카테고리 & 내구연한 가로 배치 */}
              <div className="flex justify-between items-center mb-3">
                <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg w-fit tracking-widest uppercase">
                  {device.category}
                </span>
                <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                  <Clock size={12}/> 내구연한: {device.lifespan ? `${device.lifespan}년` : '미입력'}
                </span>
              </div>
              
              <h4 className="text-xl font-black text-gray-900 tracking-tight leading-tight mb-2 line-clamp-2">
                {device.name}
              </h4>
              
              <div className="mt-auto pt-4 space-y-1">
                <p className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                  <Building2 size={12}/> {device.manufacturer || '제조사 미상'}
                </p>
                <p className="text-lg font-black text-gray-900 flex items-center gap-1.5">
                  <Banknote size={16} className="text-indigo-400"/> 
                  ₩ {Number(device.price).toLocaleString()}
                  
                  {/* 과세/영세 뱃지 표시 */}
                  <span className={`text-[10px] px-2 py-0.5 rounded-md ml-1 tracking-wider ${
                    device.tax_type === '과세' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'
                  }`}>
                    {device.tax_type || '영세'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        ))}

        {filteredDevices.length === 0 && (
           <div className="col-span-full py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
             <Package size={48} className="mx-auto mb-4 text-gray-300" />
             <p className="text-gray-500 font-bold">등록된 품목이 없거나 검색 결과가 없습니다.</p>
           </div>
        )}
      </div>

      {/* --- 신규 품목 등록 모달 --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl overflow-y-auto font-sans">
          <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-indigo-50/30">
              <div>
                <h4 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                  <Package className="text-indigo-600" size={24} /> {editingId ? '품목 정보 수정' : '신규 보조기기 품목 등록'}
                </h4>
                <p className="text-sm text-gray-500 font-medium mt-1">공단 카테고리에 맞춰 기기의 단가 및 내구연한을 등록하세요.</p>
              </div>
              <button onClick={closeModal} className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-black transition-all">
                <X size={24}/>
              </button>
            </div>
            
            <div className="p-10 space-y-8 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* 좌측: 정보 입력 */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-extrabold text-gray-800 ml-1">품목명 *</label>
                    <input 
                      className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none font-bold text-gray-800 focus:ring-2 focus:ring-indigo-600 transition-all"
                      placeholder="제품명을 입력하세요"
                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-extrabold text-gray-800 ml-1">카테고리 *</label>
                    <div className="space-y-3">
                      <select 
                        className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none font-bold text-gray-800 focus:ring-2 focus:ring-indigo-600 transition-all"
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
                            className="w-full bg-indigo-50/50 p-4 rounded-2xl border-2 border-indigo-100 outline-none font-bold text-indigo-900 focus:border-indigo-400 transition-all"
                            placeholder="새로운 카테고리명을 입력하세요"
                            value={formData.customCategory} onChange={e => setFormData({...formData, customCategory: e.target.value})}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                      <label className="text-sm font-extrabold text-gray-800 ml-1">단가 (원) *</label>
                      <input 
                        type="number"
                        className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none font-bold text-gray-800 focus:ring-2 focus:ring-indigo-600 transition-all"
                        placeholder="0"
                        value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})}
                      />
                    </div>
                    
                    {/* 과세 구분 입력 필드 */}
                    <div className="space-y-2 w-32 flex-shrink-0">
                      <label className="text-sm font-extrabold text-gray-800 ml-1">과세 구분</label>
                      <div className="flex bg-gray-50 p-1 rounded-2xl">
                        {['과세', '영세'].map(type => (
                          <button 
                            key={type}
                            type="button"
                            onClick={() => setFormData({...formData, tax_type: type})}
                            className={`flex-1 py-3 text-sm rounded-xl transition-all font-bold ${
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
                    <label className="text-sm font-extrabold text-gray-800 ml-1">내구연한 (년)</label>
                    <input 
                      type="number"
                      className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none font-bold text-gray-800 focus:ring-2 focus:ring-indigo-600 transition-all"
                      placeholder="예: 5"
                      value={formData.lifespan} onChange={e => setFormData({...formData, lifespan: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-extrabold text-gray-800 ml-1">제조사</label>
                    <input 
                      className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none font-bold text-gray-800 focus:ring-2 focus:ring-indigo-600 transition-all"
                      placeholder="제조사명 입력"
                      value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})}
                    />
                  </div>
                </div>

                {/* 우측: 제품 이미지 첨부 */}
                <div className="space-y-2 h-full flex flex-col">
                  <label className="text-sm font-extrabold text-gray-800 ml-1">제품 대표 이미지</label>
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    className={`flex-1 min-h-[240px] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group
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
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all rounded-3xl">
                          <span className="text-white font-black text-sm flex items-center gap-2"><Upload size={16}/> 이미지 변경</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-gray-400 group-hover:text-indigo-500 transition-all">
                        <ImageIcon size={48} className="mb-3" />
                        <span className="font-bold">여기를 클릭하여 이미지 업로드</span>
                        <span className="text-xs mt-1">권장 사이즈: 1:1 비율</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            <div className="p-10 bg-gray-50/50 flex gap-4 border-t border-gray-50">
              <button 
                onClick={closeModal} 
                className="flex-1 py-5 bg-white border border-gray-200 rounded-[1.5rem] font-black text-gray-500 hover:bg-gray-50 transition-all"
              >
                취소
              </button>
              <button 
                onClick={handleSave} 
                className="flex-1 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle size={20} /> {editingId ? '수정 완료' : '품목 등록하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}