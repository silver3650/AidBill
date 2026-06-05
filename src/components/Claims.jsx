import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, Truck, X, Package, Mail, Printer, Edit3, Trash2, 
  CheckSquare, Square, Eye, Send, Clock, Calendar, Filter, RefreshCw, ArrowLeft, Plus, ImagePlus, CheckCircle2, Camera, ChevronLeft, ChevronRight, AlertTriangle, FileText, PenTool, Loader2
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useLocation } from 'react-router-dom'; 
import '../App.css'; 

import ClaimFormDoc from '../components/documents/ClaimFormDoc'; 
import ConfirmationDoc from '../components/documents/ConfirmationDoc'; 
import ReceiptDoc from '../components/documents/ReceiptDoc'; 
import EstimateDoc from '../components/documents/EstimateDoc';
import TransactionDoc from '../components/documents/TransactionDoc';
import BenefitClaimFormDoc from '../components/documents/BenefitClaimFormDoc';
import Contracts from '../components/documents/Contracts'; 

import { useAutoSave } from '../hooks/useAutoSave';

const SignaturePad = ({ onSave }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = '#000000'; 
    ctx.lineWidth = 3;         
    ctx.lineCap = 'round';     
    ctx.lineJoin = 'round';    
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    onSave(canvasRef.current.toDataURL('image/png')); 
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onSave(''); 
  };

  return (
    <div className="border border-gray-300 rounded-lg bg-gray-50 overflow-hidden flex flex-col shadow-inner">
      <canvas
        ref={canvasRef}
        width={400} 
        height={120} 
        className="w-full h-24 touch-none cursor-crosshair bg-white"
        onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
        onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
      />
      <div className="flex justify-between items-center p-1.5 bg-gray-100 border-t border-gray-200 shrink-0">
        <span className="text-[10px] text-gray-500 font-bold ml-2 flex items-center gap-1"><PenTool size={12}/> 빈 공간에 드래그하여 서명하세요.</span>
        <button type="button" onClick={clearCanvas} className="text-[11px] bg-white border border-gray-300 text-gray-700 font-bold px-3 py-1 rounded hover:bg-gray-50 flex items-center gap-1 shadow-sm transition-colors">다시 쓰기 (지우기)</button>
      </div>
    </div>
  );
};

const ImageOnlyDoc = ({ title, src, emptyMessage, notice }) => (
  <div className="bg-white w-[210mm] h-[297mm] p-[20mm] flex flex-col items-center justify-start text-slate-900 box-border overflow-hidden relative">
    <h2 className="text-2xl font-black mb-4 tracking-widest">{title}</h2>
    {notice && <p className="text-center text-rose-500 font-bold text-sm mb-8">{notice}</p>}
    {src ? (
      <img src={src} alt={title} className="max-w-full max-h-[220mm] object-contain border border-gray-200 p-2 shadow-sm" />
    ) : (
      <div className="text-gray-400 font-bold border-2 border-dashed border-gray-300 w-full flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-2xl p-10 text-center break-keep">
        {emptyMessage || `${title} 이미지가 등록되지 않았습니다.`}
      </div>
    )}
  </div>
);

export default function Claims() {
  const location = useLocation(); 
  const [claims, setClaims] = useState([]);
  const [filteredClaims, setFilteredClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [allCustomers, setAllCustomers] = useState([]);
  const [allDevices, setAllDevices] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [statusFilter, setStatusFilter] = useState('전체');
  const [groupByCustomer, setGroupByCustomer] = useState(false); 

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [taxInvoiceDate, setTaxInvoiceDate] = useState(new Date().toISOString().split('T')[0]); // 세금계산서 날짜 상태 추가

  const [activeModal, setActiveModal] = useAutoSave('claims_active_modal', null); 
  const [selectedClaim, setSelectedClaim] = useAutoSave('claims_selected_claim', null);
  const [claimSubject, setClaimSubject] = useAutoSave('claims_claim_subject', '기업 (업체 위탁 청구)');

  const [custSearchTerm, setCustSearchTerm] = useAutoSave('claims_cust_search_term', '');
  const [prodSearchTerm, setProdSearchTerm] = useAutoSave('claims_prod_search_term', '');

  const [docInputs, setDocInputs] = useAutoSave('claims_doc_inputs', {
    bank: '', account_number: '', holder: '',
    claimant_name: '', claimant_relation: '', claimant_rrn: '', claimant_phone: '', claimant_sign: '' 
  });

  const [newData, setNewData, clearNewData] = useAutoSave('claims_new_data', { 
    customer_id: '', product_id: '', claim_date: new Date().toISOString().split('T')[0], 
    total_amount: 0, purchase_date: '', mfg_date: '', 
    item_type: 'general', hearing_aid_details: { right: { enabled: false, product_id: '', price: 0 }, left: { enabled: false, product_id: '', price: 0 } }
  });
  
  const [editData, setEditData, clearEditData] = useAutoSave('claims_edit_data', { 
    claim_date: '', total_amount: 0, status: '', carrier: 'CJ대한통운', tracking_no: '', 
    notes: '', purchase_date: '', mfg_date: '', tax_invoice_date: '', deposit_date: '',
    prescription_image: '', inspection_image: '', purchase_proof_image: '', id_card_image: '',
    item_type: 'general', hearing_aid_details: { right: { enabled: false, product_id: '', price: 0 }, left: { enabled: false, product_id: '', price: 0 } }
  });
  
  const [photoFiles, setPhotoFiles, clearPhotoFiles] = useAutoSave('claims_photo_files', []); 
  const [emailData, setEmailData, clearEmailData] = useAutoSave('claims_email_data', { recipient: '', sender: '', subject: '', content: '', files: {} });
  
  const [printFiles, setPrintFiles] = useAutoSave('claims_print_files', {});
  const [isPrintDocPreview, setIsPrintDocPreview] = useAutoSave('claims_is_print_preview', false);
  const [isDocPreview, setIsDocPreview] = useAutoSave('claims_is_doc_preview', false); 
  const [issueDate, setIssueDate] = useAutoSave('claims_issue_date', new Date().toISOString().split('T')[0]);

  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false); 

  const [companyInfo, setCompanyInfo] = useState({
    company_name: '', representative_name: '', representative_birth: '',
    address: '', detail_address: '', zip_code: '', email: '', contact_number: '',
    seal_image: null, biz_reg_image: null, bankbook_image: null, qualifying_docs: [] 
  });

  const pdfContainerRef = useRef(null);

  const DOC_KEY_MAPPING = {
    'cost_claim': '교부비용청구서',
    'delivery_confirm': '교부확인서',
    'receipt': '물품인수증',
    'estimate': '견적서',
    'transaction': '거래명세서',
    'bankbook': '계좌사본',
    'biz_reg': '사업자등록증',
    'etc': '기타 첨부(배송추적 캡쳐본 등)'
  };

  const LOCAL_GOV_DOCS = [
    '교부비용청구서', '교부확인서', '물품인수증', '견적서', '거래명세서', '계좌사본', '사업자등록증', '기타 첨부(배송추적 캡쳐본 등)'
  ];
  
  const NHIS_PERSONAL_DOCS = [
    '보조기기 급여 지급청구서',
    '교부 사진 (기기전체 및 바코드)',
    '처방전',
    '검수확인서',
    '구매 증빙서류 (세금계산서 등)',
    '거래명세서', 
    '신분증 및 복지카드 사본',
    '사업자등록증'
  ];

  const NHIS_COMPANY_DOCS = [
    '보조기기 급여 지급청구서',
    '교부 사진 (기기전체 및 바코드)',
    '처방전',
    '검수확인서',
    '구매 증빙서류 (세금계산서 등)',
    '거래명세서',
    '위임장',
    '신분증 및 복지카드 사본',
    '사업자등록증',
    '교부(판매)업체 자격사항 서류'
  ];

  const isNHISClaim = (claim) => {
    const qual = claim?.customers?.qualification;
    return qual === '건강보험' || qual === '경감(건강보험)';
  };

  const isPrescriptionRequired = (product, itemType, isNHIS) => {
    if (!isNHIS) return false; 
    if (itemType === 'hearing_aid') return true; 
    if (!product) return false;
    const textToCheck = `${product.category || ''} ${product.name || ''}`.toLowerCase();
    const requiredKeywords = ['휠체어', '스쿠터', '보청기', '자세보조용구', '의지', '보조기', '교정용 신발', '이동식전동리프트'];
    return requiredKeywords.some(keyword => textToCheck.includes(keyword));
  };

  const isInspectionExempt = (product) => {
    if (!product) return false;
    const textToCheck = `${product.category || ''} ${product.name || ''}`.toLowerCase();
    const exemptKeywords = ['지팡이', '목발', '보행차', '보행기', '전지', '배터리', '흰지팡이'];
    return exemptKeywords.some(keyword => textToCheck.includes(keyword));
  };

  const getDocsListForClaim = (claim, subject = claimSubject) => {
    const isNHIS = isNHISClaim(claim);
    let docs = [];
    if (isNHIS) {
      docs = (subject || '').includes('기업') ? [...NHIS_COMPANY_DOCS] : [...NHIS_PERSONAL_DOCS];
      if (isInspectionExempt(claim?.products)) docs = docs.filter(doc => doc !== '검수확인서');
      if (!isPrescriptionRequired(claim?.products, claim?.item_type, isNHIS)) docs = docs.filter(doc => doc !== '처방전');
    } else {
      docs = [...LOCAL_GOV_DOCS];
      const govReqDocs = claim?.customers?.local_governments?.required_documents;
      if (govReqDocs) {
        try {
          const parsedReq = typeof govReqDocs === 'string' ? JSON.parse(govReqDocs) : govReqDocs;
          if (Array.isArray(parsedReq)) {
            parsedReq.forEach(key => {
              const translatedName = DOC_KEY_MAPPING[key] || key;
              if (!docs.includes(translatedName)) docs.push(translatedName);
            });
          }
        } catch(e) {}
      }
    }
    return docs;
  };

  const documentComponents = {
    '교부비용청구서': ClaimFormDoc, '교부확인서': ConfirmationDoc, 
    '물품인수증': ReceiptDoc, '견적서': EstimateDoc, '거래명세서': TransactionDoc, 
    '보조기기 급여 지급청구서': BenefitClaimFormDoc, '보청기 구매 표준계약서': Contracts 
  };

  const STATUS_STAGES = ['대기 중', '발주 완료', '배송 중', '교부 완료', '청구 완료 (계산서 미발행)', '청구 완료 (계산서 발행)', '정산 완료'];

  useEffect(() => {
    async function initialize() {
      const { data: { session }, error } = await supabase.auth.getSession();
      const user = session?.user;
      
      if (error || !user) return; 
      await fetchCompanyData(user.id);
      await fetchData(user.id);
    }
    initialize();

    const handleFocus = () => initialize();
    window.addEventListener('focus', handleFocus);

    const script = document.createElement('script');
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.body.appendChild(script);
    
    return () => { 
      if (document.body.contains(script)) document.body.removeChild(script); 
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    if (location.state?.autoOpenCreate && location.state?.customerId) {
      setNewData(prev => ({
        ...prev, customer_id: location.state.customerId, product_id: '', claim_date: new Date().toISOString().split('T')[0],
        total_amount: 0, purchase_date: '', mfg_date: '', item_type: 'general',
        hearing_aid_details: { right: { enabled: false, product_id: '', price: 0 }, left: { enabled: false, product_id: '', price: 0 } }
      }));
      setCustSearchTerm(location.state.customerName || ''); setProdSearchTerm('');
      setActiveModal('create');     
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  async function fetchCompanyData(userId) {
    let { data } = await supabase.from('company_profile').select('*').eq('company_id', userId).single();
    if (!data) {
      const { data: fallbackData } = await supabase.from('company_profile').select('*').eq('id', 1).single();
      if (fallbackData) data = fallbackData;
    }
    if (data) setCompanyInfo({ ...data, qualifying_docs: data.qualifying_docs || [] }); 
  }

  async function fetchData(userId) {
    setLoading(true);
    try {
      const { data: claimData } = await supabase.from('claims').select('*').eq('company_id', userId).order('claim_date', { ascending: false });
      const { data: custData } = await supabase.from('customers').select('*').eq('company_id', userId).order('name');
      const { data: govData } = await supabase.from('local_governments').select('*');
      const { data: nhisData } = await supabase.from('nhis_branches').select('*');
      const { data: deviceData } = await supabase.from('devices').select('*').order('name');

      setAllCustomers(custData || []); setAllDevices(deviceData || []);

      const merged = claimData?.map(h => {
        let customerObj = custData?.find(c => String(c.id) === String(h.customer_id));
        let customerWithGov = null;

        if (customerObj) {
          let fullRrn = customerObj.resident_number;
          if (customerObj.resident_number_front) {
            fullRrn = customerObj.resident_number_back ? `${customerObj.resident_number_front}-${customerObj.resident_number_back}` : `${customerObj.resident_number_front}`;
          }
          customerWithGov = {
            ...customerObj, resident_number: fullRrn,
            local_governments: govData?.find(g => String(g.id) === String(customerObj.local_gov_id)) || null,
            nhis_branches: nhisData?.find(n => String(n.id) === String(customerObj.nhis_branch_id)) || null
          };
        }

        const matchedDevice = deviceData?.find(d => String(d.id) === String(h.product_id) || String(d.id) === String(h.device_id));
        
        let parsedHearing = h.hearing_aid_details;
        if (typeof parsedHearing === 'string') { try { parsedHearing = JSON.parse(parsedHearing); } catch(e) { parsedHearing = null; } }

        let fullProductName = h.product_name || h.item_name || h.device_name || '품목 미지정';
        
        if (h.item_type === 'hearing_aid' && parsedHearing) {
          const parts = [];
          if (parsedHearing.right?.enabled && parsedHearing.right?.product_id) {
            const rDev = deviceData?.find(d => String(d.id) === String(parsedHearing.right.product_id));
            parts.push(`우: ${rDev?.name || '모델미정'}`);
          }
          if (parsedHearing.left?.enabled && parsedHearing.left?.product_id) {
            const lDev = deviceData?.find(d => String(d.id) === String(parsedHearing.left.product_id));
            parts.push(`좌: ${lDev?.name || '모델미정'}`);
          }
          fullProductName = parts.length > 0 ? `보청기 (${parts.join(' / ')})` : '보청기 (선택없음)';
        } else if (matchedDevice) {
          fullProductName = matchedDevice.category ? `[${matchedDevice.category}] ${matchedDevice.name}` : matchedDevice.name;
        } else if (h.manual_product_name) {
          fullProductName = h.manual_product_name;
        }

        let parsedPhotos = [];
        if (typeof h.receipt_photos === 'string') { try { parsedPhotos = JSON.parse(h.receipt_photos); } catch(e) {} } 
        else if (Array.isArray(h.receipt_photos)) parsedPhotos = h.receipt_photos;

        let mappedStatus = h.status || '대기 중';
        if (mappedStatus === '지급 완료') mappedStatus = '정산 완료';
        else if (mappedStatus === '청구 완료') mappedStatus = '청구 완료 (계산서 미발행)'; 

        return {
          ...h, customers: customerWithGov, hearing_aid_details: parsedHearing,
          products: { ...matchedDevice, name: fullProductName, purchase_date: h.purchase_date || matchedDevice?.purchase_date || '', mfg_date: h.mfg_date || matchedDevice?.mfg_date || '' },
          status: mappedStatus, receipt_photos: parsedPhotos, 
          prescription_image: h.prescription_image || null,
          inspection_image: h.inspection_image || null,
          purchase_proof_image: h.purchase_proof_image || null,
          id_card_image: h.id_card_image || null
        };
      });
      setClaims(merged || []);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    let result = [...claims];
    const term = searchTerm.toLowerCase();
    if (term) {
      result = result.filter(h => 
        (h.customers?.name?.toLowerCase() || '').includes(term) || 
        (h.customers?.local_governments?.name?.toLowerCase() || '').includes(term) ||
        (h.customers?.nhis_branches?.name?.toLowerCase() || '').includes(term)
      );
    }
    if (statusFilter !== '전체') result = result.filter(h => h.status === statusFilter);
    if (dateRange.start && dateRange.end) result = result.filter(h => h.claim_date >= dateRange.start && h.claim_date <= dateRange.end);
    
    if (groupByCustomer) {
      result.sort((a, b) => {
        const nameA = a.customers?.name || ''; const nameB = b.customers?.name || '';
        if (nameA !== nameB) return nameA.localeCompare(nameB, 'ko');
        return new Date(b.claim_date) - new Date(a.claim_date);
      });
    }

    setFilteredClaims(result);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateRange, claims, groupByCustomer]);

  const cleanString = (str) => (str || '').replace(/\s+/g, '').toLowerCase();

  const filteredCustomersForSelect = allCustomers.filter(c => {
    const combinedText = `${c.name || ''}${c.birth_date || ''}`;
    return cleanString(combinedText).includes(cleanString(custSearchTerm));
  });

  const filteredDevicesForSelect = allDevices.filter(d => {
    const combinedText = `${d.category || ''}${d.name || ''}`;
    return cleanString(combinedText).includes(cleanString(prodSearchTerm));
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredClaims.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredClaims.length / itemsPerPage) || 1;

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  const setQuickDate = (type) => {
    const getFormattedDate = (dateObj) => `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    const today = new Date(); const end = getFormattedDate(today); let start = '';
    if (type === 'today') { start = end; } 
    else if (type === 'week') { const d = new Date(); d.setDate(d.getDate() - 7); start = getFormattedDate(d); } 
    else if (type === 'month') { const d = new Date(); d.setMonth(d.getMonth() - 1); start = getFormattedDate(d); }
    setDateRange({ start, end });
  };

  const resetFilters = () => { setSearchTerm(''); setDateRange({ start: '', end: '' }); setStatusFilter('전체'); setGroupByCustomer(false); };

  const handleDelete = async (id) => {
    if (window.confirm('이 청구 내역을 영구 삭제하시겠습니까?')) {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      await supabase.from('claims').delete().eq('id', id);
      setActiveModal(null);
      clearEditData();
      clearPhotoFiles();
      if (user) fetchData(user.id);
    }
  };

  const handleHearingAidChange = (target, ear, field, value) => {
    const updateFn = target === 'newData' ? setNewData : setEditData;
    updateFn(prev => {
      const updated = {
        ...prev,
        hearing_aid_details: {
          ...(prev.hearing_aid_details || {}),
          [ear]: { ...(prev.hearing_aid_details?.[ear] || {}), [field]: value }
        }
      };
      
      if (field === 'product_id') {
        const matched = allDevices.find(d => String(d.id) === String(value));
        if (matched) updated.hearing_aid_details[ear].price = matched.price || 0;
      }
      
      if (updated.item_type === 'hearing_aid') {
         const r = updated.hearing_aid_details.right?.enabled ? parseInt(updated.hearing_aid_details.right.price || 0) : 0;
         const l = updated.hearing_aid_details.left?.enabled ? parseInt(updated.hearing_aid_details.left.price || 0) : 0;
         updated.total_amount = r + l;
      }
      return updated;
    });
  };

  const handleCreateSubmit = async () => {
    if (!newData.customer_id) { alert('대상자를 선택해 주세요.'); return; }
    if (newData.item_type === 'general' && !newData.product_id) { alert('일반 상품을 선택해 주세요.'); return; }
    if (newData.item_type === 'hearing_aid' && !newData.hearing_aid_details.right.enabled && !newData.hearing_aid_details.left.enabled) {
      alert('보청기 좌/우 중 최소 1개 이상을 선택해 주세요.'); return;
    }

    const { data: { session }, error: userError } = await supabase.auth.getSession();
    const user = session?.user;
    if (userError || !user) { alert('로그인 세션이 만료되었습니다.'); return; }

    const selectedCustomer = allCustomers.find(c => String(c.id) === String(newData.customer_id));
    const isNHIS = selectedCustomer && (selectedCustomer.qualification === '건강보험' || selectedCustomer.qualification === '경감(건강보험)');

    let primaryProductId = newData.product_id;
    if (newData.item_type === 'hearing_aid') {
      const hData = newData.hearing_aid_details;
      if (hData.right.enabled && hData.right.product_id) primaryProductId = hData.right.product_id;
      else if (hData.left.enabled && hData.left.product_id) primaryProductId = hData.left.product_id;
    }

    const payload = {
      customer_id: newData.customer_id, 
      product_id: primaryProductId || null,
      claim_date: newData.claim_date, 
      total_amount: parseInt(newData.total_amount) || 0, 
      purchase_date: newData.purchase_date || null,
      mfg_date: newData.mfg_date || null,
      status: '대기 중',
      claim_type: isNHIS ? '공단' : '지자체',
      company_id: user.id,
      item_type: newData.item_type,
      hearing_aid_details: newData.item_type === 'hearing_aid' ? newData.hearing_aid_details : null
    };

    const { error } = await supabase.from('claims').insert([payload]);

    if (!error) {
      alert('접수 완료되었습니다.'); 
      setActiveModal(null);
      clearNewData(); 
      setCustSearchTerm(''); setProdSearchTerm('');
      fetchData(user.id);
    } else {
      alert('접수 실패: ' + error.message);
    }
  };

  const openProductAssignmentModal = (claim) => {
    setNewData({
      customer_id: claim.customer_id || '', product_id: '', claim_date: new Date().toISOString().split('T')[0],
      total_amount: 0, purchase_date: '', mfg_date: '', item_type: 'general',
      hearing_aid_details: { right: { enabled: false, product_id: '', price: 0 }, left: { enabled: false, product_id: '', price: 0 } }
    });
    setCustSearchTerm(claim.customers?.name || ''); setProdSearchTerm('');
    setActiveModal('create');
  };

  const openEditModal = (claim) => {
    setSelectedClaim(claim);
    let parsedHearing = claim.hearing_aid_details;
    if(typeof parsedHearing === 'string') { try { parsedHearing = JSON.parse(parsedHearing); } catch(e) { parsedHearing = null; } }

    setEditData({
      claim_date: claim.claim_date || '', total_amount: claim.total_amount || 0,
      status: claim.status || '대기 중', carrier: claim.carrier || 'CJ대한통운',
      tracking_no: claim.tracking_no || '', notes: claim.notes || '',
      purchase_date: claim.purchase_date || '', mfg_date: claim.mfg_date || '',
      tax_invoice_date: claim.tax_invoice_date || '', deposit_date: claim.deposit_date || '',
      prescription_image: claim.prescription_image || '',
      inspection_image: claim.inspection_image || '',
      purchase_proof_image: claim.purchase_proof_image || '',
      id_card_image: claim.id_card_image || '',
      item_type: claim.item_type || 'general',
      hearing_aid_details: parsedHearing || { right: { enabled: false, product_id: '', price: 0 }, left: { enabled: false, product_id: '', price: 0 } }
    });
    setPhotoFiles(claim.receipt_photos || []);
    setActiveModal('edit');
  };

  const handlePhotoFilesChange = async (e) => {
    const files = Array.from(e.target.files);
    if (photoFiles.length + files.length > 3) { alert('사진은 최대 3장까지만 추가할 수 있습니다.'); return; }
    const compressImage = (file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image(); img.src = event.target.result;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 600; let scaleSize = 1;
            if (img.width > MAX_WIDTH) { scaleSize = MAX_WIDTH / img.width; }
            canvas.width = img.width * scaleSize; canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.5)); 
          };
        };
      });
    };

    try {
      const compressedFiles = await Promise.all(files.map(file => compressImage(file)));
      setPhotoFiles(prev => [...prev, ...compressedFiles].slice(0, 3));
    } catch (err) { alert('사진을 처리하는 중 오류가 발생했습니다.'); }
  };

  const handleSingleDocUpload = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image(); img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; let scaleSize = 1;
        if (img.width > MAX_WIDTH) { scaleSize = MAX_WIDTH / img.width; }
        canvas.width = img.width * scaleSize; canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setEditData(prev => ({ ...prev, [field]: canvas.toDataURL('image/jpeg', 0.6) }));
      };
    };
  };

  const handleEditSubmit = async () => {
    setIsSavingEdit(true);
    try {
      let newStatus = editData.status;
      
      if (photoFiles.length > 0 && ['대기 중', '발주 완료', '배송 중'].includes(newStatus)) newStatus = '교부 완료';
      else if (editData.tracking_no && ['대기 중', '발주 완료'].includes(newStatus)) newStatus = '배송 중';
      
      const payload = {
        claim_date: editData.claim_date, total_amount: Number(editData.total_amount) || 0,
        status: newStatus, carrier: editData.carrier, tracking_no: editData.tracking_no,
        receipt_photos: photoFiles.length > 0 ? JSON.stringify(photoFiles) : null,
        notes: editData.notes || '', purchase_date: editData.purchase_date || null,
        mfg_date: editData.mfg_date || null,
        tax_invoice_date: editData.tax_invoice_date || null,
        deposit_date: editData.deposit_date || null,
        prescription_image: editData.prescription_image || null,
        inspection_image: editData.inspection_image || null,
        purchase_proof_image: editData.purchase_proof_image || null,
        id_card_image: editData.id_card_image || null,
        item_type: editData.item_type,
        hearing_aid_details: editData.item_type === 'hearing_aid' ? editData.hearing_aid_details : null
      };

      if (editData.item_type === 'hearing_aid') {
        const hData = editData.hearing_aid_details;
        if (hData.right?.enabled && hData.right?.product_id) payload.product_id = hData.right.product_id;
        else if (hData.left?.enabled && hData.left?.product_id) payload.product_id = hData.left.product_id;
      }

      const { error } = await supabase.from('claims').update(payload).eq('id', selectedClaim.id);
      if (error) throw error;
      
      alert('내역 수정 및 저장이 완료되었습니다.'); 
      setActiveModal(null); 
      clearEditData();   
      clearPhotoFiles(); 
      
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) fetchData(user.id); 
      
    } catch (error) {
      alert(`저장 중 오류가 발생했습니다.\n상세 사유: ${error.message || JSON.stringify(error)}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleTaxInvoiceSave = async () => {
    if (!taxInvoiceDate) return alert('발행일을 지정해 주세요.');
    try {
      const { error } = await supabase.from('claims').update({
        status: '청구 완료 (계산서 발행)',
        tax_invoice_date: taxInvoiceDate
      }).eq('id', selectedClaim.id);
      
      if (error) throw error;
      alert('세금계산서 발행 처리가 완료되었습니다.');
      setActiveModal(null);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) fetchData(user.id);
    } catch (err) {
      alert('오류가 발생했습니다: ' + err.message);
    }
  };

  const handleOrderComplete = async (id) => {
    if (window.confirm('외부 발주 처리를 완료하셨습니까?\n해당 건의 상태를 [발주 완료]로 즉시 변경합니다.')) {
      try {
        const { error } = await supabase.from('claims').update({ status: '발주 완료' }).eq('id', id);
        if (error) throw error;
        
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (user) fetchData(user.id);
      } catch (err) {
        alert('상태 변경 중 오류가 발생했습니다: ' + err.message);
      }
    }
  };

  const handleSettlementSave = async () => {
    if (!depositDate) return alert('입금일을 지정해 주세요.');
    try {
      const { error } = await supabase.from('claims').update({ 
        status: '정산 완료',
        deposit_date: depositDate
      }).eq('id', selectedClaim.id);
      
      if (error) throw error;
      
      alert('최종 완료로 마감되었습니다.');
      setActiveModal(null);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) fetchData(user.id);
    } catch (err) {
      alert('오류가 발생했습니다: ' + err.message);
    }
  };

  const getInitialFilesFromGov = (claim, subject) => {
    const initialFiles = {};
    const fullDocsList = getDocsListForClaim(claim, subject) || [];
    
    let defaultCheckedDocs = [...fullDocsList];
    const isNHIS = isNHISClaim(claim);
    
    if (!isNHIS) {
      const govReqDocs = claim?.customers?.local_governments?.required_documents;
      if (govReqDocs) {
        try {
          const parsed = typeof govReqDocs === 'string' ? JSON.parse(govReqDocs) : govReqDocs;
          if (Array.isArray(parsed)) {
            defaultCheckedDocs = parsed.map(key => DOC_KEY_MAPPING[key] || key);
          }
        } catch(e) {}
      }
    }

    fullDocsList.forEach(docName => {
      initialFiles[docName] = defaultCheckedDocs.includes(docName);
    });

    return initialFiles;
  };

  const getEmailOptions = () => {
    if (!selectedClaim) return [];
    const gov = selectedClaim?.customers?.local_governments || selectedClaim?.customers?.nhis_branches || {};
    const options = [];
    if (gov?.email) options.push(`${gov.email} (${gov.name}/${gov.manager_name || '대표'})`);
    let managers = [];
    if (typeof gov?.managers === 'string') { try { managers = JSON.parse(gov.managers); } catch(e) {} } else if (Array.isArray(gov?.managers)) { managers = gov.managers; }
    managers.forEach(m => { if (m?.email) options.push(`${m.email} (${gov.name}/${m.name || '담당자'})`); });
    return [...new Set(options)]; 
  };

  const openEmailModal = (claim) => {
    try {
      setSelectedClaim(claim); 
      setIssueDate(new Date().toISOString().split('T')[0]); 
      setClaimSubject('기업 (업체 위탁 청구)'); 
      setDocInputs({ bank: '', account_number: '', holder: '', claimant_name: '', claimant_relation: '', claimant_rrn: '', claimant_phone: '', claimant_sign: '' });
      
      const gov = claim?.customers?.local_governments || claim?.customers?.nhis_branches || {};
      let managers = [];
      if (typeof gov?.managers === 'string') { try { managers = JSON.parse(gov.managers); } catch(e) {} } else if (Array.isArray(gov?.managers)) { managers = gov.managers; }
      
      let defaultRecipient = '';
      if (gov?.email) defaultRecipient = `${gov.email} (${gov.name}/${gov.manager_name || '대표'})`;
      else if (managers.length > 0 && managers[0]?.email) defaultRecipient = `${managers[0].email} (${gov.name}/${managers[0].name || '담당자'})`;
      
      const initialFiles = getInitialFilesFromGov(claim, '기업 (업체 위탁 청구)'); 
      
      const currentCompanyName = companyInfo?.company_name || '(주)케어플러스';
      const currentCustomerName = claim?.customers?.name || '대상자';
      const repName = companyInfo?.representative_name || '담당자';
      const contactNum = companyInfo?.contact_number || '';

      setEmailData({ 
        recipient: defaultRecipient, 
        sender: companyInfo?.email || '', 
        files: initialFiles,
        subject: `장애인 보조기기 교부 관련 비용청구서 송부의 건(${currentCustomerName})`, 
        content: `안녕하세요.\n장애인 보조기기 교부 업체 ${currentCompanyName}입니다.\n\n${currentCustomerName} 대상자님의 보조기기 교부와 관련하여,\n정산에 필요한 비용 청구서 및 관련 서류를 첨부와 같이 제출합니다.\n\n감사합니다.\n\n${currentCompanyName} ${repName} 배상\n${contactNum}`.trim()
      });
      setIsDocPreview(false); 
      setActiveModal('email');
    } catch (e) {
      console.error("메일 모달 오픈 에러:", e);
      alert("메일 창을 여는 중 문제가 발생했습니다: " + e.message);
    }
  };

  const openPrintModal = (claim) => {
    try {
      setSelectedClaim(claim); 
      setIssueDate(new Date().toISOString().split('T')[0]); 
      setClaimSubject('기업 (업체 위탁 청구)');
      setDocInputs({ bank: '', account_number: '', holder: '', claimant_name: '', claimant_relation: '', claimant_rrn: '', claimant_phone: '', claimant_sign: '' });
      setPrintFiles(getInitialFilesFromGov(claim, '기업 (업체 위탁 청구)')); 
      setIsPrintDocPreview(false); 
      setActiveModal('print');
    } catch (e) {
      console.error("인쇄 모달 오픈 에러:", e);
      alert("인쇄 창을 여는 중 문제가 발생했습니다: " + e.message);
    }
  };

  const openContractModal = (claim) => {
    try {
      let parsedHearing = claim?.hearing_aid_details;
      if (typeof parsedHearing === 'string') {
        try { parsedHearing = JSON.parse(parsedHearing); } catch(e) { parsedHearing = null; }
      }
      setSelectedClaim({ ...claim, hearing_aid_details: parsedHearing }); 
      setIssueDate(new Date().toISOString().split('T')[0]); 
      setActiveModal('contract');
    } catch (e) {
      console.error("계약서 모달 오픈 에러:", e);
      alert("계약서 창을 여는 중 문제가 발생했습니다: " + e.message);
    }
  };

  const handleSubjectChange = (subject, mode = 'print') => {
    setClaimSubject(subject);
    const newFiles = getInitialFilesFromGov(selectedClaim, subject);
    if (mode === 'print') setPrintFiles(newFiles); else setEmailData({ ...(emailData || {}), files: newFiles });
  };

  const handleSendRealEmail = async () => {
    const emailMatch = (emailData?.recipient || '').match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
    if (!emailMatch) { alert('올바른 수신 메일을 입력해 주세요.'); return; }
    
    const selectedDocuments = getDocsListForClaim(selectedClaim, claimSubject).filter(docName => emailData?.files?.[docName]);

    if (window.confirm(`선택 서류 ${selectedDocuments.length}건을 PDF로 변환 및 발송하시겠습니까?\n(파일 변환에 약간의 시간이 소요될 수 있습니다.)`)) {
      setIsSendingEmail(true);
      try {
        const attachmentsArray = [];
        if (pdfContainerRef.current) {
          const docElements = pdfContainerRef.current.children;
          for (let i = 0; i < docElements.length; i++) {
            const element = docElements[i];
            const docName = element.getAttribute('data-docname') || '문서';
            
            const canvas = await html2canvas(element, { scale: 1.0, useCORS: true, logging: false, allowTaint: true });
            const imgData = canvas.toDataURL('image/jpeg', 0.6);
            
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
            pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
            const pdfDataUri = pdf.output('datauristring');
            
            attachmentsArray.push({ 
              content: pdfDataUri.split('base64,')[1], 
              filename: `${docName.replace(/\s+/g, '_')}_${selectedClaim?.customers?.name || '서류'}.pdf`
            });
          }
        }
        
        const requestBody = { 
          to: emailMatch[1], 
          from: emailData?.sender || 'no-reply@yourdomain.com', 
          subject: emailData?.subject || '', 
          text: emailData?.content || '', 
          attachments: attachmentsArray, 
          companyName: companyInfo?.company_name || '케어플러스'
        };

        const { data, error: invokeError } = await supabase.functions.invoke('send-claim-email', {
          body: requestBody
        });
        
        if (invokeError) {
          console.error("Edge Function Invoke Error Details:", invokeError);
          let exactServerMessage = invokeError.message || JSON.stringify(invokeError);
          if (invokeError.context && typeof invokeError.context.text === 'function') {
            try { exactServerMessage = await invokeError.context.text(); } catch (e) {}
          } else if (invokeError.context && typeof invokeError.context.json === 'function') {
             try { exactServerMessage = JSON.stringify(await invokeError.context.json()); } catch (e) {}
          }
          throw new Error(`Edge 서버 상세 오류:\n${exactServerMessage}`);
        }

        if (data && data.error) {
          throw new Error(`메일 발송 거부:\n${data.error.message || JSON.stringify(data.error)}`);
        }

        await supabase.from('claims').update({ status: '청구 완료 (계산서 미발행)' }).eq('id', selectedClaim?.id);

        alert('메일이 성공적으로 전송되었습니다.'); setActiveModal(null); 
        clearEmailData(); 
        setIsDocPreview(false);
        const { data: { session } } = await supabase.auth.getSession(); 
        const user = session?.user;
        if (user) fetchData(user.id);
      } catch (err) { 
        console.error("Catch Block Email Error:", err);
        alert(`메일 전송 실패!\n\n${err.message || err.toString()}`); 
      } finally { 
        setIsSendingEmail(false); 
      }
    }
  };

  const handleForcePrint = () => { window.print(); };

  const renderDocInputs = () => {
    if (claimSubject === '기업 (업체 위탁 청구)') return null;

    return (
      <div className="mt-4 p-4 md:p-5 bg-white rounded-xl md:rounded-2xl border border-indigo-100 shadow-sm animate-in fade-in">
        <div className="text-[11px] font-black text-indigo-600 mb-4 flex items-center gap-1"><Edit3 size={14}/> {claimSubject === '개인 (본인 계좌 청구)' ? '본인 환급 계좌 정보 (청구서 인쇄용)' : '가족 대리인 및 계좌 정보 (청구서 인쇄용)'}</div>
        {claimSubject === '개인 (가족 계좌 청구)' && (
          <div className="mb-4 pb-4 border-b border-gray-100 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] text-gray-500 font-bold block mb-1">가족 성명</label><input className="w-full p-2.5 text-xs border border-gray-300 rounded-lg outline-none focus:border-indigo-400 focus:bg-indigo-50 transition-colors" value={docInputs.claimant_name} onChange={e => setDocInputs({...docInputs, claimant_name: e.target.value})} placeholder="예: 홍길동" /></div>
              <div><label className="text-[10px] text-gray-500 font-bold block mb-1">대상자와의 관계</label><input className="w-full p-2.5 text-xs border border-gray-300 rounded-lg outline-none focus:border-indigo-400 focus:bg-indigo-50 transition-colors" value={docInputs.claimant_relation} onChange={e => setDocInputs({...docInputs, claimant_relation: e.target.value})} placeholder="예: 배우자, 자녀" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] text-gray-500 font-bold block mb-1">주민등록번호</label><input className="w-full p-2.5 text-xs border border-gray-300 rounded-lg outline-none focus:border-indigo-400 focus:bg-indigo-50 transition-colors" value={docInputs.claimant_rrn} onChange={e => setDocInputs({...docInputs, claimant_rrn: e.target.value})} placeholder="- 포함 14자리" /></div>
              <div><label className="text-[10px] text-gray-500 font-bold block mb-1">연락처</label><input className="w-full p-2.5 text-xs border border-gray-300 rounded-lg outline-none focus:border-indigo-400 focus:bg-indigo-50 transition-colors" value={docInputs.claimant_phone} onChange={e => setDocInputs({...docInputs, claimant_phone: e.target.value})} placeholder="010-0000-0000" /></div>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-bold block mb-2">가족 대리인 서명 (전자 서명)</label>
              <SignaturePad onSave={(dataUrl) => setDocInputs(prev => ({ ...prev, claimant_sign: dataUrl }))} />
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          <div><label className="text-[10px] text-gray-500 font-bold block mb-1">환급 은행명</label><input className="w-full p-2.5 text-xs border border-gray-300 rounded-lg outline-none focus:border-indigo-400 focus:bg-indigo-50 transition-colors" value={docInputs.bank} onChange={e => setDocInputs({...docInputs, bank: e.target.value})} placeholder="예: 국민은행" /></div>
          <div className="col-span-2"><label className="text-[10px] text-gray-500 font-bold block mb-1">계좌번호 (예금주: {claimSubject === '개인 (본인 계좌 청구)' ? selectedClaim?.customers?.name : docInputs.claimant_name})</label><input className="w-full p-2.5 text-xs border border-gray-300 rounded-lg outline-none focus:border-indigo-400 focus:bg-indigo-50 transition-colors" value={docInputs.account_number} onChange={e => setDocInputs({...docInputs, account_number: e.target.value})} placeholder="- 포함 계좌번호 입력" /></div>
        </div>
      </div>
    );
  };

  const renderDelegationDoc = (claimData, companyData) => (
    <div className="bg-white w-[210mm] h-[297mm] p-[20mm] flex flex-col text-slate-900 box-border overflow-hidden relative">
      <h1 className="text-3xl font-black mb-12 text-center tracking-[0.5em] mt-10">위 임 장</h1>
      <table className="w-full border-collapse border-[1.5px] border-black text-[13px] mb-10 text-center">
        <tbody>
          <tr><td rowSpan="3" className="border-[1.5px] border-black p-3 font-bold bg-gray-100 w-[15%]">위임자<br/>(수급자)</td><td className="border-[1.5px] border-black p-3 font-bold bg-gray-50 w-[20%]">성명</td><td className="border-[1.5px] border-black p-3 w-[65%] text-left pl-4 font-black">{claimData.customers?.name}</td></tr>
          <tr><td className="border-[1.5px] border-black p-3 font-bold bg-gray-50">생년월일</td><td className="border-[1.5px] border-black p-3 text-left pl-4 font-bold">{claimData.customers?.birth_date}</td></tr>
          <tr><td className="border-[1.5px] border-black p-3 font-bold bg-gray-50">주소</td><td className="border-[1.5px] border-black p-3 text-left pl-4">{claimData.customers?.address} {claimData.customers?.detail_address}</td></tr>
          <tr><td rowSpan="4" className="border-[1.5px] border-black p-3 font-bold bg-gray-100">수임자<br/>(대리인)</td><td className="border-[1.5px] border-black p-3 font-bold bg-gray-50">업체명</td><td className="border-[1.5px] border-black p-3 text-left pl-4 font-black">{companyData.company_name}</td></tr>
          <tr><td className="border-[1.5px] border-black p-3 font-bold bg-gray-50">대표자</td><td className="border-[1.5px] border-black p-3 text-left pl-4 font-bold">{companyData.representative_name}</td></tr>
          <tr><td className="border-[1.5px] border-black p-3 font-bold bg-gray-50">연락처</td><td className="border-[1.5px] border-black p-3 text-left pl-4 font-bold">{companyData.contact_number}</td></tr>
          <tr><td className="border-[1.5px] border-black p-3 font-bold bg-gray-50">주소</td><td className="border-[1.5px] border-black p-3 text-left pl-4">{companyData.address} {companyData.detail_address}</td></tr>
        </tbody>
      </table>
      <div className="flex-1 flex flex-col justify-center px-6 leading-10 text-[15px] font-bold text-gray-800 tracking-tight"><p className="text-justify indent-4">위 위임자는 「국민건강보험법」 제51조, 같은 법 시행규칙 제26조 및 「장애인보조기기 보험급여 기준 등에 관한 규칙」에 따라 보조기기 급여비용의 지급 청구 및 수령에 관한 일체의 권한을 위 수임자(대리인)에게 위임합니다.</p></div>
      <div className="text-center font-black text-lg mt-10 mb-16 tracking-widest">{claimData.claim_date?.split('-')[0]}년 &nbsp;&nbsp; {claimData.claim_date?.split('-')[1]}월 &nbsp;&nbsp; {claimData.claim_date?.split('-')[2]}일</div>
      <div className="flex justify-end items-center text-[15px] font-bold pr-12 mb-20 relative"><span className="mr-4 text-gray-600">위임자(수급자) :</span><span className="mr-12 font-black text-lg">{claimData.customers?.name}</span><span className="text-gray-400 text-sm">(서명 또는 인)</span>{claimData.customers?.signature && (<img src={claimData.customers.signature} alt="서명" className="absolute right-6 top-1/2 -translate-y-1/2 w-[25mm] h-[15mm] object-contain mix-blend-multiply" />)}</div>
    </div>
  );

  const renderDocUploadBox = (title, field) => (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold text-gray-600">{title}</span>
      {editData[field] ? (
        <div className="relative group w-full h-24 shrink-0">
          <img src={editData[field]} className="w-full h-full object-cover rounded-xl border-2 border-gray-200 shadow-sm transition-all group-hover:brightness-50" alt={title} />
          <button onClick={() => setEditData({...editData, [field]: null})} className="absolute inset-0 m-auto w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
        </div>
      ) : (
        <div className="relative border-2 border-dashed border-emerald-300 rounded-xl w-full h-24 flex flex-col items-center justify-center bg-emerald-50/50 hover:bg-emerald-100 cursor-pointer group shadow-sm shrink-0">
          <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" onChange={(e) => handleSingleDocUpload(e, field)} />
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1 group-hover:bg-emerald-600 group-hover:text-white"><ImagePlus size={16} strokeWidth={2.5} /></div>
          <span className="text-[10px] font-black text-emerald-600 group-hover:text-emerald-800">업로드</span>
        </div>
      )}
    </div>
  );

  const renderDocument = (fileName, claimData) => {
    const TargetDoc = documentComponents[fileName];
    
    let adjustedStandardPrice = claimData.products?.standard_price || 0;
    let adjustedNoticePrice = claimData.products?.price || 0;
    let adjustedActualPrice = claimData.total_amount || 0;

    const qual = claimData.customers?.qualification || '';
    let copayRate = 0.1;
    if (qual.includes('기초') || qual.includes('의료급여')) copayRate = 0;
    else if (qual.includes('경감')) copayRate = 0.05;

    let claimItems = [];
    if (claimData.item_type === 'hearing_aid') {
      adjustedStandardPrice = 1310000;
      const rPrice = claimData.hearing_aid_details?.right?.enabled ? Number(claimData.hearing_aid_details.right.price || 0) : 0;
      const lPrice = claimData.hearing_aid_details?.left?.enabled ? Number(claimData.hearing_aid_details.left.price || 0) : 0;
      adjustedNoticePrice = rPrice + lPrice;
      adjustedActualPrice = Number(claimData.total_amount) || 0;

      if (claimData.hearing_aid_details?.right?.enabled) {
        const rightDev = allDevices.find(d => String(d.id) === String(claimData.hearing_aid_details.right.product_id));
        claimItems.push({
          name: `보청기 (우측)`,
          model: rightDev?.name || '모델미정',
          price: rPrice,
          quantity: 1,
          total: rPrice
        });
      }
      if (claimData.hearing_aid_details?.left?.enabled) {
        const leftDev = allDevices.find(d => String(d.id) === String(claimData.hearing_aid_details.left.product_id));
        claimItems.push({
          name: `보청기 (좌측)`,
          model: leftDev?.name || '모델미정',
          price: lPrice,
          quantity: 1,
          total: lPrice
        });
      }
    } else {
      claimItems.push({
        name: claimData.products?.category ? `[${claimData.products?.category}] ${claimData.products?.name}` : (claimData.products?.name || '품목 미정'),
        model: claimData.products?.model || '',
        price: adjustedActualPrice,
        quantity: 1,
        total: adjustedActualPrice
      });
    }

    const baseCalcPrice = Math.min(adjustedStandardPrice, adjustedNoticePrice, adjustedActualPrice);
    const calculatedCopay = Math.floor(baseCalcPrice * copayRate);
    const calculatedClaimAmount = baseCalcPrice - calculatedCopay;

    const isLocalGov = !isNHISClaim(claimData);
    const transactionRecipientName = isLocalGov ? (claimData.customers?.local_governments?.name || claimData.customers?.name) : claimData.customers?.name;

    const adjustedClaimData = {
      ...claimData,
      total_amount: adjustedActualPrice,
      calculated_copay: calculatedCopay,          
      calculated_claim_amount: calculatedClaimAmount, 
      base_calc_price: baseCalcPrice,              
      customer: {
        ...claimData.customers,
        name: fileName === '거래명세서' ? transactionRecipientName : claimData.customers?.name
      }, 
      items: claimItems, 
      product: {
        ...claimData.products,
        standard_price: adjustedStandardPrice,
        price: adjustedNoticePrice,
        hearing_aid: claimData.item_type === 'hearing_aid' && claimData.hearing_aid_details ? {
          right: claimData.hearing_aid_details.right?.enabled ? { ...(allDevices.find(d => String(d.id) === String(claimData.hearing_aid_details.right.product_id)) || {}), price: claimData.hearing_aid_details.right.price } : null,
          left: claimData.hearing_aid_details.left?.enabled ? { ...(allDevices.find(d => String(d.id) === String(claimData.hearing_aid_details.left.product_id)) || {}), price: claimData.hearing_aid_details.left.price } : null
        } : null
      },
      account: { bank: docInputs.bank || claimData.account?.bank || '', account_number: docInputs.account_number || claimData.account?.account_number || '', holder: docInputs.holder || claimData.account?.holder || '' },
      claimant: { name: docInputs.claimant_name || claimData.claimant?.name || '', relation: docInputs.claimant_relation || claimData.claimant?.relation || '', resident_number: docInputs.claimant_rrn || claimData.claimant?.resident_number || '', phone: docInputs.claimant_phone || claimData.claimant?.phone || '', mobile: docInputs.claimant_phone || claimData.claimant?.mobile || '' },
      company: companyInfo || {},
      signatures: { claimant_sign: docInputs.claimant_sign || claimData.claimant?.signature || claimData.customers?.signature, customer_sign: claimData.customers?.signature, company_seal: companyInfo?.seal_image },
      claimSubject: claimSubject, issueDate: issueDate,
      prescription_image: claimData.prescription_image || null,
      inspection_image: claimData.inspection_image || null,
      purchase_proof_image: claimData.purchase_proof_image || null,
      id_card_image: claimData.id_card_image || null
    };

    if (fileName === '교부비용청구서' || fileName === '거래명세서' || fileName === '보조기기 급여 지급청구서' || fileName === '위임장') adjustedClaimData.claim_date = issueDate;
    else adjustedClaimData.claim_date = claimData.claim_date || issueDate;

    if (TargetDoc) {
      try { 
        const isTransaction = fileName === '거래명세서';
        return (
          <div className="w-[210mm] h-[297mm] box-border relative overflow-hidden bg-white mx-auto flex flex-col justify-start">
            <div style={isTransaction ? { transform: 'scale(0.93)', transformOrigin: 'top center', width: '100%' } : { width: '100%', height: '100%' }}>
              <TargetDoc data={adjustedClaimData} company={companyInfo} />
            </div>
          </div>
        ); 
      } 
      catch (error) { return <div className="h-[297mm] flex flex-col items-center justify-center text-red-500 font-bold bg-red-50 p-10 text-center">서류 렌더링 중 오류가 발생했습니다.<br/>{error.message}</div>; }
    } 
    
    if (fileName === '사업자등록증') {
      return <ImageOnlyDoc title="사업자등록증" src={companyInfo.biz_reg_image} />;
    } else if (fileName === '계좌사본') {
      return <ImageOnlyDoc title="통장 사본 (계좌 사본)" src={companyInfo.bankbook_image} />;
    } else if (fileName === '위임장') {
      return renderDelegationDoc(adjustedClaimData, companyInfo);
    } else if (fileName === '처방전') {
      return <ImageOnlyDoc title="보장구 처방전 사본" src={adjustedClaimData.prescription_image} notice="* 원본 대조필 또는 병원 발행 원본 이미지가 필요합니다." emptyMessage="청구 내역 수정(편집) 화면에서 처방전 이미지를 등록해 주세요." />;
    } else if (fileName === '검수확인서') {
      if (isInspectionExempt(claimData.products)) {
        return (
          <div className="bg-white w-[210mm] h-[297mm] p-[20mm] flex flex-col items-center justify-center text-slate-900 box-border overflow-hidden relative">
            <CheckCircle2 size={64} className="text-emerald-500 mb-6" />
            <h2 className="text-2xl font-black mb-4 tracking-widest text-center">검수확인서 (제출 면제)</h2>
            <p className="text-gray-600 font-bold text-center mt-2 leading-relaxed">대상자가 교부받은 품목 <span className="text-indigo-600 font-black">[{claimData.products?.name}]</span>은(는)<br/>국민건강보험법 시행규칙에 의거하여 검수확인서 제출 면제 대상입니다.</p>
          </div>
        );
      }
      return <ImageOnlyDoc title="검수확인서" src={adjustedClaimData.inspection_image} notice="* 병원 또는 공단에서 발행한 원본 이미지가 필요합니다." emptyMessage="청구 내역 수정(편집) 화면에서 검수확인서 이미지를 등록해 주세요." />;
    } else if (fileName === '구매 증빙서류 (세금계산서 등)') {
      return <ImageOnlyDoc title="구매 증빙서류 (세금계산서 등)" src={adjustedClaimData.purchase_proof_image} notice="* 세금계산서, 신용카드 전표 등" emptyMessage="청구 내역 수정(편집) 화면에서 세금계산서 또는 영수증을 등록해 주세요." />;
    } else if (fileName === '신분증 및 복지카드 사본' || fileName === '신분증 또는 복지카드 사본') {
      return <ImageOnlyDoc title="신분증 및 복지카드 사본" src={adjustedClaimData.id_card_image} notice="* 개인정보보호법에 따라 주민등록번호 뒷자리는 반드시 마스킹 처리되어야 합니다." emptyMessage="청구 내역 수정(편집) 화면에서 신분증/복지카드 사본을 등록해 주세요." />;
    } else if (fileName === '교부(판매)업체 자격사항 서류') {
      return (
        <div className="bg-white w-[210mm] h-[297mm] p-[15mm] flex flex-col text-slate-900 box-border overflow-hidden relative">
          <h2 className="text-2xl font-black mb-6 text-center tracking-widest">업체 자격 서류</h2>
          <div className="flex flex-col gap-6 items-center justify-start flex-1 overflow-hidden w-full">
            {companyInfo.qualifying_docs && companyInfo.qualifying_docs.length > 0 ? (
              companyInfo.qualifying_docs.map((doc, i) => (
                <div key={i} className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
                  <span className="text-sm font-bold text-gray-500 mb-2">{doc.type}</span>
                  {doc.image && <img src={doc.image} className="w-full h-full object-contain border p-2 shadow-sm rounded" alt={doc.type}/>}
                </div>
              ))
            ) : (<div className="text-gray-400 font-bold border-2 border-dashed border-gray-300 w-full h-[150mm] flex items-center justify-center bg-gray-50 rounded-2xl">등록된 업체 자격 서류가 없습니다.</div>)}
          </div>
        </div>
      );
    } else if (fileName.includes('기타 첨부') || fileName.includes('교부 사진')) {
      return (
        <div className="bg-white w-[210mm] h-[297mm] p-[20mm] flex flex-col text-slate-900 box-border overflow-hidden relative">
          <h2 className="text-2xl font-black mb-10 text-center tracking-widest">{fileName.includes('교부 사진') ? '교부 사진 (기기전체 및 바코드)' : '기타 첨부 자료'}</h2>
          <div className="flex flex-col gap-8 items-center justify-center flex-1 overflow-hidden">
            {adjustedClaimData?.receipt_photos && adjustedClaimData.receipt_photos.length > 0 ? (
              adjustedClaimData.receipt_photos.map((src, i) => (<div key={i} className="flex flex-col items-center"><span className="text-sm font-bold text-gray-500 mb-2">사진 {i + 1}</span><img src={src} className="max-w-full max-h-[70mm] object-contain border p-2 shadow-sm" alt={`기타첨부 ${i+1}`}/></div>))
            ) : (<div className="text-gray-400 font-bold border-2 border-dashed border-gray-300 w-full h-[150mm] flex items-center justify-center bg-gray-50 rounded-2xl">등록된 사진이 없습니다.</div>)}
          </div>
        </div>
      );
    }
    return <div className="h-[297mm] flex items-center justify-center text-gray-400 font-bold">문서 양식을 찾을 수 없습니다.</div>;
  };

  const renderStatusPipeline = (claim) => {
    const currentStatus = claim.status;
    const isPhotoMissing = currentStatus === '교부 완료' && (!claim.receipt_photos || claim.receipt_photos.length === 0);
    
    let currentIndex = STATUS_STAGES.indexOf(currentStatus); 
    if (currentIndex === -1) currentIndex = 0;
    
    const formatStageText = (stage) => {
      if (!stage) return null;
      if (stage === '교부 완료' && isPhotoMissing && stage === currentStatus) return (<div className="text-center leading-tight flex flex-col items-center justify-center"><div className="font-extrabold flex items-center gap-1"><AlertTriangle size={10}/> 교부 완료</div><div className="text-[10px] font-black text-rose-500 mt-0.5">(사진 누락)</div></div>);
      if (stage.includes('(')) { const [main, sub] = stage.split(' ('); return (<div className="text-center leading-tight"><div className="font-extrabold">{main}</div><div className="text-[9px] font-bold opacity-80 mt-0.5">({sub.replace(')', '')})</div></div>); }
      return <div className="font-extrabold text-center">{stage}</div>;
    };

    const getStageColor = (stage, isActive) => {
      if (!stage || !isActive) return 'bg-gray-50 text-gray-400 border-gray-200';
      if (stage === '대기 중') return 'bg-slate-100 text-slate-700 border-slate-300';
      if (stage === '발주 완료') return 'bg-sky-50 text-sky-700 border-sky-300 shadow-sm shadow-sky-100'; 
      if (stage === '배송 중') return 'bg-amber-50 text-amber-700 border-amber-300';
      if (stage === '교부 완료') return isPhotoMissing ? 'bg-rose-50 text-rose-600 border-rose-300 ring-1 ring-rose-200' : 'bg-purple-50 text-purple-700 border-purple-300';
      if (stage.includes('미발행')) return 'bg-orange-50 text-orange-700 border-orange-300 shadow-sm shadow-orange-100';
      if (stage.includes('계산서 발행')) return 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm shadow-blue-100';
      if (stage === '정산 완료') return 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm shadow-emerald-100';
      return 'bg-gray-100 text-gray-700 border-gray-300';
    };

    const currentStage = STATUS_STAGES[currentIndex]; 
    const nextStage = currentIndex < STATUS_STAGES.length - 1 ? STATUS_STAGES[currentIndex + 1] : null;

    return (
      <div className="flex flex-col gap-1.5 w-full max-w-[240px] py-1">
        <div className="flex gap-1 items-center px-0.5">
          {STATUS_STAGES.map((_, idx) => (<div key={idx} className={`h-1 flex-1 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-indigo-600' : idx < currentIndex ? 'bg-indigo-200' : 'bg-gray-100'}`} />))}
        </div>
        <div className="flex items-center gap-1.5 justify-start">
          <div className={`px-2.5 py-1 rounded-xl border text-[11px] min-w-[75px] h-[34px] flex items-center justify-center shadow-2sm ${getStageColor(currentStage, true)}`}>{formatStageText(currentStage)}</div>
          {nextStage && (<><span className="text-gray-300 font-black text-xs animate-pulse">➔</span><div className={`px-2.5 py-1 rounded-xl border border-dashed text-[11px] min-w-[75px] h-[34px] flex items-center justify-center opacity-60 ${getStageColor(nextStage, false)}`}>{formatStageText(nextStage)}</div></>)}
        </div>
      </div>
    );
  };

  const renderActions = (claim, isProductMissing, s) => {
    const isHearingAid = claim.item_type === 'hearing_aid' || claim?.products?.category?.includes('보청기') || claim?.products?.name?.includes('보청기');

    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {isHearingAid && !isProductMissing && (
          <button onClick={() => openContractModal(claim)} className="px-3 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-xs font-black shadow-sm hover:bg-indigo-100 flex items-center gap-1.5 mr-2">
            <FileText size={14}/> 계약서 관리
          </button>
        )}

        {!isProductMissing && s === '대기 중' && <button onClick={() => handleOrderComplete(claim.id)} className="px-3 py-2 bg-sky-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-sky-700 flex items-center gap-1.5"><Package size={14}/> 발주 확인</button>}
        {!isProductMissing && s === '발주 완료' && <button onClick={() => openEditModal(claim)} className="px-3 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-black flex items-center gap-1.5"><Truck size={14}/> 송장 입력</button>}
        {s === '배송 중' && <button onClick={() => openEditModal(claim)} className="px-3 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-amber-600 flex items-center gap-1.5"><Camera size={14}/> 사진 등록</button>}
        {s === '교부 완료' && (
          <>
            {(!claim.receipt_photos || claim.receipt_photos.length === 0) && (<button onClick={() => openEditModal(claim)} className="px-3 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-black shadow-sm hover:bg-rose-100 flex items-center gap-1.5 animate-pulse" title="수취 증빙 사진이 누락되었습니다."><Camera size={14}/> 사진 보완</button>)}
            <button onClick={() => openPrintModal(claim)} className="px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold shadow-sm hover:bg-gray-50 flex items-center gap-1.5"><Printer size={14}/> 인쇄</button>
            <button onClick={() => openEmailModal(claim)} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700 flex items-center gap-1.5"><Mail size={14}/> 청구 메일</button>
          </>
        )}
        {/* 💡 세금계산서 모달 오픈 연결 */}
        {s === '청구 완료 (계산서 미발행)' && <button onClick={() => { setSelectedClaim(claim); setTaxInvoiceDate(new Date().toISOString().split('T')[0]); setActiveModal('tax_invoice'); }} className="px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-black shadow-md hover:bg-amber-700 flex items-center gap-1.5"><Send size={14}/> 세금계산서 발행 완료</button>}
        
        {s === '청구 완료 (계산서 발행)' && <button onClick={() => { setSelectedClaim(claim); setActiveModal('settlement'); }} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-black shadow-md hover:bg-emerald-700 flex items-center gap-1.5"><CheckCircle2 size={14}/> 정산 완료</button>}
        {s === '정산 완료' && <span className="px-3 py-2 text-emerald-600 text-xs font-black flex items-center gap-1.5"><CheckCircle2 size={14}/> 최종 정산완료</span>}

        <div className="flex items-center gap-1 ml-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => openProductAssignmentModal(claim)} className="p-2 text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-lg border border-indigo-100 transition-colors" title="동일 대상자 품목 추가 접수 (데이터 연동)"><Plus size={14} strokeWidth={3} /></button>
          <button onClick={() => openEditModal(claim)} className="p-2 text-gray-400 hover:text-gray-800 bg-gray-50 rounded-lg border border-gray-200" title="내역 수정"><Edit3 size={14}/></button>
        </div>
      </div>
    );
  };

  return (
    <>
      <style type="text/css">
        {`
          /* 브라우저 화면(모달 등)에서는 실제 인쇄 DOM을 보이지 않게 처리 */
          @media screen {
            .print-only-container { 
              position: fixed !important; 
              top: -9999px !important; 
              left: -9999px !important; 
              width: 1px !important; 
              height: 1px !important; 
              overflow: hidden !important; 
              opacity: 0 !important; 
              pointer-events: none !important; 
              z-index: -9999 !important; 
            }
          }

          /* 실제 인쇄 다중 페이지 처리 설정 */
          @media print {
            /* 브라우저 기본 여백 없애기 */
            @page {
              size: A4 portrait;
              margin: 0 !important;
            }

            /* 전체 레이아웃 초기화 */
            html, body { 
              width: 100% !important;
              height: auto !important;
              min-height: auto !important;
              margin: 0 !important; 
              padding: 0 !important; 
              background: white !important; 
            }
            
            /* 핵심: 앱의 모든 UI 요소(root 및 기타)를 감춥니다. */
            body * { 
              visibility: hidden; 
            }
            
            /* 포탈로 body에 붙은 실제 인쇄용 DOM과 그 자식들만 다시 보이게 덮어씁니다. */
            .print-only-container, .print-only-container * {
              visibility: visible;
            }

            .print-only-container {
              position: absolute !important; 
              top: 0 !important;
              left: 0 !important;
              width: 210mm !important;
              margin: 0 auto !important;
              padding: 0 !important;
            }

            /* 각 페이지가 A4 영역을 완전히 차지하게 강제 */
            .print-page-break { 
              page-break-after: always !important; 
              break-after: page !important;
              page-break-inside: avoid !important; 
              break-inside: avoid !important;
              width: 210mm !important; 
              height: 297mm !important; 
              max-height: 297mm !important;
              margin: 0 auto !important; 
              padding: 0 !important; 
              box-sizing: border-box !important; 
              overflow: hidden !important; 
              background: white !important; 
            }
            
            .print-page-break:last-child { 
              page-break-after: auto !important; 
              break-after: auto !important; 
            }
          }
        `}
      </style>

      {/* 기본 화면 UI (인쇄 시 숨겨짐) */}
      <div className="print-hide-ui space-y-6 animate-in fade-in duration-700 font-sans pb-24">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div><h1 className="text-3xl font-black text-gray-900 tracking-tight">청구/교부 통합 리스트</h1><p className="text-gray-500 mt-2 font-bold text-sm">업무 흐름 파이프라인 (고밀도 뷰)</p></div>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={resetFilters} className="flex-1 md:flex-none items-center justify-center gap-2 px-4 py-3 bg-gray-100 rounded-xl text-xs font-black text-gray-500 hover:bg-gray-200 flex"><RefreshCw size={14}/> 초기화</button>
            <button onClick={() => setActiveModal('create')} className="flex-[2] md:flex-none items-center justify-center gap-2 px-5 py-3 bg-indigo-600 rounded-xl text-sm font-black text-white hover:bg-indigo-700 shadow-md flex"><Plus size={18}/> 신규 접수(상품 할당)</button>
          </div>
        </div>

        <div className="flex flex-col xl:grid xl:grid-cols-12 gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm font-bold items-center">
          <div className="w-full xl:col-span-3 relative group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input type="text" placeholder="대상자/기관 검색..." className="w-full pl-10 pr-3 py-3 bg-gray-50 rounded-xl outline-none text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
          <div className="w-full xl:col-span-2 relative"><Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><select className="w-full pl-10 pr-3 py-3 bg-gray-50 rounded-xl outline-none text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="전체">모든 진행 상태</option>{STATUS_STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          <div className="w-full xl:col-span-7 flex flex-wrap md:flex-nowrap justify-start xl:justify-end items-center gap-2">
            <button onClick={() => setGroupByCustomer(!groupByCustomer)} className={`px-3 py-2 text-xs font-bold border rounded-xl transition-all shadow-sm flex items-center gap-1.5 ${groupByCustomer ? 'bg-indigo-50 border-indigo-300 text-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:text-indigo-600 hover:bg-gray-50'}`}>{groupByCustomer ? <CheckSquare size={14} className="text-indigo-600" /> : <Square size={14} />} 대상자 묶기</button>
            <div className="flex flex-1 md:flex-none items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl"><Calendar className="text-gray-400" size={16} /><input type="date" className="bg-transparent outline-none text-xs text-gray-700 w-full" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} /><span className="text-gray-300">~</span><input type="date" className="bg-transparent outline-none text-xs text-gray-700 w-full" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} /></div>
            <div className="flex gap-1 w-full md:w-auto"><button onClick={() => setQuickDate('today')} className="flex-1 px-3 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-indigo-600 shadow-sm">오늘</button><button onClick={() => setQuickDate('week')} className="flex-1 px-3 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-indigo-600 shadow-sm">1주일</button><button onClick={() => setQuickDate('month')} className="flex-1 px-3 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-indigo-600 shadow-sm">1개월</button></div>
          </div>
        </div>

        <div className="block md:hidden space-y-4">
          {currentItems.length > 0 ? currentItems.map((claim) => {
            const s = claim.status;
            const isProductMissing = (!claim.product_id && claim.item_type === 'general') || claim.products?.name === '품목 미지정';
            const qual = claim.customers?.qualification;
            const isNHIS = qual === '건강보험' || qual === '경감(건강보험)';
            const branchName = isNHIS ? (claim.customers?.nhis_branches?.name || '공단지사 미정') : (claim.customers?.local_governments?.name || '지자체 미정');
            
            const reqPrescription = isPrescriptionRequired(claim.products, claim.item_type, isNHIS);
            const reqInspection = isNHIS && !isProductMissing && !isInspectionExempt(claim.products);

            return (
              <div key={claim.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative group">
                <div className="flex justify-between items-start mb-3">
                  <div><div className="font-black text-lg text-gray-900 leading-tight">{claim.customers?.name}</div><div className="text-xs text-gray-500 font-bold mt-0.5">{branchName}</div></div>
                  <div className="text-right"><div className="text-xs text-gray-500 font-mono">{formatShortDate(claim.claim_date)}</div><div className="text-sm font-black text-indigo-600 font-mono mt-0.5">{claim.total_amount?.toLocaleString()}원</div></div>
                </div>
                {claim.notes && (<div title={claim.notes} className="mb-3 text-[10px] text-rose-600 font-bold flex items-center gap-1 bg-rose-50 border border-rose-100 w-fit px-2 py-1 rounded"><FileText size={10} /> 특이사항 있음 (수정 화면 확인)</div>)}
                <div className="bg-gray-50 rounded-xl p-3 mb-4 flex flex-col gap-3">
                  <div className="font-black text-sm text-indigo-900 leading-snug break-keep flex flex-col gap-1.5">
                    <div className="flex items-center gap-1">
                      <Package size={14} className="text-indigo-400" />
                      {isProductMissing ? <span className="text-rose-500">상품 미할당</span> : claim.products?.name}
                    </div>
                    {!isProductMissing && (reqPrescription || reqInspection) && (
                      <div className="flex gap-1 ml-4">
                        {reqPrescription && <span className="px-1.5 py-[2px] bg-rose-50 text-rose-500 border border-rose-100 rounded text-[9px] font-black shadow-sm">처방전</span>}
                        {reqInspection && <span className="px-1.5 py-[2px] bg-blue-50 text-blue-500 border border-blue-100 rounded text-[9px] font-black shadow-sm">검수확인서</span>}
                      </div>
                    )}
                  </div>
                  {isProductMissing ? (<button onClick={() => openProductAssignmentModal(claim)} className="w-full py-2 bg-rose-600 text-white rounded-lg text-xs font-black shadow-sm flex items-center justify-center gap-1 animate-pulse"><Plus size={12}/> 상품할당 바로가기</button>) : (<div className="overflow-x-auto custom-scrollbar pb-1">{renderStatusPipeline(claim)}</div>)}
                  
                  {/* 💡 계산서 및 입금일 모바일 뱃지 표시 */}
                  {(claim.tax_invoice_date || claim.deposit_date) && (
                    <div className="flex gap-2 text-[10px] font-mono mt-1 pt-2 border-t border-gray-200">
                      {claim.tax_invoice_date && <span className="text-blue-600 bg-blue-100/50 px-2 py-1 rounded font-bold">발행: {formatShortDate(claim.tax_invoice_date)}</span>}
                      {claim.deposit_date && <span className="text-emerald-600 bg-emerald-100/50 px-2 py-1 rounded font-bold">입금: {formatShortDate(claim.deposit_date)}</span>}
                    </div>
                  )}
                </div>
                {renderActions(claim, isProductMissing, s)}
              </div>
            );
          }) : (<div className="p-10 text-center text-gray-400 font-bold bg-white rounded-2xl border border-gray-100">등록된 청구 내역이 없습니다.</div>)}
        </div>

        <div className="hidden md:flex bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex-col">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              {/* 💡 헤더 명칭 변경: 계산서/입금일 */}
              <tr><th className="py-3 px-4 w-[5%] text-center">No.</th><th className="py-3 px-4 w-[10%]">접수일</th><th className="py-3 px-5 w-[15%]">대상자 / 기관</th><th className="py-3 px-5 w-[20%]">할당 품목</th><th className="py-3 px-4 text-right">청구금액</th><th className="py-3 px-4 w-[10%]">계산서 / 입금일</th><th className="py-3 px-5 w-[25%]">진행 파이프라인</th><th className="py-3 px-5 text-right w-[20%]">업무 실행 (단계별 제안)</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {currentItems.map((claim, index) => {
                const s = claim.status;
                const serialNumber = filteredClaims.length - (indexOfFirstItem + index);
                const isProductMissing = (!claim.product_id && claim.item_type === 'general') || claim.products?.name === '품목 미지정';
                const isNHIS = (claim.customers?.qualification === '건강보험' || claim.customers?.qualification === '경감(건강보험)');
                const branchName = isNHIS ? (claim.customers?.nhis_branches?.name || '공단지사 미정') : (claim.customers?.local_governments?.name || '지자체 미정');
                
                const reqPrescription = isPrescriptionRequired(claim.products, claim.item_type, isNHIS);
                const reqInspection = isNHIS && !isProductMissing && !isInspectionExempt(claim.products);

                return (
                  <tr key={claim.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="py-3 px-4 text-center align-middle font-mono text-xs font-black text-gray-400">{serialNumber}</td>
                    <td className="py-3 px-4 text-gray-500 font-mono text-[13px] font-bold align-middle tracking-tight">{formatShortDate(claim.claim_date)}</td>
                    <td className="py-3 px-5 align-middle">
                      <div className="font-black text-gray-900">{claim.customers?.name}</div>
                      <div className="text-[10px] font-bold truncate mt-0.5 flex gap-1"><span className={`px-1.5 py-[1px] rounded ${isNHIS ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>{isNHIS ? '공단청구' : '지자체'}</span><span className="text-gray-500">{branchName}</span></div>
                      {claim.notes && (<div title={claim.notes} className="mt-1.5 text-[10px] text-rose-600 font-bold flex items-center gap-1 bg-rose-50 border border-rose-100 w-fit px-1.5 py-0.5 rounded cursor-help"><FileText size={10} /> 특이사항 있음</div>)}
                    </td>
                    <td className="py-3 px-5 text-indigo-900 font-black text-xs leading-snug break-keep align-middle">
                      {isProductMissing ? (
                        <span className="text-rose-500 font-bold bg-rose-50 px-2 py-1 rounded-md text-[11px] inline-flex items-center gap-1"><AlertTriangle size={12}/> 상품 미할당</span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span>{claim.products?.name}</span>
                          {(reqPrescription || reqInspection) && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {reqPrescription && <span className="px-1.5 py-[2px] bg-rose-50 text-rose-500 border border-rose-100 rounded text-[9px] font-black shadow-sm">처방전</span>}
                              {reqInspection && <span className="px-1.5 py-[2px] bg-blue-50 text-blue-500 border border-blue-100 rounded text-[9px] font-black shadow-sm">검수</span>}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-xs">{claim.total_amount?.toLocaleString()}</td>
                    
                    {/* 💡 날짜 표시부 개선: 발행일과 입금일 모두 표시 */}
                    <td className="py-3 px-4 align-middle">
                      <div className="flex flex-col gap-1 text-xs font-mono font-bold">
                        <span className="text-blue-600 bg-blue-50/50 px-1.5 rounded py-0.5 whitespace-nowrap" title="세금계산서 발행일">발: {claim.tax_invoice_date ? formatShortDate(claim.tax_invoice_date) : '-'}</span>
                        <span className="text-emerald-600 bg-emerald-50/50 px-1.5 rounded py-0.5 whitespace-nowrap" title="입금일">입: {claim.deposit_date ? formatShortDate(claim.deposit_date) : '-'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-5 align-middle">{isProductMissing ? (<button onClick={() => openProductAssignmentModal(claim)} className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-black shadow-sm hover:bg-rose-700 flex items-center gap-1 animate-pulse"><Plus size={12}/> 상품할당 바로가기</button>) : (renderStatusPipeline(claim))}</td>
                    <td className="py-3 px-5 text-right align-middle">{renderActions(claim, isProductMissing, s)}</td>
                  </tr>
                );
              })}
              {filteredClaims.length === 0 && (<tr><td colSpan="8" className="py-12 text-center text-gray-400 font-bold text-sm">등록된 청구 내역이 없습니다.</td></tr>)}
            </tbody>
          </table>
        </div>

        {filteredClaims.length > 0 && (
          <div className="flex justify-between items-center px-4 md:px-6 py-4 bg-transparent md:bg-gray-50/50 border-t-0 md:border-t border-gray-100">
            <div className="hidden md:block text-xs font-bold text-gray-500">총 <span className="text-indigo-600 font-black">{filteredClaims.length}</span> 건 조회됨</div>
            <div className="flex w-full md:w-auto justify-center md:justify-end gap-1.5 items-center">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm bg-gray-100 transition-colors"><ChevronLeft size={16} strokeWidth={2.5} /></button>
              <div className="flex gap-1 px-2">{Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (<button key={num} onClick={() => setCurrentPage(num)} className={`w-8 h-8 rounded-lg text-[13px] font-black flex items-center justify-center transition-colors shadow-sm ${currentPage === num ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>{num}</button>))}</div>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm bg-gray-100 transition-colors"><ChevronRight size={16} strokeWidth={2.5} /></button>
            </div>
          </div>
        )}

        {/* 신규 등록 모달 */}
        {activeModal === 'create' && (
          <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-in zoom-in-95 font-black">
            <div className="bg-white w-full max-w-xl rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center shrink-0 mb-4">
                <h4 className="text-xl md:text-2xl font-black">신규 대상자 상품 할당</h4>
                <button onClick={() => { setActiveModal(null); setCustSearchTerm(''); setProdSearchTerm(''); }}><X size={24}/></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">대상자 (수급자) 선택</label>
                  <input type="text" placeholder="대상자 성명/생년월일 검색..." className="w-full bg-white p-3 mb-2 rounded-xl border border-gray-200 text-xs font-bold" value={custSearchTerm} onChange={e => setCustSearchTerm(e.target.value)} />
                  <select className="w-full bg-gray-50 p-4 rounded-xl outline-none font-bold border border-gray-200" value={newData.customer_id} onChange={e => setNewData({...newData, customer_id: e.target.value})}>
                    <option value="">대상자 선택 ({filteredCustomersForSelect.length})</option>
                    {filteredCustomersForSelect.map(c => <option key={c.id} value={c.id}>{c.name} ({c.birth_date})</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">상품 유형 선택</label>
                  <div className="flex gap-2 bg-gray-100 p-1.5 rounded-xl">
                    <button type="button" onClick={() => setNewData({...newData, item_type: 'general'})} className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-colors ${newData.item_type === 'general' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:bg-gray-200'}`}>일반 단일 품목</button>
                    <button type="button" onClick={() => setNewData({...newData, item_type: 'hearing_aid'})} className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-colors ${newData.item_type === 'hearing_aid' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:bg-gray-200'}`}>보청기 (좌/우 개별 할당)</button>
                  </div>
                </div>

                {newData.item_type === 'general' ? (
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">교부할 상품 선택</label>
                    <input type="text" placeholder="일반 상품 검색..." className="w-full bg-white p-3 mb-2 rounded-xl border border-gray-200 text-xs font-bold text-indigo-900" value={prodSearchTerm} onChange={e => setProdSearchTerm(e.target.value)} />
                    <select className="w-full bg-gray-50 p-4 rounded-xl outline-none font-bold text-indigo-700 border border-gray-200" value={newData.product_id} onChange={e => { const matchedDevice = allDevices.find(d => String(d.id) === String(e.target.value)); setNewData({ ...newData, product_id: e.target.value, total_amount: matchedDevice?.price || 0 }); }}>
                      <option value="">일반 상품 선택...</option>
                      {filteredDevicesForSelect.map(d => <option key={d.id} value={d.id}>{d.category ? `[${d.category}]` : ''} {d.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-indigo-100 p-3 rounded-xl bg-indigo-50/30">
                    <div className={`p-3 border rounded-xl transition-all ${newData.hearing_aid_details.right.enabled ? 'bg-white border-indigo-200 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                      <div className="flex items-center gap-2 mb-2"><input type="checkbox" className="w-4 h-4 cursor-pointer" checked={newData.hearing_aid_details.right.enabled} onChange={e => handleHearingAidChange('newData', 'right', 'enabled', e.target.checked)} /><span className="text-xs font-black">우측 (Right)</span></div>
                      <select disabled={!newData.hearing_aid_details.right.enabled} className="w-full text-[11px] p-2 bg-gray-50 border border-gray-200 rounded-lg mb-2" value={newData.hearing_aid_details.right.product_id} onChange={e => handleHearingAidChange('newData', 'right', 'product_id', e.target.value)}>
                        <option value="">보청기 모델 선택...</option>
                        {allDevices.filter(d => d.category?.includes('보청기')).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      <div className="flex items-center gap-2"><span className="text-[10px] text-gray-500 font-bold shrink-0">단가</span><input type="number" disabled={!newData.hearing_aid_details.right.enabled} className="w-full text-xs p-2 border border-gray-200 rounded-lg text-right" value={newData.hearing_aid_details.right.price} onChange={e => handleHearingAidChange('newData', 'right', 'price', e.target.value)} /></div>
                    </div>
                    <div className={`p-3 border rounded-xl transition-all ${newData.hearing_aid_details.left.enabled ? 'bg-white border-indigo-200 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                      <div className="flex items-center gap-2 mb-2"><input type="checkbox" className="w-4 h-4 cursor-pointer" checked={newData.hearing_aid_details.left.enabled} onChange={e => handleHearingAidChange('newData', 'left', 'enabled', e.target.checked)} /><span className="text-xs font-black">좌측 (Left)</span></div>
                      <select disabled={!newData.hearing_aid_details.left.enabled} className="w-full text-[11px] p-2 bg-white border border-gray-200 rounded-lg mb-2" value={newData.hearing_aid_details.left.product_id} onChange={e => handleHearingAidChange('newData', 'left', 'product_id', e.target.value)}>
                        <option value="">보청기 모델 선택...</option>
                        {allDevices.filter(d => d.category?.includes('보청기')).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      <div className="flex items-center gap-2"><span className="text-[10px] text-gray-500 font-bold shrink-0">단가</span><input type="number" disabled={!newData.hearing_aid_details.left.enabled} className="w-full text-xs p-2 bg-white border border-gray-200 rounded-lg text-right" value={newData.hearing_aid_details.left.price} onChange={e => handleHearingAidChange('newData', 'left', 'price', e.target.value)} /></div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">구입일</label><input type="date" className="w-full bg-gray-50 p-4 rounded-xl text-sm font-bold border border-gray-200" value={newData.purchase_date} onChange={e => setNewData({...newData, purchase_date: e.target.value})} /></div>
                  <div><label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">제조일</label><input type="date" className="w-full bg-gray-50 p-4 rounded-xl text-sm font-bold border border-gray-200" value={newData.mfg_date} onChange={e => setNewData({...newData, mfg_date: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">교부 예정일</label><input type="date" className="w-full bg-gray-50 p-4 rounded-xl text-sm font-bold border border-gray-200" value={newData.claim_date} onChange={e => setNewData({...newData, claim_date: e.target.value})} /></div>
                  <div><label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">총 청구 금액</label><input type="number" disabled={newData.item_type === 'hearing_aid'} className={`w-full p-4 rounded-xl text-sm font-bold border border-gray-200 ${newData.item_type === 'hearing_aid' ? 'bg-gray-200 text-gray-500' : 'bg-gray-50 text-indigo-900'}`} value={newData.total_amount} onChange={e => setNewData({...newData, total_amount: e.target.value})} /></div>
                </div>
              </div>
              <div className="flex gap-3 shrink-0 pt-4 border-t border-gray-100">
                <button onClick={() => { setActiveModal(null); setCustSearchTerm(''); setProdSearchTerm(''); }} className="flex-1 py-4 bg-gray-100 rounded-2xl">취소</button>
                <button onClick={handleCreateSubmit} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl shadow-lg">접수 완료</button>
              </div>
            </div>
          </div>
        )}

        {/* 편집 모달 */}
        {activeModal === 'edit' && selectedClaim && (
          <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-in zoom-in-95 font-black">
            <div className="bg-white w-full max-w-2xl rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl font-black flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div><h4 className="text-xl md:text-2xl font-black text-gray-900">내역 종합 편집</h4><p className="text-xs text-gray-400 mt-1">{selectedClaim?.customers?.name} 대상자의 교부 데이터를 수정합니다.</p></div>
                <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-800"><X size={24}/></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4">
                {editData.item_type === 'hearing_aid' ? (
                  <div className="mb-5 border border-indigo-100 p-4 rounded-xl bg-white shadow-sm">
                    <div className="text-xs text-indigo-600 font-black border-b pb-2 mb-3">보청기(좌/우) 할당 정보 수정</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className={`p-3 border rounded-xl transition-all ${editData.hearing_aid_details.right.enabled ? 'bg-indigo-50/40 border-indigo-200 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                        <div className="flex items-center gap-2 mb-2"><input type="checkbox" className="w-4 h-4 cursor-pointer" checked={editData.hearing_aid_details.right.enabled} onChange={e => handleHearingAidChange('editData', 'right', 'enabled', e.target.checked)} /><span className="text-xs font-black">우측 (Right)</span></div>
                        <select disabled={!editData.hearing_aid_details.right.enabled} className="w-full text-[11px] p-2 bg-white border border-gray-200 rounded-lg mb-2" value={editData.hearing_aid_details.right.product_id} onChange={e => handleHearingAidChange('editData', 'right', 'product_id', e.target.value)}>
                          <option value="">보청기 모델 선택...</option>{allDevices.filter(d => d.category?.includes('보청기')).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <div className="flex items-center gap-2"><span className="text-[10px] text-gray-500 font-bold shrink-0">단가</span><input type="number" disabled={!editData.hearing_aid_details.right.enabled} className="w-full text-xs p-2 bg-white border border-gray-200 rounded-lg text-right" value={editData.hearing_aid_details.right.price} onChange={e => handleHearingAidChange('editData', 'right', 'price', e.target.value)} /></div>
                      </div>
                      <div className={`p-3 border rounded-xl transition-all ${editData.hearing_aid_details.left.enabled ? 'bg-indigo-50/40 border-indigo-200 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                        <div className="flex items-center gap-2 mb-2"><input type="checkbox" className="w-4 h-4 cursor-pointer" checked={editData.hearing_aid_details.left.enabled} onChange={e => handleHearingAidChange('editData', 'left', 'enabled', e.target.checked)} /><span className="text-xs font-black">좌측 (Left)</span></div>
                        <select disabled={!editData.hearing_aid_details.left.enabled} className="w-full text-[11px] p-2 bg-white border border-gray-200 rounded-lg mb-2" value={editData.hearing_aid_details.left.product_id} onChange={e => handleHearingAidChange('editData', 'left', 'product_id', e.target.value)}>
                          <option value="">보청기 모델 선택...</option>{allDevices.filter(d => d.category?.includes('보청기')).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <div className="flex items-center gap-2"><span className="text-[10px] text-gray-500 font-bold shrink-0">단가</span><input type="number" disabled={!editData.hearing_aid_details.left.enabled} className="w-full text-xs p-2 bg-white border border-gray-200 rounded-lg text-right" value={editData.hearing_aid_details.left.price} onChange={e => handleHearingAidChange('editData', 'left', 'price', e.target.value)} /></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-5 text-sm flex justify-between items-center shadow-sm">
                    <span className="text-indigo-900 font-bold">현재 배정 품목</span><span className="text-indigo-600 font-black tracking-tight">{selectedClaim?.products?.name || '품목 미지정'}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-4 md:space-y-5">
                    <div>
                      <div className="text-xs text-indigo-600 font-black border-b pb-2 mb-3">기본 정보 & 상태</div>
                      <div className="space-y-3">
                        <div><label className="text-[10px] text-gray-400 uppercase block mb-1">진행 파이프라인 (상태)</label><select className="w-full bg-gray-50 p-3 rounded-xl outline-none border border-gray-200 text-sm font-bold text-gray-900" value={editData.status} onChange={e => setEditData({...editData, status: e.target.value})}>{STATUS_STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                        
                        <div className="flex flex-col md:flex-row gap-2">
                          <div className="flex-1"><label className="text-[10px] text-gray-400 uppercase block mb-1">구입일</label><input type="date" className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold border border-gray-200" value={editData.purchase_date} onChange={e => setEditData({...editData, purchase_date: e.target.value})} /></div>
                          <div className="flex-1"><label className="text-[10px] text-gray-400 uppercase block mb-1">제조일</label><input type="date" className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold border border-gray-200" value={editData.mfg_date} onChange={e => setEditData({...editData, mfg_date: e.target.value})} /></div>
                        </div>
                        
                        <div className="flex flex-col md:flex-row gap-2">
                          <div className="flex-1"><label className="text-[10px] text-gray-400 uppercase block mb-1">교부일</label><input type="date" className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold border border-gray-200" value={editData.claim_date} onChange={e => setEditData({...editData, claim_date: e.target.value})} /></div>
                          <div className="flex-1"><label className="text-[10px] text-gray-400 uppercase block mb-1">총 청구 금액</label><input type="number" disabled={editData.item_type === 'hearing_aid'} className={`w-full p-3 rounded-xl text-sm font-mono font-bold text-right border border-gray-200 ${editData.item_type === 'hearing_aid' ? 'bg-gray-200 text-gray-500' : 'bg-gray-50'}`} value={editData.total_amount} onChange={e => setEditData({...editData, total_amount: e.target.value})} /></div>
                        </div>

                        {/* 💡 세금계산서 및 입금일 종합 편집 영역 추가 */}
                        <div className="flex flex-col md:flex-row gap-2 pt-2 border-t border-dashed border-gray-200 mt-2">
                          <div className="flex-1"><label className="text-[10px] text-blue-500 uppercase block mb-1">세금계산서 발행일</label><input type="date" className="w-full bg-blue-50/30 p-3 rounded-xl text-sm font-bold border border-blue-100 focus:border-blue-300 outline-none" value={editData.tax_invoice_date} onChange={e => setEditData({...editData, tax_invoice_date: e.target.value})} /></div>
                          <div className="flex-1"><label className="text-[10px] text-emerald-500 uppercase block mb-1">입금 확인일</label><input type="date" className="w-full bg-emerald-50/30 p-3 rounded-xl text-sm font-bold border border-emerald-100 focus:border-emerald-300 outline-none" value={editData.deposit_date} onChange={e => setEditData({...editData, deposit_date: e.target.value})} /></div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-amber-600 font-black border-b pb-2 mb-3 mt-2">물류 및 배송 정보</div>
                      <div className="flex flex-col md:flex-row gap-2">
                        <select className="w-full md:w-1/3 bg-gray-50 p-3 rounded-xl text-sm font-bold border border-gray-200" value={editData.carrier} onChange={e => setEditData({...editData, carrier: e.target.value})}><option value="CJ대한통운">CJ대한통운</option><option value="우체국택배">우체국택배</option><option value="롯데택배">롯데택배</option><option value="한진택배">한진택배</option><option value="로젠택배">로젠택배</option><option value="경동택배">경동택배</option><option value="대신택배">대신택배</option><option value="일양로지스">일양로지스</option><option value="천일택배">천일택배</option><option value="건영택배">건영택배</option><option value="CU 편의점택배">CU 편의점택배</option><option value="GS25 편의점택배">GS25 편의점택배</option><option value="직접 배송/설치">직접 배송/설치</option><option value="기타">기타</option></select>
                        <input className="w-full md:w-2/3 bg-gray-50 p-3 rounded-xl text-sm font-bold border border-gray-200" value={editData.tracking_no} onChange={e => setEditData({...editData, tracking_no: e.target.value})} placeholder="송장번호 입력" />
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-rose-600 font-black border-b pb-2 mb-3 mt-2 flex items-center gap-1.5"><FileText size={14}/> 특이사항 및 지연 사유</div>
                      <textarea className="w-full bg-gray-50 p-3 rounded-xl text-sm font-medium border border-gray-200 resize-none h-24 focus:bg-white focus:border-rose-300" placeholder="정산 지연 사유, 고객 요청사항 등을 입력하세요." value={editData.notes} onChange={e => setEditData({...editData, notes: e.target.value})} />
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 mt-2 bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100">
                    <div className="text-xs text-emerald-600 font-black border-b border-emerald-200 pb-2 mb-3 flex items-center gap-1.5">
                      <ImagePlus size={14}/> 청구 증빙 서류 업로드 (이미지)
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {isPrescriptionRequired(selectedClaim?.products, editData.item_type, isNHISClaim(selectedClaim)) && renderDocUploadBox('처방전 (해당 품목 필수)', 'prescription_image')}
                      {isNHISClaim(selectedClaim) && !isInspectionExempt(selectedClaim?.products) && renderDocUploadBox('검수확인서', 'inspection_image')}
                      {renderDocUploadBox('세금계산서 (구매증빙)', 'purchase_proof_image')}
                      {isNHISClaim(selectedClaim) && renderDocUploadBox('신분증/복지카드', 'id_card_image')}
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold mt-3">* 업로드된 이미지는 인쇄 및 메일 발송 시 PDF에 통합되어 자동 출력됩니다.</p>
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <div className="text-xs text-blue-600 font-black border-b pb-2 mb-3 flex justify-between"><span>수취 증빙 사진 (교부확인서 삽입)</span><span className="text-gray-400 tracking-wider">{photoFiles.length}/3 장</span></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {photoFiles.map((src, idx) => (
                        <div key={idx} className="relative group w-full h-24 shrink-0">
                          <img src={src} className="w-full h-full object-cover rounded-xl border-2 border-gray-200 shadow-sm transition-all group-hover:brightness-50" alt={`미리보기 ${idx+1}`} />
                          <button onClick={() => setPhotoFiles(photoFiles.filter((_, i) => i !== idx))} className="absolute inset-0 m-auto w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
                        </div>
                      ))}
                      {photoFiles.length < 3 && (
                        <div className="relative border-2 border-dashed border-blue-300 rounded-xl w-full h-24 flex flex-col items-center justify-center bg-blue-50/50 hover:bg-blue-100 cursor-pointer group shadow-sm shrink-0">
                          <input type="file" accept="image/*" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" onChange={handlePhotoFilesChange} />
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-1 group-hover:bg-blue-600 group-hover:text-white"><ImagePlus size={18} strokeWidth={2.5} /></div>
                          <span className="text-[10px] font-black text-blue-600 group-hover:text-blue-800">+ 추가</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3 justify-between border-t pt-4 mt-2 flex-shrink-0">
                <button onClick={() => handleDelete(selectedClaim?.id)} className="w-full md:w-auto px-5 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl flex items-center justify-center gap-2 text-sm shadow-sm order-last md:order-first"><Trash2 size={16}/> 삭제하기</button>
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={() => setActiveModal(null)} className="flex-1 md:flex-none px-6 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm shadow-sm">취소</button>
                  <button onClick={handleEditSubmit} disabled={isSavingEdit} className="flex-[2] md:flex-none px-8 py-3 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 text-sm flex items-center justify-center gap-2 disabled:bg-indigo-400">
                    {isSavingEdit ? <Loader2 size={16} className="animate-spin" /> : '첨부하기 (저장)'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 메일 모달 */}
        {activeModal === 'email' && selectedClaim && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-in zoom-in-95 font-black">
            <div className="bg-white w-full max-w-5xl rounded-3xl md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-5 md:p-6 bg-blue-600 text-white flex justify-between items-center shrink-0">
                <h4 className="text-lg">{isDocPreview ? '첨부 서류 최종 검토' : '청구 서류 발송 (메일)'}</h4>
                <button onClick={() => setActiveModal(null)}><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col">
                {!isDocPreview ? (
                  <div className="flex flex-col md:grid md:grid-cols-5 h-full overflow-y-auto custom-scrollbar">
                    <div className="md:col-span-3 p-5 md:p-6 space-y-4 md:border-r">
                      {(selectedClaim?.customers?.qualification === '건강보험' || selectedClaim?.customers?.qualification === '경감(건강보험)') && (
                        <>
                          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-1">
                            <label className="text-[11px] text-indigo-700 uppercase font-black block">청구 주체 선택 (공단용)</label>
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => handleSubjectChange('개인 (본인 계좌 청구)', 'email')} className={`flex-1 py-2.5 rounded-lg font-bold text-[13px] border shadow-sm transition-all ${claimSubject === '개인 (본인 계좌 청구)' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'}`}>개인 (본인 계좌)</button>
                              <button onClick={() => handleSubjectChange('개인 (가족 계좌 청구)', 'email')} className={`flex-1 py-2.5 rounded-lg font-bold text-[13px] border shadow-sm transition-all ${claimSubject === '개인 (가족 계좌 청구)' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'}`}>개인 (가족 계좌)</button>
                              <button onClick={() => handleSubjectChange('기업 (업체 위탁 청구)', 'email')} className={`flex-1 py-2.5 rounded-lg font-bold text-[13px] border shadow-sm transition-all ${claimSubject === '기업 (업체 위탁 청구)' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'}`}>기업 (업체 위탁)</button>
                            </div>
                          </div>
                          {renderDocInputs()}
                        </>
                      )}
                      <div className="bg-blue-50/50 p-4 rounded-xl md:rounded-2xl border border-blue-100 space-y-1">
                        <label className="text-[11px] text-blue-600 uppercase font-black block">서류 발행일 선택</label>
                        <p className="text-[10px] text-gray-400 font-bold leading-none mb-1">* 청구서, 위임장 등 문서의 작성일자에 일괄 반영됩니다.</p>
                        <input type="date" className="w-full bg-white p-2.5 rounded-xl border border-blue-200 shadow-sm" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] text-blue-600 uppercase font-black block">수신자 이메일 설정</label>
                        {getEmailOptions().length > 0 && (
                          <select className="w-full bg-blue-50/50 p-3 rounded-xl border border-blue-100" onChange={(e) => { if (e.target.value) setEmailData({...emailData, recipient: e.target.value}); }} value={getEmailOptions().includes(emailData?.recipient) ? emailData?.recipient : ""}>
                            <option value="" disabled>-- 담당자 선택 --</option>
                            {getEmailOptions().map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                          </select>
                        )}
                        <input className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200" value={emailData?.recipient || ''} onChange={e => setEmailData({...emailData, recipient: e.target.value})} placeholder="수신 이메일 입력" />
                      </div>
                      <input className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200" value={emailData?.subject || ''} onChange={e => setEmailData({...emailData, subject: e.target.value})} />
                      <textarea className="w-full h-32 md:h-48 bg-gray-50 p-3 rounded-xl border border-gray-200 resize-none" value={emailData?.content || ''} onChange={e => setEmailData({...emailData, content: e.target.value})} />
                    </div>
                    <div className="md:col-span-2 p-5 md:p-6 bg-gray-50 flex flex-col border-t md:border-t-0">
                      <div className="mb-4 text-xs text-blue-600 uppercase font-black">첨부 서류 선택 (클릭하여 제외 가능)</div>
                      <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                        {getDocsListForClaim(selectedClaim, claimSubject).map(docName => {
                          const isChecked = emailData?.files?.[docName] || false;
                          return (<button key={docName} onClick={() => setEmailData({...emailData, files: {...(emailData?.files || {}), [docName]: !isChecked}})} className={`w-full p-3 rounded-lg border flex justify-between items-center text-xs transition-all ${isChecked ? 'bg-white border-blue-400 text-blue-700 shadow-sm' : 'bg-transparent border-gray-200 text-gray-400'}`}><span className="font-bold text-left">{docName}</span>{isChecked ? <CheckSquare size={16} className="shrink-0"/> : <Square size={16} className="shrink-0"/>}</button>);
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 md:p-6 bg-gray-300 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="flex flex-col gap-6 md:gap-10 max-w-4xl mx-auto items-center pb-10 md:pb-20">
                      {getDocsListForClaim(selectedClaim, claimSubject).filter(docName => emailData?.files?.[docName]).map((fileName, idx) => (
                        <div key={idx} className="shadow-xl bg-white w-[210mm] h-[297mm] relative overflow-hidden shrink-0 [&>div]:w-full [&>div]:h-full" style={{ boxSizing: 'border-box', transform: 'scale(0.85) md:scale-100', transformOrigin: 'top center' }}>{renderDocument(fileName, selectedClaim)}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 md:p-5 bg-white border-t flex gap-2 md:gap-3 shrink-0">
                {!isDocPreview ? (
                  <><button onClick={() => setActiveModal(null)} className="flex-1 py-3 bg-gray-100 rounded-xl">닫기</button><button onClick={() => setIsDocPreview(true)} className="flex-[1.5] py-3 bg-indigo-600 text-white rounded-xl font-black flex justify-center items-center gap-2"><Eye size={16}/> 서류 미리보기</button></>
                ) : (
                  <><button onClick={() => setIsDocPreview(false)} className="flex-1 py-3 bg-white border border-gray-200 rounded-xl font-black flex justify-center items-center gap-2"><ArrowLeft size={16}/> 수정</button><button onClick={handleSendRealEmail} disabled={isSendingEmail} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-black flex justify-center items-center gap-2 disabled:bg-blue-300">{isSendingEmail ? <Loader2 size={16} className="animate-spin" /> : <><Send size={16}/> PDF 이메일 발송</>}</button></>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 인쇄 모달 (설정 및 화면 미리보기) */}
        {activeModal === 'print' && selectedClaim && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-in zoom-in-95 font-black print-hide-ui">
            <div className="bg-white w-full max-w-6xl rounded-3xl md:rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col flex-1">
              <div className="p-5 md:p-6 bg-gray-800 text-white flex justify-between items-center shrink-0">
                <h4 className="text-lg">{isPrintDocPreview ? '선택한 서류 인쇄 미리보기' : '서류 인쇄 선택'}</h4>
                <button onClick={() => setActiveModal(null)} className="hover:text-gray-300 transition-colors"><X size={20}/></button>
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col">
                {!isPrintDocPreview ? (
                  <div className="p-5 md:p-8 overflow-y-auto bg-gray-50 flex-1 custom-scrollbar">
                    <div className="w-full max-w-2xl mx-auto space-y-4">
                      {(selectedClaim?.customers?.qualification === '건강보험' || selectedClaim?.customers?.qualification === '경감(건강보험)') && (
                        <>
                          <div className="bg-white p-4 rounded-xl md:rounded-2xl border border-gray-200 shadow-sm space-y-1">
                            <label className="text-[11px] text-gray-700 uppercase font-black block">청구 주체 선택 (공단용)</label>
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => handleSubjectChange('개인 (본인 계좌 청구)', 'print')} className={`flex-1 py-3 rounded-lg font-bold text-sm border shadow-sm transition-all ${claimSubject === '개인 (본인 계좌 청구)' ? 'bg-gray-800 text-white border-gray-800' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>개인 (본인 계좌)</button>
                              <button onClick={() => handleSubjectChange('개인 (가족 계좌 청구)', 'print')} className={`flex-1 py-3 rounded-lg font-bold text-sm border shadow-sm transition-all ${claimSubject === '개인 (가족 계좌 청구)' ? 'bg-gray-800 text-white border-gray-800' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>개인 (가족 계좌)</button>
                              <button onClick={() => handleSubjectChange('기업 (업체 위탁 청구)', 'print')} className={`flex-1 py-3 rounded-lg font-bold text-sm border shadow-sm transition-all ${claimSubject === '기업 (업체 위탁 청구)' ? 'bg-gray-800 text-white border-gray-800' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>기업 (업체 위탁)</button>
                            </div>
                          </div>
                          {renderDocInputs()}
                        </>
                      )}
                      
                      <div className="bg-white p-4 rounded-xl md:rounded-2xl border border-gray-200 shadow-sm space-y-1">
                        <label className="text-[11px] text-gray-700 uppercase font-black block">서류 발행일 선택</label>
                        <p className="text-[10px] text-gray-400 font-bold leading-none mb-2">* 작성일자에 일괄 반영됩니다.</p>
                        <input type="date" className="w-full bg-gray-50 p-2.5 rounded-xl border border-gray-200" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                        {getDocsListForClaim(selectedClaim, claimSubject).map((docName) => {
                          const isChecked = printFiles?.[docName] || false;
                          return (<button key={docName} onClick={() => setPrintFiles({...printFiles, [docName]: !isChecked})} className={`w-full p-4 rounded-xl border-2 flex justify-between items-center text-sm transition-all ${isChecked ? 'border-gray-800 bg-white text-gray-900 shadow-sm' : 'border-gray-200 text-gray-400 bg-transparent'}`}><span className="font-bold text-left">{docName}</span>{isChecked ? <CheckSquare size={16} className="shrink-0"/> : <Square size={16} className="shrink-0"/>}</button>);
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 md:p-8 bg-gray-300 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="flex flex-col gap-6 md:gap-10 max-w-4xl mx-auto items-center pb-10 md:pb-20">
                      {getDocsListForClaim(selectedClaim, claimSubject).filter(docName => printFiles?.[docName]).map((fileName, idx) => (
                        <div key={idx} className="shadow-xl bg-white w-[210mm] h-[297mm] relative overflow-hidden shrink-0 [&>div]:w-full [&>div]:h-full" style={{ boxSizing: 'border-box', transform: 'scale(0.85) md:scale-100', transformOrigin: 'top center' }}>{renderDocument(fileName, selectedClaim)}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-4 md:p-5 border-t bg-white flex gap-2 md:gap-3 shrink-0">
                {!isPrintDocPreview ? (
                  <>
                    <button onClick={() => setActiveModal(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors">닫기</button>
                    <button onClick={() => setIsPrintDocPreview(true)} className="flex-[2] py-3 bg-gray-900 text-white rounded-xl font-black flex justify-center items-center gap-2 hover:bg-black transition-colors"><Eye size={16}/> 화면 미리보기</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setIsPrintDocPreview(false)} className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-black flex justify-center items-center gap-2 hover:bg-gray-50 transition-colors"><ArrowLeft size={16}/> 서류 다시 선택</button>
                    <button onClick={handleForcePrint} className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-black flex justify-center items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg"><Printer size={16}/> 실제 인쇄하기 (Ctrl+P)</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 계약서 모달 */}
        {activeModal === 'contract' && selectedClaim && (
          <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-in zoom-in-95 font-black">
             <div className="bg-gray-200 w-full max-w-4xl rounded-3xl md:rounded-[3rem] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col flex-1">
              <div className="p-5 md:p-6 bg-indigo-900 text-white flex justify-between items-center shrink-0">
                <h4 className="text-lg flex items-center gap-2"><FileText size={20}/> 보청기 구매 표준계약서 관리</h4>
                <button onClick={() => setActiveModal(null)} className="hover:text-indigo-200"><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center custom-scrollbar">
                <div id="contract-document-wrapper" className="shrink-0 shadow-lg" style={{ transform: 'scale(0.95)', transformOrigin: 'top center' }}>
                  <Contracts 
                    data={{
                      ...selectedClaim,
                      customer: selectedClaim?.customers || {}, product: {
                        ...selectedClaim?.products,
                        hearing_aid: selectedClaim?.item_type === 'hearing_aid' && selectedClaim?.hearing_aid_details ? {
                          right: selectedClaim?.hearing_aid_details?.right?.enabled ? { ...(allDevices.find(d => String(d.id) === String(selectedClaim?.hearing_aid_details?.right?.product_id)) || {}), price: selectedClaim?.hearing_aid_details?.right?.price } : null,
                          left: selectedClaim?.hearing_aid_details?.left?.enabled ? { ...(allDevices.find(d => String(d.id) === String(selectedClaim?.hearing_aid_details?.left?.product_id)) || {}), price: selectedClaim?.hearing_aid_details?.left?.price } : null
                        } : null
                      }, company: companyInfo || {}, signatures: { customer_sign: selectedClaim?.customers?.signature, company_seal: companyInfo?.seal_image }, issueDate: issueDate
                    }} 
                    company={companyInfo} 
                  />
                </div>
              </div>
              <div className="p-4 md:p-5 border-t bg-white flex gap-2 md:gap-3 shrink-0">
                <button onClick={() => setActiveModal(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold">닫기</button>
                <button onClick={async () => {
                    try {
                      const element = document.getElementById('contract-document');
                      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
                      const pdf = new jsPDF('p', 'mm', 'a4');
                      pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, 210, 297);
                      pdf.save(`보청기_표준계약서_${selectedClaim?.customers?.name}.pdf`);
                    } catch (err) { alert('PDF 저장 중 오류가 발생했습니다.'); }
                  }} className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-black flex justify-center items-center gap-2 hover:bg-indigo-700 shadow-md">
                  <Printer size={18}/> 계약서 PDF 저장 / 인쇄
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 💡 세금계산서 발행 모달 */}
        {activeModal === 'tax_invoice' && selectedClaim && (
          <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-in zoom-in-95 font-black">
            <div className="bg-white w-full max-w-md rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl font-black flex flex-col">
              <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                  <h4 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2">
                    <Send className="text-amber-500" /> 계산서 발행 완료
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">홈택스 발행 일자를 지정하고 상태를 변경합니다.</p>
                </div>
                <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-800"><X size={24}/></button>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <div className="text-sm font-bold text-amber-800 mb-1">대상자: {selectedClaim?.customers?.name}</div>
                  <div className="text-xs text-amber-600">청구 금액: {selectedClaim?.total_amount?.toLocaleString()}원</div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">계산서 실제 발행일</label>
                  <input 
                    type="date" 
                    className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl border border-gray-200 outline-none font-bold text-gray-800 focus:ring-2 focus:ring-amber-500 transition-all text-sm"
                    value={taxInvoiceDate}
                    onChange={(e) => setTaxInvoiceDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-auto">
                <button onClick={() => setActiveModal(null)} className="flex-1 py-3.5 md:py-4 bg-gray-100 text-gray-600 rounded-xl md:rounded-2xl shadow-sm hover:bg-gray-200 transition-colors">취소</button>
                <button onClick={handleTaxInvoiceSave} className="flex-[2] py-3.5 md:py-4 bg-amber-600 text-white rounded-xl md:rounded-2xl shadow-md hover:bg-amber-700 flex items-center justify-center gap-2 transition-colors">
                  <CheckCircle2 size={18} /> 발행 마감하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 💡 정산 완료(입금 확인) 모달 */}
        {activeModal === 'settlement' && selectedClaim && (
          <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-in zoom-in-95 font-black">
            <div className="bg-white w-full max-w-md rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl font-black flex flex-col">
              <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                  <h4 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2">
                    <CheckCircle2 className="text-emerald-500" /> 최종 정산 완료
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">대금 입금 일자를 확인하고 마감합니다.</p>
                </div>
                <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-800"><X size={24}/></button>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <div className="text-sm font-bold text-emerald-800 mb-1">대상자: {selectedClaim?.customers?.name}</div>
                  <div className="text-xs text-emerald-600">청구 금액: {selectedClaim?.total_amount?.toLocaleString()}원</div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">실제 입금일</label>
                  <input 
                    type="date" 
                    className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl border border-gray-200 outline-none font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                    value={depositDate}
                    onChange={(e) => setDepositDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-auto">
                <button onClick={() => setActiveModal(null)} className="flex-1 py-3.5 md:py-4 bg-gray-100 text-gray-600 rounded-xl md:rounded-2xl shadow-sm hover:bg-gray-200 transition-colors">취소</button>
                <button onClick={handleSettlementSave} className="flex-[2] py-3.5 md:py-4 bg-emerald-600 text-white rounded-xl md:rounded-2xl shadow-md hover:bg-emerald-700 flex items-center justify-center gap-2 transition-colors">
                  <CheckCircle2 size={18} /> 정산 마감하기
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 💡 보이지 않는 PDF 렌더링용 숨김 영역 (메일 발송 시 html2canvas 전용 영역) */}
      <div className="print-hide-ui" style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '210mm', opacity: 0, zIndex: -9999 }}>
        <div ref={pdfContainerRef} style={{ width: '210mm' }}>
          {selectedClaim && Object.keys(emailData?.files || {}).filter(k => emailData?.files?.[k]).map((fileName) => (
            <div key={fileName} data-docname={fileName} className="w-[210mm] h-[297mm] bg-white relative overflow-hidden shrink-0 [&>div]:w-full [&>div]:h-full" style={{ boxSizing: 'border-box' }}>{renderDocument(fileName, selectedClaim)}</div>
          ))}
        </div>
      </div>

      {/* 💡 핵심: 실제 인쇄 출력 전용 DOM (React Portal을 사용하여 body에 직접 마운트) */}
      {isPrintDocPreview && selectedClaim && typeof document !== 'undefined' && createPortal(
        <div className="print-only-container">
          {getDocsListForClaim(selectedClaim, claimSubject).filter(docName => printFiles?.[docName]).map((fileName, idx) => (
            <div key={idx} className="print-page-break">
              {renderDocument(fileName, selectedClaim)}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}