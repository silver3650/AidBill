import { useState, useEffect, useRef } from 'react';
import { 
  Users, Plus, X, Search, Building, 
  PenTool, Trash2, Edit3, History, 
  MapPin, AlertCircle, Sparkles, Upload, Loader2, Package, Truck, ChevronDown, Calendar, Check, Tag, FileText, Clock, ChevronLeft, ChevronRight
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom'; 

// 💡 자동 저장 훅 임포트
import { useAutoSave } from '../hooks/useAutoSave';

export default function Customers() {
  const navigate = useNavigate(); 
  const [customers, setCustomers] = useState([]);
  const [govs, setGovs] = useState([]);
  const [nhisBranches, setNhisBranches] = useState([]);
  const [products, setProducts] = useState([]); 
  
  // 💡 기존 useState들을 useAutoSave로 교체하여 화면 상태 유지
  const [isModalOpen, setIsModalOpen] = useAutoSave('customers_modal_open', false);
  const [isGrantModalOpen, setIsGrantModalOpen] = useAutoSave('customers_grant_modal_open', false); 
  const [editingId, setEditingId] = useAutoSave('customers_editing_id', null);
  const [searchTerm, setSearchTerm] = useAutoSave('customers_search_term', '');
  const [productSearch, setProductSearch] = useAutoSave('customers_product_search', ''); 
  const [selectedCustomer, setSelectedCustomer] = useAutoSave('customers_selected_customer', null);
  const [selectedPrimaryRegion, setSelectedPrimaryRegion] = useAutoSave('customers_primary_region', '');

  // 로딩, 드래그 등의 상태는 휘발성이 적합하므로 일반 useState 유지
  const [isExtracting, setIsExtracting] = useState(false); 
  const [isDragging, setIsDragging] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; 

  const courierList = [
    "CJ대한통운", "우체국택배", "롯데택배", "한진택배", "로젠택배", 
    "경동택배", "대신택배", "일양로지스", "천일택배", "건영택배", 
    "CU 편의점택배", "GS25 편의점택배", "직접 배송/설치", "기타"
  ];

  // 💡 대상자 폼 데이터를 useAutoSave로 변경 (작성 중 데이터 및 전자서명 완벽 보존)
  const [formData, setFormData, clearFormData] = useAutoSave('customers_form_data', {
    name: '', gender: '남', birth_date: '', local_gov_id: '', nhis_branch_id: '',
    disability_type: '', disability_level: '심함', phone: '',
    zip_code: '', address: '', detail_address: '', signature: null,
    qualification: '의료급여',
    resident_number_front: '', 
    resident_number_back: ''  
  });

  // 💡 교부 폼 데이터를 useAutoSave로 변경
  const [grantData, setGrantData, clearGrantData] = useAutoSave('customers_grant_data', {
    product_id: '', product_name: '', category: '', 
    carrier: 'CJ대한통운', tracking_no: '', total_amount: 0, quantity: 1, isManual: false 
  });

  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const fileInputRef = useRef(null); 

  // 지사명에서 "국민건강보험공단" 제거 함수
  const cleanBranchName = (name) => name ? name.replace(/국민건강보험공단 ?/g, '') : '';

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
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.warn("인증 에러이거나 세션이 없습니다.");
        return;
      }

      const { data: custData } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', user.id)
        .order('created_at', { ascending: false });

      const { data: govData } = await supabase.from('local_governments').select('id, name');
      const { data: nhisData } = await supabase.from('nhis_branches').select('id, name, region');
      
      const { data: prodData } = await supabase
        .from('devices')
        .select('*')
        .eq('company_id', user.id);
      
      let claimsData = [];
      if (custData && custData.length > 0) {
        const customerIds = custData.map(c => c.id);
        const { data: cData } = await supabase
          .from('claims')
          .select('*')
          .eq('company_id', user.id)
          .in('customer_id', customerIds) 
          .order('claim_date', { ascending: false });
        claimsData = cData || [];
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 데이터를 가나다순으로 미리 정렬
      const sortedGovs = (govData || []).sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));
      const sortedNhis = (nhisData || []).sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));

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
          local_governments: sortedGovs?.find(g => g.id === c.local_gov_id),
          nhis_branches: sortedNhis?.find(n => String(n.id) === String(c.nhis_branch_id)),
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
      setGovs(sortedGovs); 
      setNhisBranches(sortedNhis); 
      setProducts(prodData || []);
    } catch (error) {
      console.error("데이터 불러오기 실패:", error);
    }
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
      const toBase64 = f => new Promise((res, rej) => { 
        const r = new FileReader(); 
        r.readAsDataURL(f); 
        r.onload = () => res(r.result.split(',')[1]); 
        r.onerror = (error) => rej(error);
      });
      const base64 = await toBase64(file);

      let mimeType = file.type;
      if (!mimeType) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'pdf') mimeType = 'application/pdf';
        else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'png') mimeType = 'image/png';
        else mimeType = 'application/octet-stream';
      }

      const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

      const promptText = `
        첨부된 문서(복지카드, 신분증, 처방전 등) 데이터를 분석해서 대상자 정보를 추출해 줘.
        너는 무조건 부가 설명이나 마크다운 표현을 완전히 배제하고, 오직 아래의 JSON 포맷 규칙을 따르는 '순수 JSON 문자열'만 출력해야 해. 
        {
          "name": "추출된 성명",
          "gender": "남" 또는 "여",
          "birth_date": "YYYY-MM-DD",
          "qualification": "의료급여, 건강보험, 경감(건강보험) 중 택 1",
          "phone": "010-0000-0000",
          "disability_type": "장애 유형 명칭",
          "disability_level": "심함" 또는 "심하지 않음",
          "zip_code": "우편번호",
          "address": "추출된 기본 주소",
          "detail_address": "상세 주소",
          "resident_number_front": "주민등록번호 앞자리(6자리)"
        }
      `;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
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
      
      if (!res.ok || result.error) {
        throw new Error(result.error?.message || `API 요청 에러 발생 (코드: ${res.status})`);
      }

      const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error("AI 모델이 응답 데이터를 반환하지 않았습니다.");
      }

      const cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const extractedData = JSON.parse(jsonMatch[0]);
        if (extractedData.gender && !['남', '여'].includes(extractedData.gender)) {
          extractedData.gender = extractedData.gender.includes('여') ? '여' : '남';
        }
        
        const validQualifications = ['건강보험', '의료급여', '경감(건강보험)'];
        if (!validQualifications.includes(extractedData.qualification)) {
          extractedData.qualification = '의료급여';
        }

        setFormData(prev => ({ ...prev, ...extractedData }));
        alert('✅ AI 스마트 입력이 성공적으로 완료되었습니다.');
      } else {
        throw new Error('유효한 형태의 데이터(JSON)를 추출하지 못했습니다.');
      }

    } catch (err) { 
      console.error("[AI 추출 프로세스 오류]:", err);
      alert(`❌ AI 문서 분석 실패\n\n원인: ${err.message || '서버 연동 오류'}`); 
    } finally { 
      setIsExtracting(false); 
      if(fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (file) processAiFile(file); };

  async function handleSave() {
    if (!formData.name) return alert('성함은 필수입니다.');

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
        return;
      }

      const { local_governments, nhis_branches, latestClaim, remainingDays, expireDate, ...pureData } = formData;
      const isHealthInsurance = formData.qualification === '건강보험' || formData.qualification === '경감(건강보험)';
      
      const parsedGovId = (!isHealthInsurance && formData.local_gov_id) ? parseInt(formData.local_gov_id) : null;
      const parsedNhisId = (isHealthInsurance && formData.nhis_branch_id) ? formData.nhis_branch_id : null;
      
      const payload = { 
        ...pureData, 
        local_gov_id: parsedGovId,
        nhis_branch_id: parsedNhisId,
        birth_date: formData.birth_date || null,
        company_id: user.id 
      };

      if (editingId) {
        if (isHealthInsurance && payload.resident_number_back) {
           const { error } = await supabase.rpc('update_customer_encrypted', {
             p_id: editingId,
             ...payload
           });
           if (error) {
              const { error: updateError } = await supabase.from('customers').update(payload).eq('id', editingId);
              if (updateError) throw updateError;
           }
        } else {
           const { error } = await supabase.from('customers').update(payload).eq('id', editingId);
           if (error) throw error;
        }
        
        closeModal(); 
        fetchData(); 
      } else {
        if (isHealthInsurance && payload.resident_number_back) {
            const { data, error } = await supabase.rpc('insert_customer_encrypted', payload);
             if (error) {
               const { data: insertData, error: insertError } = await supabase.from('customers').insert([payload]).select().single();
               if (insertError) throw insertError;
               handlePostInsert(insertData);
             } else {
                 handlePostInsert(data); 
             }
        } else {
             const { data, error } = await supabase.from('customers').insert([payload]).select().single();
             if (error) throw error;
             handlePostInsert(data);
        }
      }
    } catch (err) {
      alert(`데이터 저장 실패:\n${err.message}`);
    }
  }
  
  async function handlePostInsert(data) {
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

  async function handleDeleteCustomer(id) {
    if (window.confirm('대상자 정보를 삭제하시겠습니까?')) {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (!error) {
        fetchData();
        clearFormData(); // 삭제 시 폼 데이터 잔재 방지
      }
    }
  }

  async function handleGrantComplete() {
    if (!grantData.product_id) {
      alert('⚠️ 검색창 하단에 뜨는 상품 목록에서 원하시는 상품을 마우스로 클릭해서 선택해주세요!');
      return;
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert('로그인 세션이 만료되었습니다.');
        return;
      }

      const { error } = await supabase.from('claims').insert([{
        customer_id: selectedCustomer.id,
        product_id: grantData.product_id, 
        carrier: grantData.carrier,
        tracking_no: grantData.tracking_no || null,
        status: '교부 완료',
        claim_date: new Date().toISOString().split('T')[0],
        total_amount: parseInt(grantData.total_amount) || 0,
        quantity: parseInt(grantData.quantity) || 1,
        company_id: user.id 
      }]);
      
      if (error) throw error;
      
      alert('✅ 교부 처리가 완료되었습니다! 청구 관리 탭에서 확인해주세요.');
      setIsGrantModalOpen(false); 
      clearGrantData(); // 💡 완료 후 폼 초기화
      setProductSearch('');
      fetchData();

    } catch (error) {
      alert(`❌ 교부 처리 중 DB 에러가 발생했습니다:\n\n${error.message}`);
      console.error(error);
    }
  }

  // 신규 대상자 등록 (모달 오픈)
  const openCreateModal = () => {
    clearFormData(); // 💡 신규 등록 시 깨끗하게 비우기
    setSelectedPrimaryRegion(''); 
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = async (c) => {
    let decryptedBack = '';
    const isHealthInsurance = c.qualification === '건강보험' || c.qualification === '경감(건강보험)';
    if (isHealthInsurance) {
        try {
            const { data, error } = await supabase.rpc('get_customer_decrypted', { p_customer_id: c.id });
            if (!error && data && data.length > 0) {
                 decryptedBack = data[0].resident_number_back || '';
            }
        } catch(e) {
            console.warn("복호화 데이터 가져오기 실패 (기존 데이터 사용 시도)", e);
        }
    }

    setFormData({ 
      ...c, 
      local_gov_id: c.local_gov_id?.toString() || '',
      nhis_branch_id: c.nhis_branch_id?.toString() || '', 
      qualification: c.qualification || '의료급여',
      resident_number_front: c.resident_number_front || c.resident_number?.split('-')[0] || '', 
      resident_number_back: decryptedBack || c.resident_number_back || c.resident_number?.split('-')[1] || ''
    }); 

    if (isHealthInsurance) {
      const branch = nhisBranches.find(b => String(b.id) === String(c.nhis_branch_id));
      setSelectedPrimaryRegion(branch?.region?.split(' ')[0] || '');
    } else {
      const gov = govs.find(g => String(g.id) === String(c.local_gov_id));
      setSelectedPrimaryRegion(gov?.name?.split(' ')[0] || '');
    }

    setEditingId(c.id); setIsModalOpen(true);
    setTimeout(() => { 
      if (c.signature && canvasRef.current) { 
        const ctx = canvasRef.current.getContext('2d'); 
        const img = new Image(); 
        img.onload = () => ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height); 
        img.src = c.signature; 
      } 
    }, 200);
  };

  const closeModal = () => { 
    setIsModalOpen(false); 
    setEditingId(null); 
    clearFormData(); // 💡 닫을 때 작성 중인 폼 임시 데이터 비우기
  };

  const getCoordinates = (e) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    
    const r = c.getBoundingClientRect();
    const scaleX = c.width / r.width;
    const scaleY = c.height / r.height;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    return { 
      x: (clientX - r.left) * scaleX, 
      y: (clientY - r.top) * scaleY 
    };
  };

  const startDrawing = (e) => { 
    if (e.cancelable) e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  };

  const draw = (e) => { 
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault(); 
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => { 
    if (isDrawing) { 
      setIsDrawing(false); 
      setFormData(p => ({ ...p, signature: canvasRef.current.toDataURL('image/png') })); 
    } 
  };

  const renderLifespanStatus = (c) => {
    const claim = c.latestClaim;
    if (!claim || !claim.device) return <span className="text-gray-300 font-bold text-xs">교부 내역 없음</span>;
    
    const deviceName = claim.device.name;
    
    if (c.remainingDays === Infinity) return (
      <div>
        <p className="text-sm font-black text-gray-800 line-clamp-1">{deviceName}</p>
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
        <p className="text-sm font-black text-gray-800 line-clamp-1" title={deviceName}>
          {deviceName}
        </p>
        <div className="flex items-center gap-1">
          <Clock className="text-gray-400" size={12}/>
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

  const isHealthInsuranceForm = formData.qualification === '건강보험' || formData.qualification === '경감(건강보험)';
  
  const primaryOptions = isHealthInsuranceForm 
    ? [...new Set(nhisBranches.map(b => b.region?.split(' ')[0]).filter(r => r && r !== '-' && r !== '기타'))].sort()
    : [...new Set(govs.map(g => g.name?.split(' ')[0]).filter(r => r && r !== '-' && r !== '기타'))].sort();

  const secondaryOptions = isHealthInsuranceForm
    ? nhisBranches.filter(b => b.region?.split(' ')[0] === selectedPrimaryRegion)
    : govs.filter(g => g.name?.split(' ')[0] === selectedPrimaryRegion);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-20 font-sans">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter">대상자 관리</h1>
          <p className="text-gray-500 mt-2 font-bold flex items-center gap-2"><Users size={18} className="text-blue-600"/> 총 {customers.length}명 등록됨</p>
        </div>
        <button onClick={openCreateModal} className="w-full md:w-auto bg-blue-600 text-white px-6 md:px-8 py-3.5 md:py-4 rounded-2xl md:rounded-[1.5rem] font-black shadow-xl flex items-center justify-center gap-2 hover:scale-105 transition-all">
          <Plus size={20}/> 신규 대상자 등록
        </button>
      </div>

      <div className="bg-white p-2 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-sm flex items-center focus-within:border-blue-200 transition-all font-bold">
        <Search className="ml-4 md:ml-6 text-gray-400" size={20}/>
        <input type="text" placeholder="성함 또는 연락처 검색..." className="w-full p-4 md:p-5 outline-none bg-transparent" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="block md:hidden space-y-4">
        {currentItems.length > 0 ? (
          currentItems.map((c) => (
            <div key={c.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-black text-gray-900 flex items-center gap-1.5 flex-wrap">
                    {c.name} <span className="text-xs text-gray-400 font-bold ml-1">({c.gender})</span>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] whitespace-nowrap">{c.qualification || '의료급여'}</span>
                  </h3>
                  <p className="text-[11px] font-bold text-blue-600 mt-0.5">
                    {(c.qualification === '건강보험' || c.qualification === '경감(건강보험)')
                      ? cleanBranchName(c.nhis_branches?.name || '공단지사 미지정')
                      : (c.local_governments?.name || '관할 미지정')}
                  </p>
                </div>
                
                <div className="flex gap-1.5">
                  <button onClick={() => { setSelectedCustomer(c); setIsGrantModalOpen(true); }} className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Truck size={14}/></button>
                  <button onClick={() => handleDeleteCustomer(c.id)} className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center"><Trash2 size={14}/></button>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-3 mb-4">
                {renderLifespanStatus(c)}
              </div>

              {!c.signature ? (
                <button onClick={() => openEditModal(c)} className="w-full py-3 bg-indigo-50 text-indigo-700 font-black rounded-xl border border-indigo-100 shadow-sm flex items-center justify-center gap-2 animate-pulse">
                  <PenTool size={16}/> 대상자 서명하기
                </button>
              ) : (
                <button onClick={() => openEditModal(c)} className="w-full py-3 bg-white text-gray-600 font-black rounded-xl border border-gray-200 shadow-sm flex items-center justify-center gap-2">
                  <Edit3 size={16}/> 정보 및 서명 수정
                </button>
              )}
            </div>
          ))
        ) : (
           <div className="p-10 text-center text-gray-400 font-bold bg-white rounded-2xl border border-gray-100">검색 결과가 없습니다.</div>
        )}
      </div>

      <div className="hidden md:block bg-white border border-gray-100 rounded-[2.5rem] shadow-xl overflow-hidden mt-6">
        <table className="w-full text-left text-sm font-bold">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-50 text-[11px] font-black text-gray-400 uppercase tracking-widest">
              <th className="p-7 w-20 text-center">No.</th>
              <th className="p-7">수급자 정보</th>
              <th className="p-7">관할 기관(지자체/공단)</th>
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
                    <td className="p-7 text-center text-gray-400 font-black">{serialNumber}</td>
                    <td className="p-7 text-gray-900 font-black flex items-center gap-2">
                      {c.name} ({c.gender})
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px]">{c.qualification || '의료급여'}</span>
                    </td>
                    <td className="p-7 text-gray-700">
                      {(c.qualification === '건강보험' || c.qualification === '경감(건강보험)')
                        ? cleanBranchName(c.nhis_branches?.name || '미지정')
                        : (c.local_governments?.name || '미지정')}
                    </td>
                    <td className="p-7">{renderLifespanStatus(c)}</td>
                    <td className="p-7 text-center">{c.signature ? <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-md text-xs font-black">완료</span> : <span className="bg-red-50 text-red-600 px-3 py-1 rounded-md text-xs font-black">필요</span>}</td>
                    <td className="p-7 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setSelectedCustomer(c); setIsGrantModalOpen(true); }} className="p-3 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Truck size={18}/></button>
                        <button onClick={() => openEditModal(c)} className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-gray-900 transition-all"><Edit3 size={18}/></button>
                        <button onClick={() => handleDeleteCustomer(c.id)} className="p-3 bg-gray-50 text-gray-300 rounded-xl hover:text-red-500 transition-all"><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="p-10 text-center text-gray-400 font-bold">검색된 대상자가 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="py-4 md:p-6 bg-transparent md:bg-white border-none md:border-t md:border-gray-50 flex items-center justify-center gap-2">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
            disabled={currentPage === 1}
            className="p-2 rounded-xl text-gray-400 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          >
            <ChevronLeft size={20}/>
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
            className="p-2 rounded-xl text-gray-400 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          >
            <ChevronRight size={20}/>
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 flex flex-col max-h-[95vh] font-bold">
            <div className="p-6 md:p-10 border-b bg-blue-50/30 flex justify-between items-center shrink-0">
              <h4 className="text-xl md:text-2xl font-black">{editingId ? '대상자 정보 수정' : '신규 대상자 등록'}</h4>
              <button onClick={closeModal} className="p-2 rounded-full hover:bg-white"><X size={24}/></button>
            </div>
            
            <div className="p-5 md:p-10 space-y-6 md:space-y-8 overflow-y-auto flex-1 custom-scrollbar">
              
              {!editingId && (
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative overflow-hidden rounded-2xl md:rounded-[2rem] border-2 transition-all flex flex-col md:flex-row items-center justify-between p-5 md:p-6 gap-4 ${
                    isDragging 
                      ? 'border-indigo-500 bg-indigo-50/80 shadow-inner scale-[0.99]' 
                      : 'border-transparent bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-700 shadow-lg'
                  }`}
                >
                  <input type="file" accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={(e) => processAiFile(e.target.files[0])} />
                  
                  {!isDragging && (
                    <div className="absolute -top-10 -right-4 p-4 opacity-10 pointer-events-none hidden md:block">
                      <Sparkles size={160}/>
                    </div>
                  )}

                  <div className="flex items-center gap-4 z-10 w-full md:w-auto text-center md:text-left">
                    <div className={`p-4 rounded-2xl backdrop-blur-md shadow-inner transition-colors hidden md:block ${isDragging ? 'bg-indigo-600 text-white' : 'bg-white/20 text-white'}`}>
                      <FileText size={28}/>
                    </div>
                    <div className="w-full">
                      <h5 className={`text-lg md:text-xl font-black mb-1 tracking-tight transition-colors ${isDragging ? 'text-indigo-900' : 'text-white'}`}>
                        {isDragging ? '여기에 드롭하여 스캔 시작!' : 'AI 서류 스마트 입력'}
                      </h5>
                      <p className={`text-xs md:text-[13px] font-bold max-w-full md:max-w-[280px] break-keep transition-colors ${isDragging ? 'text-indigo-700' : 'text-indigo-100'}`}>
                        복지카드, 처방전, 신분증을 첨부하세요. (PDF, JPG)
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => !isExtracting && fileInputRef.current.click()} 
                    disabled={isExtracting} 
                    className={`w-full md:w-auto z-10 px-6 py-3.5 md:py-4 rounded-xl md:rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${
                      isDragging 
                        ? 'bg-indigo-100 text-indigo-400 pointer-events-none shadow-none opacity-0' 
                        : 'bg-white text-indigo-600 hover:bg-indigo-50 hover:scale-[1.02] active:scale-95 shadow-xl disabled:opacity-70 disabled:hover:scale-100'
                    }`}
                  >
                    {isExtracting ? (
                      <><Loader2 className="animate-spin" size={20}/> 분석 중...</>
                    ) : (
                      <><Upload size={20}/> 파일 첨부</>
                    )}
                  </button>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
                <div className="space-y-1.5"><label className="text-xs text-gray-400 ml-1">성함</label><input placeholder="성함" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div className="space-y-1.5"><label className="text-xs text-gray-400 ml-1">성별</label><div className="flex bg-gray-50 p-1 rounded-xl md:rounded-2xl">{['남', '여'].map(g => (<button key={g} onClick={() => setFormData({...formData, gender: g})} className={`flex-1 py-2.5 md:py-3 rounded-lg md:rounded-xl transition-all ${formData.gender === g ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>{g}</button>))}</div></div>
                <div className="space-y-1.5"><label className="text-xs text-gray-400 ml-1">생년월일</label><input type="date" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl outline-none" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} /></div>
                
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 ml-1">자격사항</label>
                  <select 
                    className="w-full bg-indigo-50/50 text-indigo-900 font-black p-3.5 md:p-4 rounded-xl md:rounded-2xl outline-none border border-indigo-100" 
                    value={formData.qualification} 
                    onChange={e => {
                      setFormData({
                        ...formData, 
                        qualification: e.target.value, 
                        local_gov_id: '', 
                        nhis_branch_id: '' 
                      });
                      setSelectedPrimaryRegion(''); 
                    }}
                  >
                    <option value="의료급여">의료급여</option>
                    <option value="건강보험">건강보험</option>
                    <option value="경감(건강보험)">경감(건강보험)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="flex gap-3">
                  <div className="w-2/5 space-y-1.5">
                    <label className="text-xs text-gray-400 ml-1">관할 지역 (시/도)</label>
                    <select 
                      className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl outline-none"
                      value={selectedPrimaryRegion}
                      onChange={(e) => {
                        setSelectedPrimaryRegion(e.target.value);
                        setFormData({...formData, local_gov_id: '', nhis_branch_id: ''}); 
                      }}
                    >
                      <option value="">시/도 선택</option>
                      {primaryOptions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="w-3/5 space-y-1.5">
                    <label className="text-xs text-gray-400 ml-1">상세 기관명</label>
                    <select 
                      className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl outline-none"
                      value={isHealthInsuranceForm ? formData.nhis_branch_id : formData.local_gov_id}
                      onChange={e => {
                        if (isHealthInsuranceForm) {
                          setFormData({...formData, nhis_branch_id: e.target.value, local_gov_id: ''});
                        } else {
                          setFormData({...formData, local_gov_id: e.target.value, nhis_branch_id: ''});
                        }
                      }}
                      disabled={!selectedPrimaryRegion}
                    >
                      <option value="">{isHealthInsuranceForm ? '공단지사 선택' : '지자체 선택'}</option>
                      {secondaryOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>
                          {isHealthInsuranceForm ? cleanBranchName(opt.name) : opt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-1/2 space-y-1.5"><label className="text-xs text-gray-400 ml-1">장애유형</label><input placeholder="예: 지체" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl outline-none" value={formData.disability_type} onChange={e => setFormData({...formData, disability_type: e.target.value})} /></div>
                  <div className="w-1/2 space-y-1.5"><label className="text-xs text-gray-400 ml-1">장애정도</label><select className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl outline-none" value={formData.disability_level} onChange={e => setFormData({...formData, disability_level: e.target.value})}><option value="심함">심함</option><option value="심하지 않음">심하지 않음</option></select></div>
                </div>
              </div>

              <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 ml-1">주민등록번호</label>
                  <div className="flex items-center gap-2">
                     <input 
                       placeholder="앞 6자리" 
                       maxLength={6}
                       className="w-1/2 bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl outline-none text-center tracking-widest" 
                       value={formData.resident_number_front} 
                       onChange={e => setFormData({...formData, resident_number_front: e.target.value})} 
                     />
                     <span className="text-gray-400 font-bold">-</span>
                     <input 
                       type="password"
                       placeholder={isHealthInsuranceForm ? "뒤 7자리 입력" : "입력 불필요"} 
                       maxLength={7}
                       disabled={!isHealthInsuranceForm}
                       className={`w-1/2 p-3.5 md:p-4 rounded-xl md:rounded-2xl outline-none text-center tracking-widest transition-colors ${isHealthInsuranceForm ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 focus:bg-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`} 
                       value={isHealthInsuranceForm ? formData.resident_number_back : ''} 
                       onChange={e => setFormData({...formData, resident_number_back: e.target.value})} 
                     />
                  </div>
                  {isHealthInsuranceForm && (
                      <p className="text-[11px] text-blue-600 mt-1 ml-1 font-bold">* 건강보험 청구를 위해 주민등록번호 전체 입력이 필요하며, 안전하게 암호화 저장됩니다.</p>
                  )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-1.5"><label className="text-xs text-gray-400 ml-1">연락처</label><input placeholder="연락처" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 ml-1">우편번호</label>
                  <div className="flex gap-2">
                    <input readOnly placeholder="우편번호" className="flex-1 bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl" value={formData.zip_code} />
                    <button onClick={() => new window.daum.Postcode({ oncomplete: d => setFormData(p => ({ ...p, zip_code: d.zonecode, address: d.address })) }).open()} className="px-5 bg-gray-800 text-white rounded-xl md:rounded-2xl font-black hover:bg-black transition-colors">검색</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-1.5"><label className="text-xs text-gray-400 ml-1">주소</label><input readOnly placeholder="주소" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl" value={formData.address} /></div>
                <div className="space-y-1.5"><label className="text-xs text-gray-400 ml-1">상세주소</label><input placeholder="상세주소" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl outline-none" value={formData.detail_address} onChange={e => setFormData({...formData, detail_address: e.target.value})} /></div>
              </div>

              <div className="space-y-3 pt-6 border-t font-black">
                <div className="flex justify-between items-center bg-indigo-50 p-3 rounded-t-xl md:rounded-t-2xl">
                  <span className="text-indigo-900 flex items-center gap-1.5"><PenTool size={16}/> 대상자 정자 서명</span>
                  <button onClick={() => { 
                    const ctx = canvasRef.current.getContext('2d'); 
                    ctx.clearRect(0,0,canvasRef.current.width,canvasRef.current.height); 
                    setFormData(p => ({...p, signature: null})) 
                  }} className="text-rose-500 text-xs font-black bg-white px-3 py-1.5 rounded-lg border border-rose-100 shadow-sm">
                    서명 지우기
                  </button>
                </div>
                
                <div className="w-full aspect-[2/1] md:h-48 bg-white rounded-b-xl md:rounded-b-2xl border-x-2 border-b-2 border-indigo-100 relative overflow-hidden shadow-inner touch-none">
                  <canvas 
                    ref={canvasRef} 
                    width={700} height={300}
                    onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} 
                    className="w-full h-full cursor-crosshair"
                    style={{ touchAction: 'none' }}
                  />
                  {!formData.signature && !isDrawing && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-gray-300 text-sm opacity-50">
                      가운데 영역에 서명해 주세요.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 md:p-8 bg-gray-50 flex gap-3 md:gap-4 font-black shrink-0 border-t border-gray-100">
              <button onClick={closeModal} className="flex-1 py-4 md:py-5 bg-white border border-gray-200 rounded-xl md:rounded-2xl text-gray-400 hover:bg-gray-100 transition-colors">취소</button>
              <button onClick={handleSave} className="flex-1 py-4 md:py-5 bg-blue-600 text-white rounded-xl md:rounded-2xl shadow-xl hover:bg-blue-700 transition-colors">정보 저장하기</button>
            </div>
          </div>
        </div>
      )}
      
      {isGrantModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in font-bold">
          <div className="bg-white w-full max-w-lg rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-6 md:p-8 border-b bg-blue-600 text-white flex justify-between items-center font-black shrink-0">
              <h4 className="text-lg md:text-xl">보조기기 교부</h4>
              <button onClick={() => { setIsGrantModalOpen(false); clearGrantData(); setProductSearch(''); }}><X size={24}/></button>
            </div>
            
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              
              <div className="space-y-2 relative">
                <label className="text-xs text-gray-400 ml-1 font-black">품목 선택</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                  <input 
                    type="text" 
                    placeholder="상품명 검색..." 
                    className="w-full bg-gray-50 pl-11 pr-4 py-3.5 md:py-4 rounded-xl md:rounded-2xl border-none outline-none font-black" 
                    value={productSearch} 
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setGrantData({...grantData, product_name: ''}); 
                    }} 
                  />
                </div>
                {productSearch.trim() && productSearch !== grantData.product_name && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl max-h-48 overflow-y-auto p-2 custom-scrollbar">
                    {products.filter(p => p.name.includes(productSearch)).map(p => (
                      <button 
                        key={p.id} 
                        onClick={() => { 
                          setGrantData({
                            ...grantData, 
                            product_id: p.id, 
                            product_name: p.name, 
                            total_amount: p.price * grantData.quantity, 
                            isManual: false
                          }); 
                          setProductSearch(p.name); 
                        }} 
                        className="w-full flex justify-between p-4 hover:bg-blue-50 rounded-xl transition-all font-black text-sm"
                      >
                        <span>{p.name}</span><span className="text-blue-600">₩{p.price?.toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 ml-1">배송 수단</label>
                  <select 
                    className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl outline-none border-none font-black text-gray-700" 
                    value={grantData.carrier} 
                    onChange={e => setGrantData({...grantData, carrier: e.target.value})}
                  >
                    {courierList.map(carrier => (
                      <option key={carrier} value={carrier}>{carrier}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 ml-1">송장번호/날짜</label>
                  <input 
                    className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl border-none outline-none font-black" 
                    value={grantData.tracking_no} 
                    onChange={(e) => setGrantData({...grantData, tracking_no: e.target.value})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 ml-1">수량</label>
                  <input 
                    type="number"
                    min="1"
                    className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl border-none outline-none font-black" 
                    value={grantData.quantity} 
                    onChange={(e) => {
                      const qty = parseInt(e.target.value) || 1;
                      const matchedProd = products.find(p => p.id === grantData.product_id);
                      const unitPrice = matchedProd ? (matchedProd.price || 0) : 0;
                      setGrantData({
                        ...grantData,
                        quantity: qty,
                        total_amount: unitPrice * qty
                      });
                    }} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 ml-1">총 청구 금액</label>
                  <input 
                    type="number"
                    className="w-full bg-blue-50/50 text-blue-600 p-3.5 md:p-4 rounded-xl md:rounded-2xl border-none outline-none font-black" 
                    value={grantData.total_amount} 
                    onChange={(e) => setGrantData({...grantData, total_amount: e.target.value})} 
                  />
                </div>
              </div>

            </div>
            
            <div className="p-5 md:p-8 bg-gray-50 flex gap-3 md:gap-4 shrink-0 border-t border-gray-100">
              <button onClick={() => { setIsGrantModalOpen(false); clearGrantData(); setProductSearch(''); }} className="flex-1 py-3.5 md:py-4 bg-white border border-gray-200 text-gray-500 rounded-xl md:rounded-2xl hover:bg-gray-100 transition-colors">취소</button>
              <button onClick={handleGrantComplete} className="flex-[2] py-3.5 md:py-4 bg-blue-600 text-white rounded-xl md:rounded-2xl shadow-xl font-black hover:bg-blue-700 transition-colors">
                교부 완료 처리
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}