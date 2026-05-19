import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Truck, X, Package, Mail, Printer, Edit3, Trash2, 
  CheckSquare, Square, Eye, Send, Clock, Calendar, Filter, RefreshCw, ArrowLeft, Plus, ImagePlus, CheckCircle2, Camera, ChevronLeft, ChevronRight, AlertTriangle
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

const ImageOnlyDoc = ({ title, src }) => (
  <div className="bg-white w-[210mm] h-[297mm] p-[20mm] flex flex-col items-center justify-start text-slate-900 box-border overflow-hidden relative">
    <h2 className="text-2xl font-black mb-10 tracking-widest">{title}</h2>
    {src ? (
      <img src={src} alt={title} className="max-w-full max-h-[220mm] object-contain border border-gray-200 p-2 shadow-sm" />
    ) : (
      <div className="text-gray-400 font-bold border-2 border-dashed border-gray-300 w-full h-[200mm] flex items-center justify-center bg-gray-50 rounded-2xl">
        {title} 이미지가 등록되지 않았습니다. (환경설정 &gt; 회사 프로필에서 등록)
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

  const [custSearchTerm, setCustSearchTerm] = useState('');
  const [prodSearchTerm, setProdSearchTerm] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);

  const [activeModal, setActiveModal] = useState(null); 
  const [selectedClaim, setSelectedClaim] = useState(null);

  const [newData, setNewData] = useState({ customer_id: '', product_id: '', claim_date: new Date().toISOString().split('T')[0], total_amount: 0 });
  const [editData, setEditData] = useState({ claim_date: '', total_amount: 0, status: '', carrier: 'CJ대한통운', tracking_no: '' });
  const [photoFiles, setPhotoFiles] = useState([]); 

  const [emailData, setEmailData] = useState({ recipient: '', sender: '', subject: '', content: '', files: {} });
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isDocPreview, setIsDocPreview] = useState(false); 

  const [printFiles, setPrintFiles] = useState({});
  const [isPrintDocPreview, setIsPrintDocPreview] = useState(false);

  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);

  const [companyInfo, setCompanyInfo] = useState({
    company_name: '', representative_name: '', representative_birth: '',
    address: '', detail_address: '', zip_code: '', email: '', contact_number: '',
    seal_image: null, biz_reg_image: null, bankbook_image: null 
  });

  const pdfContainerRef = useRef(null);

  const standardDocs = [
    '교부비용청구서', '교부확인서', '사업자등록증', '계좌사본', 
    '물품인수증', '견적서', '거래명세서', '기타 첨부(교부사진, 배송추적 캡쳐본 등)'
  ];

  const documentComponents = {
    '교부비용청구서': ClaimFormDoc, '교부확인서': ConfirmationDoc, 
    '물품인수증': ReceiptDoc, '견적서': EstimateDoc, '거래명세서': TransactionDoc, 
  };

  const STATUS_STAGES = [
    '대기 중', 
    '배송 중', 
    '교부 완료', 
    '청구 완료 (계산서 미발행)', 
    '청구 완료 (계산서 발행)', 
    '정산 완료'
  ];

  useEffect(() => { 
    fetchData(); 
    fetchCompanyData();
  }, []);

  useEffect(() => {
    if (location.state?.autoOpenCreate && location.state?.customerId) {
      const passedId = location.state.customerId;
      const passedName = location.state.customerName || '';
      
      setNewData(prev => ({
        ...prev,
        customer_id: passedId,
        product_id: '',
        claim_date: new Date().toISOString().split('T')[0],
        total_amount: 0
      }));
      
      setCustSearchTerm(passedName); 
      setProdSearchTerm('');
      setActiveModal('create');      
      
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  async function fetchCompanyData() {
    const { data } = await supabase.from('company_profile').select('*').eq('id', 1).single();
    if (data) setCompanyInfo(data); 
  }

  async function fetchData() {
    setLoading(true);
    try {
      const { data: claimData } = await supabase.from('claims').select('*').order('claim_date', { ascending: false });
      const { data: custData } = await supabase.from('customers').select('*').order('name');
      const { data: govData } = await supabase.from('local_governments').select('*');
      const { data: deviceData } = await supabase.from('devices').select('*').order('name');

      setAllCustomers(custData || []);
      setAllDevices(deviceData || []);

      const merged = claimData?.map(h => {
        let customerObj = custData?.find(c => String(c.id) === String(h.customer_id));
        let customerWithGov = null;

        if (customerObj) {
          customerWithGov = {
            ...customerObj,
            local_governments: govData?.find(g => String(g.id) === String(customerObj.local_gov_id)) || null
          };
        }

        const matchedDevice = deviceData?.find(d => String(d.id) === String(h.product_id) || String(d.id) === String(h.device_id));

        let fullProductName = h.product_name || h.item_name || h.device_name || '품목 미지정';
        if (matchedDevice) {
          fullProductName = matchedDevice.category ? `${matchedDevice.category} - ${matchedDevice.name}` : matchedDevice.name;
        } else if (h.manual_product_name) {
          fullProductName = h.manual_product_name;
        }

        let parsedPhotos = [];
        if (typeof h.receipt_photos === 'string') {
          try { parsedPhotos = JSON.parse(h.receipt_photos); } catch(e) {}
        } else if (Array.isArray(h.receipt_photos)) {
          parsedPhotos = h.receipt_photos;
        }

        let mappedStatus = h.status || '대기 중';
        if (mappedStatus === '지급 완료') {
          mappedStatus = '정산 완료';
        } else if (mappedStatus === '청구 완료') {
          mappedStatus = '청구 완료 (계산서 미발행)'; 
        }

        return {
          ...h,
          customers: customerWithGov,
          products: { ...matchedDevice, name: fullProductName },
          status: mappedStatus,
          receipt_photos: parsedPhotos 
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
        (h.customers?.local_governments?.name?.toLowerCase() || '').includes(term)
      );
    }
    if (statusFilter !== '전체') result = result.filter(h => h.status === statusFilter);
    if (dateRange.start && dateRange.end) result = result.filter(h => h.claim_date >= dateRange.start && h.claim_date <= dateRange.end);
    
    if (groupByCustomer) {
      result.sort((a, b) => {
        const nameA = a.customers?.name || '';
        const nameB = b.customers?.name || '';
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
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}.${mm}.${dd}`;
  };

  const setQuickDate = (type) => {
    const getFormattedDate = (dateObj) => {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const today = new Date();
    const end = getFormattedDate(today);
    let start = '';

    if (type === 'today') { start = end; } 
    else if (type === 'week') { const d = new Date(); d.setDate(d.getDate() - 7); start = getFormattedDate(d); } 
    else if (type === 'month') { const d = new Date(); d.setMonth(d.getMonth() - 1); start = getFormattedDate(d); }

    setDateRange({ start, end });
  };

  const resetFilters = () => { 
    setSearchTerm(''); 
    setDateRange({ start: '', end: '' }); 
    setStatusFilter('전체'); 
    setGroupByCustomer(false); 
  };

  const handleDelete = async (id) => {
    if (window.confirm('이 청구 내역을 영구 삭제하시겠습니까?')) {
      await supabase.from('claims').delete().eq('id', id);
      setActiveModal(null);
      fetchData();
    }
  };

  const handleCreateSubmit = async () => {
    if (!newData.customer_id || !newData.product_id) { alert('대상자와 교부할 상품을 모두 선택해 주세요.'); return; }
    const { error } = await supabase.from('claims').insert([{
      customer_id: newData.customer_id, product_id: newData.product_id,
      claim_date: newData.claim_date, total_amount: newData.total_amount, status: '대기 중'
    }]);
    if (!error) {
      alert('접수 완료되었습니다.'); setActiveModal(null);
      setNewData({ customer_id: '', product_id: '', claim_date: new Date().toISOString().split('T')[0], total_amount: 0 });
      setCustSearchTerm('');
      setProdSearchTerm('');
      fetchData();
    }
  };

  const openProductAssignmentModal = (claim) => {
    setNewData({
      customer_id: claim.customer_id || '',
      product_id: '',
      claim_date: new Date().toISOString().split('T')[0],
      total_amount: 0
    });
    setCustSearchTerm(claim.customers?.name || '');
    setProdSearchTerm('');
    setActiveModal('create');
  };

  const openEditModal = (claim) => {
    setSelectedClaim(claim);
    setEditData({
      claim_date: claim.claim_date || '',
      total_amount: claim.total_amount || 0,
      status: claim.status || '대기 중',
      carrier: claim.carrier || 'CJ대한통운',
      tracking_no: claim.tracking_no || ''
    });
    setPhotoFiles(claim.receipt_photos || []);
    setActiveModal('edit');
  };

  const handlePhotoFilesChange = async (e) => {
    const files = Array.from(e.target.files);
    if (photoFiles.length + files.length > 3) {
      alert('사진은 최대 3장까지만 추가할 수 있습니다.');
      return;
    }

    const compressImage = (file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target.result;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 600; 
            let scaleSize = 1;
            if (img.width > MAX_WIDTH) { scaleSize = MAX_WIDTH / img.width; }
            canvas.width = img.width * scaleSize;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.5)); 
          };
        };
      });
    };

    try {
      const compressedFiles = await Promise.all(files.map(file => compressImage(file)));
      setPhotoFiles(prev => [...prev, ...compressedFiles].slice(0, 3));
    } catch (err) {
      alert('사진을 처리하는 중 오류가 발생했습니다.');
    }
  };

  const handleEditSubmit = async () => {
    let newStatus = editData.status;
    
    if (photoFiles.length > 0 && (newStatus === '대기 중' || newStatus === '배송 중')) {
      newStatus = '교부 완료';
    } else if (editData.tracking_no && newStatus === '대기 중') {
      newStatus = '배송 중';
    }

    const payload = {
      claim_date: editData.claim_date,
      total_amount: editData.total_amount,
      status: newStatus,
      carrier: editData.carrier,
      tracking_no: editData.tracking_no,
      receipt_photos: photoFiles
    };

    const { error } = await supabase.from('claims').update(payload).eq('id', selectedClaim.id);
    if (!error) { 
      alert('내역 수정 및 사진 첨부가 완료되었습니다.'); 
      setActiveModal(null); 
      fetchData(); 
    } else {
      alert('저장 중 오류가 발생했습니다. (DB 구조 확인 필요)');
    }
  };

  const handleTaxInvoiceConfirm = async (id) => {
    if (window.confirm('홈택스 등 외부 정산 허브를 통한 세금계산서 발행 처리가 완료되었습니까?\n확인 클릭 시 앱 내 상급 파이프라인 단계로 즉시 승인 연동됩니다.')) {
      const { error } = await supabase.from('claims').update({ status: '청구 완료 (계산서 발행)' }).eq('id', id);
      if (!error) {
        alert('세금계산서 정산 연동 프로세스가 승인되었습니다.');
        fetchData();
      } else {
        alert('DB 상태 변경 중 에러가 발생했습니다.');
      }
    }
  };

  const handleSettlementConfirm = async (id) => {
    if (window.confirm('지자체가 당사 계좌로 실제 대금을 입금한 사실을 확인하셨습니까?\n확인 클릭 시 최종 [정산 완료] 상태로 수동 변경 처리됩니다.')) {
      const { error } = await supabase.from('claims').update({ status: '정산 완료' }).eq('id', id);
      if (!error) {
        alert('대상자 정산 처리가 수동 입금 매핑을 통해 최종 완료로 마감되었습니다.');
        fetchData();
      } else {
        alert('DB 상태 변경 중 오류가 발생했습니다.');
      }
    }
  };

  const getInitialFilesFromGov = (claim) => {
    const initialFiles = {};
    const gov = claim?.customers?.local_governments;
    
    const legacyMap = {
      'cost_claim': '교부비용청구서',
      'delivery_confirm': '교부확인서',
      'biz_reg': '사업자등록증',
      'bankbook': '계좌사본',
      'receipt': '물품인수증',
      'estimate': '견적서',
      'invoice': '거래명세서',
      'customer_id_card': '기타 첨부(교부사진, 배송추적 캡쳐본 등)'
    };

    const rawDocs = gov?.required_documents || null;
    let reqDocs = [];

    if (rawDocs) {
      if (typeof rawDocs === 'string') {
        try { 
          reqDocs = JSON.parse(rawDocs); 
        } catch(e) { 
          reqDocs = rawDocs.split(',').map(s => s.trim()); 
        }
      } else if (Array.isArray(rawDocs)) {
        reqDocs = rawDocs;
      }
    }

    const normalizedReqDocs = reqDocs.map(doc => legacyMap[doc] || doc);

    standardDocs.forEach(docName => {
      if (normalizedReqDocs && normalizedReqDocs.length > 0) {
        initialFiles[docName] = normalizedReqDocs.includes(docName);
      } else {
        initialFiles[docName] = true;
      }
    });
    
    return initialFiles;
  };

  const openEmailModal = (claim) => {
    setSelectedClaim(claim);
    setIssueDate(new Date().toISOString().split('T')[0]); 
    const gov = claim.customers?.local_governments || {};
    const recipient = gov.email ? `${gov.email} (${gov.name}/${gov.manager_name || '담당자'})` : '';
    
    const initialFiles = getInitialFilesFromGov(claim); 
    
    const currentCompanyName = companyInfo.company_name || '(주)케어플러스';
    const currentCustomerName = claim.customers?.name || '대상자';
    const currentContactNumber = companyInfo.contact_number || '1833-6365';
    // 이메일 정보 가져오기 (없을 경우 기본값)
    const currentEmail = companyInfo.email || '';

    setEmailData({ 
      recipient, 
      sender: companyInfo.email, 
      files: initialFiles,
      subject: `장애인 보조기기 교부 관련 비용청구서 송부의 건(${currentCustomerName})`, 
      // 이메일 내용 하단 서명에 업체명 -> 이메일 -> 전화번호 순으로 삽입
      content: `안녕하세요.\n장애인 보조기기 교부 전문업체 ${currentCompanyName}입니다.\n\n${currentCustomerName} 대상자님의 보조기기 교부와 관련하여,\n정산에 필요한 비용 청구서 및 관련 서류를 첨부와 같이 제출합니다.\n\n참고로 세금계산서는 본 메일과 별개로 발행되어 발송될 예정입니다.\n\n서류를 검토하신 후 의문 사항이 있으시거나 보완이 필요한 점이 있다면\n아래 담당자 연락처로 언제든지 연락 주시기 바랍니다.\n\n감사합니다.\n\n${currentCompanyName} 담당자 배상\nEmail: ${currentEmail}\nTel: ${currentContactNumber}`
    });
    setIsDocPreview(false); setActiveModal('email');
  };

  const openPrintModal = (claim) => {
    setSelectedClaim(claim);
    setIssueDate(new Date().toISOString().split('T')[0]); 
    const initialFiles = getInitialFilesFromGov(claim);
    setPrintFiles(initialFiles); 
    setIsPrintDocPreview(false); 
    setActiveModal('print');
  };

  const handleSendRealEmail = async () => {
    const emailMatch = emailData.recipient.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
    if (!emailMatch) { alert('올바른 수신 메일을 입력해 주세요.'); return; }
    const selectedDocuments = standardDocs.filter(docName => emailData.files[docName]);

    if (window.confirm(`선택 서류 ${selectedDocuments.length}건을 PDF로 변환 및 발송하시겠습니까?`)) {
      setIsSendingEmail(true);
      try {
        const attachmentsArray = [];
        if (pdfContainerRef.current) {
          const docElements = pdfContainerRef.current.children;
          for (let i = 0; i < docElements.length; i++) {
            const element = docElements[i];
            
            const canvas = await html2canvas(element, { scale: 1.5, useCORS: true, logging: false, allowTaint: true });
            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            
            const pdf = new jsPDF('p', 'mm', 'a4');
            pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
            
            const pdfDataUri = pdf.output('datauristring');
            const base64Content = pdfDataUri.split('base64,')[1];
            
            attachmentsArray.push({ 
              content: base64Content, 
              filename: `${element.getAttribute('data-docname')}_${selectedClaim.customers?.name || '서류'}.pdf` 
            });
          }
        }
        
        const { error } = await supabase.functions.invoke('send-claim-email', {
          body: { to: emailMatch[1], from: emailData.sender, subject: emailData.subject, text: emailData.content, attachments: attachmentsArray, companyName: companyInfo.company_name }
        });
        
        if (error) {
          console.error('Edge Function Error:', error);
          throw new Error(error.message || '이메일 발송 서버 응답 오류');
        }
        
        await supabase.from('claims').update({ status: '청구 완료 (계산서 미발행)' }).eq('id', selectedClaim.id);
        alert('메일이 성공적으로 전송되었습니다.'); 
        setActiveModal(null); 
        fetchData();
      } catch (err) { 
        alert(`메일 전송에 실패했습니다:\n${err.message || err.toString()}`); 
      } finally { 
        setIsSendingEmail(false); 
      }
    }
  };

  const handleForcePrint = () => { window.print(); };

  const renderDocument = (fileName, claimData) => {
    const TargetDoc = documentComponents[fileName];
    
    const adjustedClaimData = {
      ...claimData,
      issue_date: issueDate,
      issueDate: issueDate,
      written_date: issueDate,
      writtenDate: issueDate,
      write_date: issueDate,
      writeDate: issueDate,
      doc_date: issueDate,
      docDate: issueDate,
      publish_date: issueDate,
      publishDate: issueDate,
      confirm_date: issueDate,
      confirmDate: issueDate,
      confirmation_date: issueDate,
      confirmationDate: issueDate,
      signing_date: issueDate,
      signingDate: issueDate,
      signature_date: issueDate,
      signatureDate: issueDate,
      print_date: issueDate,
      printDate: issueDate,
      today_date: issueDate,
      todayDate: issueDate,
      current_date: issueDate,
      currentDate: issueDate,
      date: issueDate
    };

    if (fileName === '교부비용청구서' || fileName === '거래명세서') {
      adjustedClaimData.claim_date = issueDate;
    } else if (fileName === '교부확인서') {
      adjustedClaimData.claim_date = claimData.claim_date; 
    } else {
      adjustedClaimData.claim_date = claimData.claim_date;
    }

    if (TargetDoc) {
      return <TargetDoc data={adjustedClaimData} company={companyInfo} />;
    } else if (fileName === '사업자등록증') {
      return <ImageOnlyDoc title="사업자등록증" src={companyInfo.biz_reg_image} />;
    } else if (fileName === '계좌사본') {
      return <ImageOnlyDoc title="통장 사본 (계좌 사본)" src={companyInfo.bankbook_image} />;
    } else if (fileName === '기타 첨부(교부사진, 배송추적 캡쳐본 등)') {
      return (
        <div className="bg-white w-[210mm] h-[297mm] p-[20mm] flex flex-col text-slate-900 box-border overflow-hidden relative">
          <h2 className="text-2xl font-black mb-10 text-center tracking-widest">기타 첨부 자료</h2>
          <div className="flex flex-col gap-8 items-center justify-center flex-1 overflow-hidden">
            {adjustedClaimData?.receipt_photos && adjustedClaimData.receipt_photos.length > 0 ? (
              adjustedClaimData.receipt_photos.map((src, i) => (
                <div key={i} className="flex flex-col items-center">
                   <span className="text-sm font-bold text-gray-500 mb-2">사진 {i + 1}</span>
                   <img src={src} className="max-w-full max-h-[70mm] object-contain border p-2 shadow-sm" alt={`기타첨부 ${i+1}`}/>
                </div>
              ))
            ) : (
              <div className="text-gray-400 font-bold border-2 border-dashed border-gray-300 w-full h-[150mm] flex items-center justify-center bg-gray-50 rounded-2xl">
                등록된 기타 첨부 사진이 없습니다.
              </div>
            )}
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
    if (currentIndex === -1) {
      currentIndex = 0;
    }
    
    const formatStageText = (stage) => {
      if (!stage) return null;
      
      if (stage === '교부 완료' && isPhotoMissing && stage === currentStatus) {
        return (
          <div className="text-center leading-tight flex flex-col items-center justify-center">
            <div className="font-extrabold flex items-center gap-1"><AlertTriangle size={10}/> 교부 완료</div>
            <div className="text-[10px] font-black text-rose-500 mt-0.5">(사진 누락)</div>
          </div>
        );
      }

      if (stage.includes('(')) {
        const [main, sub] = stage.split(' (');
        return (
          <div className="text-center leading-tight">
            <div className="font-extrabold">{main}</div>
            <div className="text-[9px] font-bold opacity-80 mt-0.5">({sub.replace(')', '')})</div>
          </div>
        );
      }
      return <div className="font-extrabold text-center">{stage}</div>;
    };

    const getStageColor = (stage, isActive) => {
      if (!stage || !isActive) return 'bg-gray-50 text-gray-400 border-gray-200';
      if (stage === '대기 중') return 'bg-slate-100 text-slate-700 border-slate-300';
      if (stage === '배송 중') return 'bg-amber-50 text-amber-700 border-amber-300';
      if (stage === '교부 완료') {
        return isPhotoMissing 
          ? 'bg-rose-50 text-rose-600 border-rose-300 ring-1 ring-rose-200' 
          : 'bg-purple-50 text-purple-700 border-purple-300';
      }
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
          {STATUS_STAGES.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                idx === currentIndex 
                  ? 'bg-indigo-600' 
                  : idx < currentIndex 
                    ? 'bg-indigo-200' 
                    : 'bg-gray-100'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5 justify-start">
          <div className={`px-2.5 py-1 rounded-xl border text-[11px] min-w-[75px] h-[34px] flex items-center justify-center shadow-2sm ${getStageColor(currentStage, true)}`}>
            {formatStageText(currentStage)}
          </div>
          
          {nextStage && (
            <>
              <span className="text-gray-300 font-black text-xs animate-pulse">➔</span>
              <div className={`px-2.5 py-1 rounded-xl border border-dashed text-[11px] min-w-[75px] h-[34px] flex items-center justify-center opacity-60 ${getStageColor(nextStage, false)}`}>
                {formatStageText(nextStage)}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <style type="text/css">
        {`
          .print-page-area {
            display: none;
          }

          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            .print-hide-ui {
              display: none !important;
            }

            .print-page-area {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 210mm !important;
              margin: 0 auto !important;
              background: white !important;
              z-index: 99999 !important;
            }

            .print-page-break {
              page-break-after: always !important;
              page-break-inside: avoid !important;
              width: 210mm !important;
              height: 296mm !important;
              margin: 0 auto !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              background: white !important;
              overflow: hidden !important;
              box-sizing: border-box !important;
            }

            .print-page-break > div {
              width: 100% !important;
              height: 100% !important;
              max-width: none !important;
              min-height: auto !important;
              margin: 0 !important;
            }

            .print-page-break:last-child {
              page-break-after: auto !important;
            }

            @page {
              size: A4 portrait;
              margin: 0 !important;
            }
          }
        `}
      </style>

      {/* --- 실제 화면 UI 영역 (인쇄 시 숨김 처리됨) --- */}
      <div className="print-hide-ui p-8 space-y-6 animate-in fade-in duration-700 font-sans pb-24">
        {/* 헤더 */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">청구/교부 통합 리스트</h1>
            <p className="text-gray-500 mt-2 font-bold text-sm">업무 흐름 파이프라인 (고밀도 뷰)</p>
          </div>
          <div className="flex gap-2">
            <button onClick={resetFilters} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl text-xs font-black text-gray-500 hover:bg-gray-200"><RefreshCw size={14}/> 초기화</button>
            <button onClick={() => setActiveModal('create')} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 rounded-xl text-sm font-black text-white hover:bg-indigo-700 shadow-md"><Plus size={18}/> 신규 접수(상품 할당)</button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm font-bold items-center">
          <div className="col-span-3 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="대상자 검색..." className="w-full pl-10 pr-3 py-2.5 bg-gray-50 rounded-xl outline-none text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="col-span-2 relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select className="w-full pl-10 pr-3 py-2.5 bg-gray-50 rounded-xl outline-none text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="전체">모든 진행 상태</option>
              {STATUS_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          
          <div className="col-span-7 flex justify-end items-center gap-2">
            <button 
              onClick={() => setGroupByCustomer(!groupByCustomer)} 
              className={`px-3 py-2 text-xs font-bold border rounded-xl transition-all shadow-sm flex items-center gap-1.5 ${
                groupByCustomer 
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-600' 
                  : 'bg-white border-gray-200 text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
              }`}
            >
              {groupByCustomer ? <CheckSquare size={14} className="text-indigo-600" /> : <Square size={14} />}
              대상자별 묶기
            </button>
            
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl">
              <Calendar className="text-gray-400" size={16} />
              <input type="date" className="bg-transparent outline-none text-xs text-gray-700" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
              <span className="text-gray-300">~</span>
              <input type="date" className="bg-transparent outline-none text-xs text-gray-700" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
            </div>
            <div className="flex gap-1">
              <button onClick={() => setQuickDate('today')} className="px-3 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-indigo-600 shadow-sm">오늘</button>
              <button onClick={() => setQuickDate('week')} className="px-3 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-indigo-600 shadow-sm">1주일</button>
              <button onClick={() => setQuickDate('month')} className="px-3 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-indigo-600 shadow-sm">1개월</button>
            </div>
          </div>
        </div>

        {/* 테이블 */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-[5%] text-center">No.</th>
                <th className="py-3 px-4 w-[10%]">접수일</th>
                <th className="py-3 px-5 w-[15%]">대상자 / 지자체</th>
                <th className="py-3 px-5 w-[20%]">할당 품목</th>
                <th className="py-3 px-4 text-right">청구금액</th>
                <th className="py-3 px-4">입금일</th>
                <th className="py-3 px-5 w-[25%]">진행 파이프라인</th>
                <th className="py-3 px-5 text-right w-[25%]">업무 실행 (단계별 제안)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {currentItems.map((claim, index) => {
                const s = claim.status;
                const serialNumber = filteredClaims.length - (indexOfFirstItem + index);
                const isProductMissing = !claim.product_id || claim.products?.name === '품목 미지정';
                
                return (
                  <tr key={claim.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="py-3 px-4 text-center align-middle font-mono text-xs font-black text-gray-400">
                      {serialNumber}
                    </td>
                    <td className="py-3 px-4 text-gray-500 font-mono text-[13px] font-bold align-middle tracking-tight">
                      {formatShortDate(claim.claim_date)}
                    </td>
                    <td className="py-3 px-5 align-middle">
                      <div className="font-black text-gray-900">{claim.customers?.name}</div>
                      <div className="text-[10px] text-gray-500 font-bold truncate mt-0.5">{claim.customers?.local_governments?.name || '지자체 미정'}</div>
                    </td>
                    <td className="py-3 px-5 text-indigo-900 font-black text-xs leading-snug break-keep align-middle">
                      {isProductMissing ? (
                        <span className="text-rose-500 font-bold bg-rose-50 px-2 py-1 rounded-md text-[11px] inline-flex items-center gap-1"><AlertTriangle size={12}/> 상품 미할당</span>
                      ) : (
                        claim.products?.name
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-xs">{claim.total_amount?.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono text-xs">{claim.deposit_date ? formatShortDate(claim.deposit_date) : '-'}</td>
                    <td className="py-3 px-5 align-middle">
                      {isProductMissing ? (
                        <button 
                          onClick={() => openProductAssignmentModal(claim)} 
                          className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-black shadow-sm hover:bg-rose-700 flex items-center gap-1 animate-pulse"
                        >
                          <Plus size={12}/> 상품할당 바로가기
                        </button>
                      ) : (
                        renderStatusPipeline(claim)
                      )}
                    </td>

                    <td className="py-3 px-5 text-right align-middle">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {!isProductMissing && s === '대기 중' && <button onClick={() => openEditModal(claim)} className="px-3 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-black flex items-center gap-1.5"><Truck size={14}/> 송장 입력</button>}
                        
                        {s === '배송 중' && <button onClick={() => openEditModal(claim)} className="px-3 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-amber-600 flex items-center gap-1.5"><Camera size={14}/> 사진 등록</button>}
                        
                        {s === '교부 완료' && (
                          <>
                            {(!claim.receipt_photos || claim.receipt_photos.length === 0) && (
                              <button 
                                onClick={() => openEditModal(claim)} 
                                className="px-3 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-black shadow-sm hover:bg-rose-100 flex items-center gap-1.5 animate-pulse"
                                title="수취 증빙 사진이 누락되었습니다."
                              >
                                <Camera size={14}/> 사진 보완
                              </button>
                            )}
                            <button onClick={() => openPrintModal(claim)} className="px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold shadow-sm hover:bg-gray-50 flex items-center gap-1.5"><Printer size={14}/> 인쇄</button>
                            <button onClick={() => openEmailModal(claim)} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700 flex items-center gap-1.5"><Mail size={14}/> 청구 메일</button>
                          </>
                        )}

                        {s === '청구 완료 (계산서 미발행)' && (
                          <button 
                            onClick={() => handleTaxInvoiceConfirm(claim.id)} 
                            className="px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-black shadow-md hover:bg-amber-700 flex items-center gap-1.5"
                          >
                            <Send size={14}/> 세금계산서 발행 완료
                          </button>
                        )}

                        {s === '청구 완료 (계산서 발행)' && (
                          <button 
                            onClick={() => { 
                              setSelectedClaim(claim); 
                              setActiveModal('settlement'); 
                            }} 
                            className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-black shadow-md hover:bg-emerald-700 flex items-center gap-1.5"
                          >
                            <CheckCircle2 size={14}/> 정산 완료
                          </button>
                        )}
                        
                        {s === '정산 완료' && <span className="px-3 py-2 text-emerald-600 text-xs font-black flex items-center gap-1.5"><CheckCircle2 size={14}/> 최종 정산완료</span>}

                        <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 flex items-center gap-1">
                          <button 
                            onClick={() => openProductAssignmentModal(claim)} 
                            className="p-2 text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-lg border border-indigo-100 transition-colors" 
                            title="동일 대상자 품목 추가 접수 (데이터 연동)"
                          >
                            <Plus size={14} strokeWidth={3} />
                          </button>
                          <button onClick={() => openEditModal(claim)} className="p-2 text-gray-400 hover:text-gray-800 bg-gray-50 rounded-lg border border-gray-200" title="내역 수정"><Edit3 size={14}/></button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredClaims.length === 0 && (
                <tr><td colSpan="6" className="py-12 text-center text-gray-400 font-bold text-sm">등록된 청구 내역이 없습니다.</td></tr>
              )}
            </tbody>
          </table>

          {filteredClaims.length > 0 && (
            <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <div className="text-xs font-bold text-gray-500">
                총 <span className="text-indigo-600 font-black">{filteredClaims.length}</span> 건 조회됨
              </div>
              <div className="flex gap-1.5 items-center">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm bg-gray-100 transition-colors"
                >
                  <ChevronLeft size={16} strokeWidth={2.5} />
                </button>
                
                <div className="flex gap-1 px-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                    <button
                      key={num}
                      onClick={() => setCurrentPage(num)}
                      className={`w-8 h-8 rounded-lg text-[13px] font-black flex items-center justify-center transition-colors shadow-sm
                        ${currentPage === num ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm bg-gray-100 transition-colors"
                >
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 신규 접수 & 상품 할당 모달 */}
        {activeModal === 'create' && (
          <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in-95 font-black">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl">
              <h4 className="text-2xl font-black mb-2">신규 대상자 상품 할당</h4>
              <div className="space-y-4 mb-8 mt-6">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">대상자 (수급자) 선택</label>
                  <input 
                    type="text" 
                    placeholder="대상자 성명 또는 생년월일 실시간 검색..." 
                    className="w-full bg-white p-3 mb-2 rounded-xl outline-none border border-gray-200 text-xs font-bold text-gray-900"
                    value={custSearchTerm}
                    onChange={e => setCustSearchTerm(e.target.value)}
                  />
                  <select className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold text-gray-800 border border-gray-200" value={newData.customer_id} onChange={e => setNewData({...newData, customer_id: e.target.value})}>
                    <option value="">대상자를 선택하세요 ({filteredCustomersForSelect.length}건 검색됨)</option>
                    {filteredCustomersForSelect.map(c => <option key={c.id} value={c.id}>{c.name} ({c.birth_date})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">교부할 상품 선택</label>
                  <input 
                    type="text" 
                    placeholder="할당할 상품 이름 또는 고유 카테고리 실시간 검색..." 
                    className="w-full bg-white p-3 mb-2 rounded-xl outline-none border border-gray-200 text-xs font-bold text-indigo-900"
                    value={prodSearchTerm}
                    onChange={e => setProdSearchTerm(e.target.value)}
                  />
                  <select 
                    className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold text-indigo-700 border border-gray-200" 
                    value={newData.product_id} 
                    onChange={e => {
                      const selectedId = e.target.value;
                      const matchedDevice = allDevices.find(d => String(d.id) === String(selectedId));
                      setNewData({
                        ...newData, 
                        product_id: selectedId,
                        total_amount: matchedDevice ? (matchedDevice.price || 0) : 0
                      });
                    }}
                  >
                    <option value="">지급할 상품을 선택하세요 ({filteredDevicesForSelect.length}건 검색됨)</option>
                    {filteredDevicesForSelect.map(d => <option key={d.id} value={d.id}>{d.category ? `[${d.category}]` : ''} {d.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">교부 예정일</label>
                    <input type="date" className="w-full bg-gray-50 p-4 rounded-2xl outline-none text-sm font-bold border border-gray-200" value={newData.claim_date} onChange={e => setNewData({...newData, claim_date: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">청구 금액</label>
                    <input type="number" className="w-full bg-gray-50 p-4 rounded-2xl outline-none text-sm font-bold border border-gray-200" value={newData.total_amount} onChange={e => setNewData({...newData, total_amount: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setActiveModal(null); setCustSearchTerm(''); setProdSearchTerm(''); }} className="flex-1 py-4 bg-gray-100 rounded-2xl hover:bg-gray-200">취소</button>
                <button onClick={handleCreateSubmit} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl shadow-lg hover:bg-indigo-700">할당 완료 및 접수</button>
              </div>
            </div>
          </div>
        )}

        {/* 입금일 등록 모달 */}
        {activeModal === 'settlement' && selectedClaim && (
          <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl">
              <h2 className="text-lg font-black mb-4">정산 입금일 등록</h2>
              <input type="date" className="w-full p-3 bg-gray-50 rounded-xl mb-6 font-bold" value={depositDate} onChange={e => setDepositDate(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={() => setActiveModal(null)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-sm">취소</button>
                <button onClick={async () => {
                    const { error } = await supabase.from('claims').update({ status: '정산 완료', deposit_date: depositDate }).eq('id', selectedClaim.id);
                    if (!error) { alert('정산 완료 처리되었습니다.'); setActiveModal(null); fetchData(); }
                }} className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm">완료</button>
              </div>
            </div>
          </div>
        )}

        {/* 종합 편집 모달 */}
        {activeModal === 'edit' && selectedClaim && (
          <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in-95 font-black">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl font-black flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                  <h4 className="text-2xl font-black text-gray-900">내역 종합 편집</h4>
                  <p className="text-xs text-gray-400 mt-1">{selectedClaim.customers?.name} 대상자의 교부 데이터를 수정합니다.</p>
                </div>
                <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-800"><X size={24}/></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4">
                
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl mb-5 text-sm flex justify-between items-center shadow-sm">
                  <span className="text-indigo-900 font-bold">현재 배정 품목</span>
                  <span className="text-indigo-600 font-black tracking-tight">{selectedClaim.products?.name || '품목 미지정'}</span>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-5">
                    <div>
                      <div className="text-xs text-indigo-600 font-black border-b pb-2 mb-3">기본 정보 & 상태</div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase block mb-1">진행 파이프라인 (상태)</label>
                          <select className="w-full bg-gray-50 p-3 rounded-xl outline-none border border-gray-200 text-sm font-bold text-gray-900" value={editData.status} onChange={e => setEditData({...editData, status: e.target.value})}>
                            {STATUS_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] text-gray-400 uppercase block mb-1">교부일</label>
                            <input type="date" className="w-full bg-gray-50 p-3 rounded-xl outline-none border border-gray-200 text-sm font-bold" value={editData.claim_date} onChange={e => setEditData({...editData, claim_date: e.target.value})} />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] text-gray-400 uppercase block mb-1">청구 금액</label>
                            <input type="number" className="w-full bg-gray-50 p-3 rounded-xl outline-none border border-gray-200 text-sm font-mono font-bold text-right" value={editData.total_amount} onChange={e => setEditData({...editData, total_amount: parseInt(e.target.value)})} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-amber-600 font-black border-b pb-2 mb-3 mt-2">물류 및 배송 정보</div>
                      <div className="flex gap-2">
                        <select className="w-1/3 bg-gray-50 p-3 rounded-xl outline-none border border-gray-200 text-sm font-bold text-gray-700" value={editData.carrier} onChange={e => setEditData({...editData, carrier: e.target.value})}>
                          <option value="CJ대한통운">CJ대한통운</option>
                          <option value="우체국택배">우체국택배</option>
                          <option value="롯데택배">롯데택배</option>
                          <option value="한진택배">한진택배</option>
                          <option value="로젠택배">로젠택배</option>
                          <option value="경동택배">경동택배</option>
                          <option value="대신택배">대신택배</option>
                          <option value="일양로지스">일양로지스</option>
                          <option value="천일택배">천일택배</option>
                          <option value="건영택배">건영택배</option>
                          <option value="CU 편의점택배">CU 편의점택배</option>
                          <option value="GS25 편의점택배">GS25 편의점택배</option>
                          <option value="직접 배송/설치">직접 배송/설치</option>
                          <option value="기타">기타</option>
                        </select>
                        <input className="w-2/3 bg-gray-50 p-3 rounded-xl outline-none border border-gray-200 text-sm font-bold text-gray-900" value={editData.tracking_no} onChange={e => setEditData({...editData, tracking_no: e.target.value})} placeholder="송장번호 입력" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-blue-600 font-black border-b pb-2 mb-3 flex justify-between">
                      <span>수취 증빙 사진 (교부확인서 삽입)</span>
                      <span className="text-gray-400 tracking-wider">{photoFiles.length}/3 장</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {photoFiles.map((src, idx) => (
                        <div key={idx} className="relative group">
                          <img src={src} className="w-full h-28 object-cover rounded-xl border-2 border-gray-200 shadow-sm transition-all group-hover:brightness-50" alt={`미리보기 ${idx+1}`} />
                          <button onClick={() => setPhotoFiles(photoFiles.filter((_, i) => i !== idx))} className="absolute inset-0 m-auto w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                            <X size={16}/>
                          </button>
                        </div>
                      ))}
                      
                      {photoFiles.length < 3 && (
                        <div className="relative border-2 border-dashed border-blue-300 rounded-xl h-28 flex flex-col items-center justify-center bg-blue-50/50 hover:bg-blue-100 transition-colors cursor-pointer group shadow-sm">
                          <input type="file" accept="image/*" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" onChange={handlePhotoFilesChange} />
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-1 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                            <ImagePlus size={18} strokeWidth={2.5} />
                          </div>
                          <span className="text-[12px] font-black text-blue-600 group-hover:text-blue-800 transition-colors">+ 추가</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-3 font-bold leading-relaxed break-keep">
                      * 최대 3장까지 등록 가능하며, 등록 시 서류 인쇄/메일 전송 때 교부확인서 하단에 자동으로 배치됩니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-between border-t pt-5 mt-2 flex-shrink-0">
                <button onClick={() => handleDelete(selectedClaim.id)} className="px-5 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl flex items-center gap-2 transition-colors border border-red-100 text-sm shadow-sm">
                  <Trash2 size={16}/> 삭제하기
                </button>
                <div className="flex gap-2">
                  <button onClick={() => setActiveModal(null)} className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm shadow-sm">취소</button>
                  <button onClick={handleEditSubmit} className="px-8 py-3 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition-colors text-sm">
                    첨부하기 (저장)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 이메일 발송 모달 */}
        {activeModal === 'email' && selectedClaim && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in-95 font-black">
            <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
                <h4 className="text-lg">{isDocPreview ? '첨부 서류 최종 검토' : '지자체 청구 서류 발송 (메일)'}</h4>
                <button onClick={() => setActiveModal(null)}><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-hidden">
                {!isDocPreview ? (
                  <div className="grid grid-cols-5 h-full min-h-[500px]">
                    <div className="col-span-3 p-6 space-y-4 border-r overflow-y-auto custom-scrollbar">
                      <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-1">
                        <label className="text-[11px] text-blue-600 uppercase font-black block">서류 발행일 선택</label>
                        <p className="text-[10px] text-gray-400 font-bold leading-none mb-1">* 청구서, 교부확인서(하단), 거래명세서에 일괄 반영됩니다.</p>
                        <input type="date" className="w-full bg-white p-2.5 rounded-xl outline-none text-sm font-bold border border-blue-200 shadow-sm" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                      </div>
                      <input className="w-full bg-gray-50 p-3 rounded-xl outline-none text-sm text-blue-700 font-bold border border-gray-200" value={emailData.recipient} onChange={e => setEmailData({...emailData, recipient: e.target.value})} placeholder="수신 이메일" />
                      
                      {/* 제목 입력란 (이미 수정 가능하도록 구현되어 있음) */}
                      <input className="w-full bg-gray-50 p-3 rounded-xl outline-none text-sm font-black text-gray-900 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-400 transition-all" value={emailData.subject} onChange={e => setEmailData({...emailData, subject: e.target.value})} />
                      
                      {/* 내용 입력란 (이미 수정 가능하도록 구현되어 있음) */}
                      <textarea className="w-full h-48 bg-gray-50 p-3 rounded-xl outline-none text-sm text-gray-800 resize-none font-medium border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-400 transition-all" value={emailData.content} onChange={e => setEmailData({...emailData, content: e.target.value})} />
                    </div>
                    <div className="col-span-2 p-6 bg-gray-50 flex flex-col overflow-y-auto">
                      <div className="mb-4 text-xs text-blue-600 uppercase font-black">첨부 서류 선택</div>
                      <div className="space-y-2">
                        {standardDocs.map(docName => {
                          const isChecked = emailData.files[docName];
                          return (
                            <button key={docName} onClick={() => setEmailData({...emailData, files: {...emailData.files, [docName]: !isChecked}})} className={`w-full p-3 rounded-lg border flex justify-between text-xs transition-all ${isChecked ? 'bg-white border-blue-400 text-blue-700' : 'bg-transparent border-gray-200 text-gray-400'}`}>
                              <span className="font-bold">{docName}</span>{isChecked ? <CheckSquare size={16}/> : <Square size={16}/>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-gray-300 h-[500px] overflow-y-auto custom-scrollbar">
                    <div className="flex flex-col gap-10 max-w-4xl mx-auto items-center pb-20">
                      {standardDocs.filter(docName => emailData.files[docName]).map((fileName, idx) => (
                        <div key={idx} className="shadow-xl bg-white w-[210mm] h-[297mm] relative overflow-hidden shrink-0 [&>div]:w-full [&>div]:h-full" style={{ boxSizing: 'border-box' }}>
                          {renderDocument(fileName, selectedClaim)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-5 bg-white border-t flex gap-3">
                {!isDocPreview ? (
                  <>
                    <button onClick={() => setActiveModal(null)} className="flex-1 py-3 bg-gray-100 rounded-xl">닫기</button>
                    <button onClick={() => setIsDocPreview(true)} className="flex-[1.5] py-3 bg-indigo-600 text-white rounded-xl font-black flex justify-center items-center gap-2"><Eye size={16}/> 서류 미리보기</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setIsDocPreview(false)} className="flex-1 py-3 bg-white border border-gray-200 rounded-xl font-black flex justify-center items-center gap-2"><ArrowLeft size={16}/> 수정</button>
                    <button onClick={handleSendRealEmail} disabled={isSendingEmail} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-black flex justify-center items-center gap-2 disabled:bg-blue-300">
                      {isSendingEmail ? '발송 중...' : <><Send size={16}/> PDF 이메일 발송</>}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 인쇄 선택 및 미리보기 모달 */}
        {activeModal === 'print' && selectedClaim && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in-95 font-black">
             <div className="bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col flex-1">
              <div className="p-6 bg-gray-800 text-white flex justify-between items-center">
                <h4 className="text-lg">{isPrintDocPreview ? '선택한 서류 인쇄 미리보기' : '서류 인쇄 선택'}</h4>
                <button onClick={() => setActiveModal(null)}><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-hidden">
                {!isPrintDocPreview ? (
                  <div className="p-8 overflow-y-auto bg-gray-50 h-full flex items-center justify-center min-h-[400px]">
                    <div className="w-full max-w-2xl space-y-4">
                       <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-1">
                         <label className="text-[11px] text-gray-700 uppercase font-black block">서류 발행일 선택</label>
                         <p className="text-[10px] text-gray-400 font-bold leading-none mb-1">* 청구서, 교부확인서(하단), 거래명세서 인쇄에 일괄 반영됩니다.</p>
                         <input type="date" className="w-full bg-gray-50 p-2.5 rounded-xl outline-none text-sm font-bold border border-gray-200" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                       </div>
                       <div className="grid grid-cols-2 gap-3">
                         {standardDocs.map((docName) => {
                           const isChecked = printFiles[docName];
                           return (
                             <button key={docName} onClick={() => setPrintFiles({...printFiles, [docName]: !isChecked})} className={`w-full p-4 rounded-xl border-2 flex justify-between text-sm ${isChecked ? 'border-gray-800 text-gray-900 shadow-sm' : 'border-gray-200 text-gray-400'}`}>
                               <span className="font-bold">{docName}</span>{isChecked ? <CheckSquare size={16}/> : <Square size={16}/>}
                             </button>
                           );
                         })}
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 bg-gray-300 h-[500px] overflow-y-auto custom-scrollbar">
                    <div className="flex flex-col gap-10 max-w-4xl mx-auto items-center pb-20">
                      {standardDocs.filter(docName => printFiles[docName]).map((fileName, idx) => (
                        <div key={idx} className="shadow-xl bg-white w-[210mm] h-[297mm] relative overflow-hidden shrink-0 [&>div]:w-full [&>div]:h-full" style={{ boxSizing: 'border-box' }}>
                          {renderDocument(fileName, selectedClaim)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-5 border-t bg-white flex gap-3">
                {!isPrintDocPreview ? (
                  <>
                    <button onClick={() => setActiveModal(null)} className="flex-1 py-3 bg-gray-100 rounded-xl">닫기</button>
                    <button onClick={() => setIsPrintDocPreview(true)} className="flex-[2] py-3 bg-gray-900 text-white rounded-xl font-black flex justify-center items-center gap-2"><Eye size={16}/> 미리보기</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setIsPrintDocPreview(false)} className="flex-1 py-3 bg-white border border-gray-200 rounded-xl font-black flex justify-center items-center gap-2"><ArrowLeft size={16}/> 서류 다시 선택</button>
                    <button onClick={handleForcePrint} className="flex-[2] py-3 bg-gray-900 text-white rounded-xl font-black flex justify-center items-center gap-2"><Printer size={16}/> 인쇄하기 (Ctrl+P)</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 이메일 PDF 변환 전용 백업 레이어 (인쇄 시 숨김 처리됨) */}
      <div className="print-hide-ui" style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -9999 }}>
        <div ref={pdfContainerRef} style={{ width: '210mm' }}>
          {selectedClaim && Object.keys(emailData.files).filter(k => emailData.files[k]).map((fileName) => (
            <div key={fileName} data-docname={fileName} className="w-[210mm] h-[297mm] bg-white relative overflow-hidden shrink-0 [&>div]:w-full [&>div]:h-full" style={{ boxSizing: 'border-box' }}>
              {renderDocument(fileName, selectedClaim)}
            </div>
          ))}
        </div>
      </div>

      {/* --- 인쇄 전용 출력 레이어 (일반 화면에서는 숨김, 프린트(Ctrl+P) 시에만 표시됨) --- */}
      {isPrintDocPreview && selectedClaim && (
        <div className="print-page-area">
          {standardDocs.filter(docName => printFiles[docName]).map((fileName, idx) => (
            <div key={idx} className="print-page-break">
              {renderDocument(fileName, selectedClaim)}
            </div>
          ))}
        </div>
      )}
    </>
  );
}