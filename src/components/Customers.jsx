import { useState, useEffect, useRef } from 'react';
import { 
  Users, Plus, X, Search, Building, 
  PenTool, Trash2, Edit3, History, 
  MapPin, AlertCircle, Sparkles, Upload, Loader2, Package, Truck, ChevronDown, Calendar, Check, Tag, FileText, Clock, ChevronLeft, ChevronRight
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom'; 

export default function Customers() {
  const navigate = useNavigate(); 
  const [customers, setCustomers] = useState([]);
  const [govs, setGovs] = useState([]);
  const [products, setProducts] = useState([]); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false); 
  
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [productSearch, setProductSearch] = useState(''); 
  const [isExtracting, setIsExtracting] = useState(false); 
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; 

  // 🚨 Claims.jsx와 100% 동기화된 14대 마스터 택배사 파이프라인 목록
  const courierList = [
    "CJ대한통운", "우체국택배", "롯데택배", "한진택배", "로젠택배", 
    "경동택배", "대신택배", "일양로지스", "천일택배", "건영택배", 
    "CU 편의점택배", "GS25 편의점택배", "직접 배송/설치", "기타"
  ];

  const [formData, setFormData] = useState({
    name: '', gender: '남', birth_date: '', local_gov_id: '',
    disability_type: '', disability_level: '심함', phone: '',
    zip_code: '', address: '', detail_address: '', signature: null
  });

  // 🚨 수량(quantity) 컬럼 스키마 확장 대응 기본값 세팅
  const [grantData, setGrantData] = useState({
    product_id: '', product_name: '', category: '', 
    carrier: 'CJ대한통운', tracking_no: '', total_amount: 0, quantity: 1, isManual: false 
  });

  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const fileInputRef = useRef(null); 

  useEffect(() => {
    fetchData();
    const script = document.createElement('script');
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  async function fetchData() {
    const { data: custData } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    const { data: govData } = await supabase.from('local_governments').select('id, name');
    const { data: prodData } = await supabase.from('devices').select('*');
    const { data: claimsData } = await supabase.from('claims').select('*').order('claim_date', { ascending: false });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const merged = custData?.map(c => {
      const customerClaims = claimsData?.filter(claim => claim.customer_id === c.id) || [];
      const latestClaim = customerClaims[0];
      
      let device = null;
      let remainingDays = Infinity;
      let expireDate = null;

      if (latestClaim) {
        device = prodData?.find(d => d.id === latestClaim.product_id);
        
        if (device && device.lifespan) {
          const lifespanYears = parseInt(device.lifespan, 10);
          if (!isNaN(lifespanYears)) {
            expireDate = new Date(latestClaim.claim_date);
            expireDate.setFullYear(expireDate.getFullYear() + lifespanYears);
            expireDate.setHours(0, 0, 0, 0);

            const diffTime = expireDate.getTime() - today.getTime();
            remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }
        }
      }

      return {
        ...c,
        local_governments: govData?.find(g => g.id === c.local_gov_id),
        latestClaim: latestClaim ? { ...latestClaim, device } : null,
        remainingDays,
        expireDate
      };
    });

    merged?.sort((a, b) => {
      if (a.remainingDays !== b.remainingDays) {
        return a.remainingDays - b.remainingDays; 
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

    setCustomers(merged || []);
    setGovs(govData || []);
    setProducts(prodData || []);
  }

  const processAiFile = async (file) => {
    if (!file) return; 

    if (file.name.toLowerCase().endsWith('.hwp')) {
      alert('⚠️ 한글(HWP) 파일은 AI가 직접 읽을 수 없습니다.\n파일을 [PDF]로 저장(변환)하거나 캡처하여 이미지로 업로드해 주세요.');
      if(fileInputRef.current) fileInputRef.current.value = ''; 
      return;
    }

    setIsExtracting(true);
    try {
      const toBase64 = f => new Promise(res => { 
        const r = new FileReader(); 
        r.readAsDataURL(f); 
        r.onload = () => res(r.result.split(',')[1]); 
      });
      const base64 = await toBase64(file);
      const mimeType = file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : file.type;

      const promptText = `
        첨부된 문서 데이터를 분석해서 대상자 정보를 추출해 줘.
        너는 무조건 부가 설명이나 마크다운 표현을 완전히 배제하고, 오직 아래의 JSON 포맷 규칙을 따르는 '순수 JSON 문자열'만 출력해야 해. 
        {
          "name": "추출된 성명",
          "gender": "남" 또는 "여",
          "birth_date": "YYYY-MM-DD",
          "phone": "010-0000-0000",
          "disability_type": "장애 유형 명칭",
          "disability_level": "심함" 또는 "심하지 않음",
          "zip_code": "우편번호",
          "address": "추출된 기본 주소",
          "detail_address": "상세 주소"
        }
      `;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyB8Wof3IId7UTEkD5OsOBPKfF9AjuRFpAk`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ 
            parts: [
              { text: promptText }, 
              { inline_data: { mime_type: mimeType, data: base64 } }
            ] 
          }] 
        })
      });

      const result = await res.json();
      if (result.error) throw new Error(result.error.message);

      const rawText = result.candidates[0].content.parts[0].text;
      const cleanedText = rawText.replace(/`{3}json/gi, '').replace(/`{3}/g, '').trim();
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const extractedData = JSON.parse(jsonMatch[0]);
        if (extractedData.gender && !['남', '여'].includes(extractedData.gender)) {
          extractedData.gender = extractedData.gender.includes('여') ? '여' : '남';
        }
        setFormData(prev => ({ ...prev, ...extractedData }));
      } else {
        throw new Error('유효한 JSON 구조 도출 실패');
      }

    } catch (err) { 
      console.error(err);
      alert(`❌ AI 문서 분석 실패\n\n원인: ${err.message || '엔드포인트 연동 지연'}`); 
    } finally { 
      setIsExtracting(false); 
      if(fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (file) processAiFile(file); };

  async function handleSave() {
    if (!formData.name || !formData.local_gov_id) return alert('성함과 지자체는 필수입니다.');
    const { local_governments, latestClaim, remainingDays, expireDate, ...pureData } = formData;
    const payload = { ...pureData, local_gov_id: parseInt(formData.local_gov_id) };
    
    if (editingId) {
      const { error } = await supabase.from('customers').update(payload).eq('id', editingId);
      if (error) {
        alert(error.message);
      } else {
        closeModal(); 
        fetchData(); 
      }
    } else {
      const { data, error } = await supabase.from('customers').insert([payload]).select().single();
      if (error) {
        alert(error.message);
      } else {
        closeModal(); 
        await fetchData(); 
        
        if (window.confirm('대상자 등록이 완료되었습니다!\n이 대상자에게 지금 바로 품목(보조기기)을 할당하고 교부 접수를 시작하시겠습니까?')) {
          navigate('/claims', { 
            state: { 
              autoOpenCreate: true, 
              customerId: data.id, 
              customerName: data.name 
            } 
          });
        }
      }
    }
  }

  async function handleDeleteCustomer(id) {
    if (window.confirm('대상자 정보를 삭제하시겠습니까?')) {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (!error) fetchData();
    }
  }

  // 🚨 수량(quantity) 필드 DB 적재 연동 완료
  async function handleGrantComplete() {
    if (!grantData.product_id) {
      alert('⚠️ 검색창 하단에 뜨는 상품 목록에서 원하시는 상품을 마우스로 클릭해서 선택해주세요!');
      return;
    }
    const { error } = await supabase.from('claims').insert([{
      customer_id: selectedCustomer.id,
      product_id: grantData.product_id, 
      carrier: grantData.carrier,
      tracking_no: grantData.tracking_no,
      status: '교부 완료',
      claim_date: new Date().toISOString().split('T')[0],
      total_amount: grantData.total_amount,
      quantity: grantData.quantity // 🚨 수량 데이터 컬럼 맵핑 주입
    }]);
    
    if (error) {
      alert('❌ 교부 처리 중 DB 에러가 발생했습니다:\n\n' + error.message);
      console.error(error);
    } else {
      alert('✅ 교부 처리가 완료되었습니다! 청구 관리 탭에서 확인해주세요.');
      setIsGrantModalOpen(false); 
      // 모달 데이터 리셋
      setGrantData({ product_id: '', product_name: '', category: '', carrier: 'CJ대한통운', tracking_no: '', total_amount: 0, quantity: 1, isManual: false });
      setProductSearch('');
      fetchData();
    }
  }

  const openEditModal = (c) => {
    setFormData({ ...c, local_gov_id: c.local_gov_id?.toString() || '' }); 
    setEditingId(c.id); setIsModalOpen(true);
    setTimeout(() => { 
      if (c.signature && canvasRef.current) { 
        const ctx = canvasRef.current.getContext('2d'); 
        const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0); img.src = c.signature; 
      } 
    }, 200);
  };

  const closeModal = () => { 
    setIsModalOpen(false); setEditingId(null); 
    setFormData({ name: '', gender: '남', birth_date: '', local_gov_id: '', disability_type: '', disability_level: '심함', phone: '', zip_code: '', address: '', detail_address: '', signature: null }); 
  };

  const startDrawing = (e) => { 
    const c = canvasRef.current; if(!c) return; 
    const ctx = c.getContext('2d'); const r = c.getBoundingClientRect(); 
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - r.left; 
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - r.top; 
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineWidth = 2; setIsDrawing(true); 
  };
  const draw = (e) => { 
    if (!isDrawing) return; 
    const c = canvasRef.current; const ctx = c.getContext('2d'); const r = c.getBoundingClientRect(); 
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - r.left; 
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - r.top; 
    ctx.lineTo(x, y); ctx.stroke(); e.preventDefault(); 
  };
  const stopDrawing = () => { if (isDrawing) { setIsDrawing(false); setFormData(p => ({ ...p, signature: canvasRef.current.toDataURL() })); } };

  const renderLifespanStatus = (c) => {
    const claim = c.latestClaim;
    if (!claim || !claim.device) return <span className="text-gray-300 font-bold text-xs">교부 내역 없음</span>;
    
    const deviceName = claim.device.name;
    
    if (c.remainingDays === Infinity) return (
      <div>
        <p className="text-[13px] font-black text-gray-800 line-clamp-1">{deviceName}</p>
        <span className="text-[10px] text-gray-400 font-bold">내구연한 미지정 품목</span>
      </div>
    );

    const diffDays = c.remainingDays;
    const expireDate = c.expireDate;
    
    let badge;
    if (diffDays < 0) {
      badge = <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-[10px] font-black">내구연한 경과</span>;
    } else if (diffDays <= 30) {
      badge = <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-md text-[10px] font-black animate-pulse shadow-sm shadow-red-200">D-{diffDays} 임박!</span>;
    } else {
      badge = <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-black">{expireDate.getFullYear()}년 {expireDate.getMonth()+1}월 만료</span>;
    }

    return (
      <div className="flex flex-col gap-1">
        <p className="text-[13px] font-black text-gray-800 line-clamp-1" title={deviceName}>
          {deviceName}
        </p>
        <div className="flex items-center gap-1">
          <Clock className="text-gray-400" size={12} />
          {badge}
        </div>
      </div>
    );
  };

  const filteredCustomers = customers.filter(c => 
    c.name.includes(searchTerm) || (c.phone && c.phone.includes(searchTerm))
  );

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const currentItems = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 font-sans">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">대상자 관리</h1>
          <p className="text-gray-500 mt-2 font-bold flex items-center gap-2"><Users size={18} className="text-blue-600" /> 총 {customers.length}명 등록됨</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-8 py-4 rounded-[1.5rem] font-black shadow-xl flex items-center gap-2 hover:scale-105 transition-all"><Plus size={22} /> 신규 대상자 등록</button>
      </div>

      <div className="bg-white p-2 rounded-[2rem] border border-gray-100 shadow-sm flex items-center group focus-within:border-blue-200 transition-all font-bold">
        <Search className="ml-6 text-gray-400" size={20} />
        <input type="text" placeholder="성함 또는 연락처 검색..." className="w-full p-5 outline-none bg-transparent" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-xl overflow-hidden mt-6">
        <table className="w-full text-left text-sm font-bold">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-50 text-[11px] font-black text-gray-400 uppercase tracking-widest">
              <th className="p-7 w-20 text-center">No.</th>
              <th className="p-7">수급자 정보</th>
              <th className="p-7">관할 지자체</th>
              <th className="p-7">최근 교부 / 내구연한</th>
              <th className="p-7 text-center">서명</th>
              <th className="p-7 text-center">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {currentItems.length > 0 ? (
              currentItems.map((c, index) => {
                const serialNumber = filteredCustomers.length - ((currentPage - 1) * itemsPerPage + index);
                
                return (
                  <tr key={c.id} className="hover:bg-blue-50/20 transition-all">
                    <td className="p-7 text-center text-gray-400 font-black">
                      {serialNumber}
                    </td>
                    <td className="p-7 text-gray-900 font-black">{c.name} ({c.gender})</td>
                    <td className="p-7 text-gray-700">{c.local_governments?.name || '미지정'}</td>
                    
                    <td className="p-7">
                      {renderLifespanStatus(c)}
                    </td>

                    <td className="p-7 text-center">{c.signature ? <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-md text-xs font-black">완료</span> : <span className="bg-red-50 text-red-600 px-3 py-1 rounded-md text-xs font-black">필요</span>}</td>
                    <td className="p-7 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setSelectedCustomer(c); setIsGrantModalOpen(true); }} className="p-3 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Truck size={18} /></button>
                        <button onClick={() => openEditModal(c)} className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-gray-900 transition-all"><Edit3 size={18} /></button>
                        <button onClick={() => handleDeleteCustomer(c.id)} className="p-3 bg-gray-50 text-gray-300 rounded-xl hover:text-red-500 transition-all"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="p-10 text-center text-gray-400 font-bold">
                  검색된 대상자가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="p-6 bg-white border-t border-gray-50 flex items-center justify-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={currentPage === 1}
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="flex gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setCurrentPage(i + 1)} 
                  className={`w-10 h-10 rounded-xl font-black text-sm transition-all ${
                    currentPage === i + 1 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* 대상자 추가/수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 flex flex-col max-h-[95vh] font-bold">
            <div className="p-10 border-b bg-blue-50/30 flex justify-between items-center">
              <h4 className="text-2xl font-black">{editingId ? '대상자 정보 수정' : '신규 대상자 등록'}</h4>
              <button onClick={closeModal}><X size={24}/></button>
            </div>
            <div className="p-10 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
              
              {!editingId && (
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative overflow-hidden rounded-[2rem] border-2 transition-all flex items-center justify-between p-6 ${
                    isDragging 
                      ? 'border-indigo-500 bg-indigo-50/80 shadow-inner scale-[0.99]' 
                      : 'border-transparent bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-700 shadow-lg'
                  }`}
                >
                  <input type="file" accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={(e) => processAiFile(e.target.files[0])} />
                  
                  {!isDragging && (
                    <div className="absolute -top-10 -right-4 p-4 opacity-10 pointer-events-none">
                      <Sparkles size={160} />
                    </div>
                  )}

                  <div className="flex items-center gap-5 z-10">
                    <div className={`p-4 rounded-2xl backdrop-blur-md shadow-inner transition-colors ${isDragging ? 'bg-indigo-600 text-white' : 'bg-white/20 text-white'}`}>
                      <FileText size={28} />
                    </div>
                    <div>
                      <h5 className={`text-xl font-black mb-1 tracking-tight transition-colors ${isDragging ? 'text-indigo-900' : 'text-white'}`}>
                        {isDragging ? '여기에 드롭하여 스캔 시작!' : 'AI 서류 스마트 입력'}
                      </h5>
                      <p className={`text-[13px] font-bold max-w-[280px] break-keep transition-colors ${isDragging ? 'text-indigo-700' : 'text-indigo-100'}`}>
                        복지카드, 처방전, 신분증을 드래그하거나 버튼을 클릭하세요. (PDF, JPG 지원)
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => !isExtracting && fileInputRef.current.click()} 
                    disabled={isExtracting} 
                    className={`z-10 px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${
                      isDragging 
                        ? 'bg-indigo-100 text-indigo-400 pointer-events-none shadow-none opacity-0' 
                        : 'bg-white text-indigo-600 hover:bg-indigo-50 hover:scale-[1.02] active:scale-95 shadow-xl disabled:opacity-70 disabled:hover:scale-100'
                    }`}
                  >
                    {isExtracting ? (
                      <><Loader2 className="animate-spin" size={20} /> 분석 중...</>
                    ) : (
                      <><Upload size={20} /> 파일 첨부</>
                    )}
                  </button>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2"><label className="text-xs text-gray-400 ml-1">성함</label><input placeholder="성함" className="w-full bg-gray-50 p-4 rounded-2xl outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div className="space-y-2"><label className="text-xs text-gray-400 ml-1">성별</label><div className="flex bg-gray-50 p-1 rounded-2xl">{['남', '여'].map(g => (<button key={g} onClick={() => setFormData({...formData, gender: g})} className={`flex-1 py-3 rounded-xl transition-all ${formData.gender === g ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>{g}</button>))}</div></div>
                <div className="space-y-2"><label className="text-xs text-gray-400 ml-1">생년월일</label><input type="date" className="w-full bg-gray-50 p-4 rounded-2xl outline-none" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} /></div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2"><label className="text-xs text-gray-400 ml-1">지자체</label><select className="w-full bg-gray-50 p-4 rounded-2xl outline-none" value={formData.local_gov_id} onChange={e => setFormData({...formData, local_gov_id: e.target.value})}><option value="">지자체 선택</option>{govs.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
                <div className="space-y-2"><label className="text-xs text-gray-400 ml-1">장애유형</label><input placeholder="장애유형 (예: 지체)" className="w-full bg-gray-50 p-4 rounded-2xl outline-none" value={formData.disability_type} onChange={e => setFormData({...formData, disability_type: e.target.value})} /></div>
                <div className="space-y-2"><label className="text-xs text-gray-400 ml-1">장애정도</label><select className="w-full bg-gray-50 p-4 rounded-2xl outline-none" value={formData.disability_level} onChange={e => setFormData({...formData, disability_level: e.target.value})}><option value="심함">심함</option><option value="심하지 않음">심하지 않음</option></select></div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-xs text-gray-400 ml-1">연락처</label><input placeholder="연락처" className="w-full bg-gray-50 p-4 rounded-2xl outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                <div className="space-y-2"><label className="text-xs text-gray-400 ml-1">우편번호</label><div className="flex gap-2"><input readOnly placeholder="우편번호" className="flex-1 bg-gray-50 p-4 rounded-2xl" value={formData.zip_code} /><button onClick={() => new window.daum.Postcode({ oncomplete: d => setFormData(p => ({ ...p, zip_code: d.zonecode, address: d.address })) }).open()} className="px-6 bg-gray-800 text-white rounded-2xl font-black hover:bg-black transition-colors">검색</button></div></div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-xs text-gray-400 ml-1">주소</label><input readOnly placeholder="주소" className="w-full bg-gray-50 p-4 rounded-2xl" value={formData.address} /></div>
                <div className="space-y-2"><label className="text-xs text-gray-400 ml-1">상세주소</label><input placeholder="상세주소" className="w-full bg-gray-50 p-4 rounded-2xl outline-none" value={formData.detail_address} onChange={e => setFormData({...formData, detail_address: e.target.value})} /></div>
              </div>

              <div className="space-y-4 pt-4 border-t font-black">
                <div className="flex justify-between items-center"><span>대상자 서명</span><button onClick={() => { const ctx = canvasRef.current.getContext('2d'); ctx.clearRect(0,0,700,160); setFormData(p => ({...p, signature: null})) }} className="text-red-500 text-xs font-black">초기화</button></div>
                <div className="w-full h-40 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 relative overflow-hidden">
                  <canvas ref={canvasRef} width={700} height={160} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} className="w-full h-full cursor-crosshair" />
                </div>
              </div>
            </div>
            <div className="p-10 bg-gray-50 flex gap-4 font-black shrink-0">
              <button onClick={closeModal} className="flex-1 py-5 bg-white border border-gray-200 rounded-2xl text-gray-400 hover:bg-gray-100 transition-colors">취소</button>
              <button onClick={handleSave} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl shadow-xl hover:bg-blue-700 transition-colors">정보 저장하기</button>
            </div>
          </div>
        </div>
      )}
      
      {/* 보조기기 교부 모달 */}
      {isGrantModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl animate-in fade-in font-bold">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b bg-blue-600 text-white flex justify-between items-center font-black"><h4>보조기기 교부</h4><button onClick={() => setIsGrantModalOpen(false)}><X/></button></div>
            <div className="p-8 space-y-6">
              
              {/* 품목 선택 세션 */}
              <div className="space-y-2 relative">
                <label className="text-xs text-gray-400 ml-1 font-black">품목 선택</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="상품명 검색..." 
                    className="w-full bg-gray-50 pl-12 pr-4 py-4 rounded-2xl border-none outline-none font-black" 
                    value={productSearch} 
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setGrantData({...grantData, product_name: ''}); 
                    }} 
                  />
                </div>
                {productSearch.trim() && productSearch !== grantData.product_name && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-48 overflow-y-auto p-2 custom-scrollbar">
                    {products.filter(p => p.name.includes(productSearch)).map(p => (
                      <button 
                        key={p.id} 
                        onClick={() => { 
                          // 🚨 품목 클릭 시 단가 × 현재 설정된 수량으로 실시간 계산 연동
                          setGrantData({
                            ...grantData, 
                            product_id: p.id, 
                            product_name: p.name, 
                            total_amount: p.price * grantData.quantity, 
                            isManual: false
                          }); 
                          setProductSearch(p.name); 
                        }} 
                        className="w-full flex justify-between p-4 hover:bg-blue-50 rounded-xl transition-all font-black"
                      >
                        <span>{p.name}</span><span className="text-blue-600">₩{p.price?.toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 물류 인프라 정보 배정 세션 (ReferenceError 완벽 수정) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 ml-1">배송 수단</label>
                  <select 
                    className="w-full bg-gray-50 p-4 rounded-2xl outline-none border-none font-black text-gray-700" 
                    value={grantData.carrier} 
                    onChange={e => setGrantData({...grantData, carrier: e.target.value})}
                  >
                    {courierList.map(carrier => (
                      <option key={carrier} value={carrier}>{carrier}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 ml-1">송장번호/날짜</label>
                  <input 
                    className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none font-black" 
                    value={grantData.tracking_no} 
                    onChange={(e) => setGrantData({...grantData, tracking_no: e.target.value})} 
                  />
                </div>
              </div>

              {/* 🚨 수량 조절 및 총 청구 금액 실시간 계산 연동 레이아웃 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 ml-1">수량</label>
                  <input 
                    type="number"
                    min="1"
                    className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none font-black" 
                    value={grantData.quantity} 
                    onChange={(e) => {
                      const qty = parseInt(e.target.value) || 1;
                      const matchedProd = products.find(p => p.id === grantData.product_id);
                      const unitPrice = matchedProd ? (matchedProd.price || 0) : 0;
                      setGrantData({
                        ...grantData,
                        quantity: qty,
                        total_amount: unitPrice * qty // 수량 조절 시 총액 실시간 동적 갱신
                      });
                    }} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 ml-1">총 청구 금액</label>
                  <input 
                    type="number"
                    className="w-full bg-blue-50/50 text-blue-600 p-4 rounded-2xl border-none outline-none font-black" 
                    value={grantData.total_amount} 
                    onChange={(e) => setGrantData({...grantData, total_amount: parseInt(e.target.value) || 0})} 
                  />
                </div>
              </div>

            </div>
            
            <div className="p-8 bg-gray-50 flex gap-4">
              <button onClick={() => setIsGrantModalOpen(false)} className="flex-1 py-4 bg-white border border-gray-200 text-gray-500 rounded-2xl hover:bg-gray-100 transition-colors">취소</button>
              <button onClick={handleGrantComplete} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl shadow-xl font-black hover:bg-blue-700 transition-colors">
                교부 완료 처리
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}