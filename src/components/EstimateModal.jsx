import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Download, FileText, Loader2, Plus, Minus, Building, Mail, Search, ChevronLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';
import EstimateDoc from './documents/EstimateDoc';
import html2pdf from 'html2pdf.js'; // 💡 새로운 PDF 라이브러리 임포트

export default function EstimateModal({ isOpen, onClose, selectedDevices, companyId }) {
  const [items, setItems] = useState([]);
  const [targetName, setTargetName] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [companyInfo, setCompanyInfo] = useState(null);
  const [isSending, setIsSending] = useState(false);

  const [govList, setGovList] = useState([]);
  const [filteredGovs, setFilteredGovs] = useState([]);
  const [isGovDropdownOpen, setIsGovDropdownOpen] = useState(false);

  // 💡 메일 작성 모드 관련 상태 추가
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  const printRef = useRef(null);

  useEffect(() => {
    if (selectedDevices && selectedDevices.length > 0) {
      const initialItems = selectedDevices.map(device => ({ ...device, quantity: 1, total: device.price }));
      setItems(initialItems);
    }
  }, [selectedDevices]);

  useEffect(() => {
    async function fetchData() {
      if (companyId) {
        const { data: cData } = await supabase.from('company_profile').select('*').eq('company_id', companyId).maybeSingle();
        if (cData) setCompanyInfo(cData);
      }
      const { data: gData } = await supabase.from('local_governments').select('*');
      if (gData) {
        setGovList(gData);
        setFilteredGovs(gData);
      }
    }
    fetchData();
  }, [companyId]);

  // 수신처가 변경될 때마다 메일 제목/본문 기본값 자동 세팅
  useEffect(() => {
    const compName = companyInfo?.company_name || '협력업체';
    const compPhone = companyInfo?.contact_number || '연락처 미등록';
    const compEmail = companyInfo?.email || '이메일 미등록'; 

    setEmailSubject(`[견적서] ${compName} - 장애인 보조기기 견적서 송부 건`);
    
    // 💡 요청하신 양식에 맞게 띄어쓰기와 줄바꿈(\n)을 적용하여 가독성을 높였습니다.
    setEmailBody(`안녕하세요, ${targetName || '지자체'} 담당 주무관님.

요청하신 장애인 보조기기 견적서를 첨부파일(PDF)로 보내드립니다.
기타 문의사항이 있으시면 언제든 연락 부탁드립니다.
감사합니다.

${compName}
전화: ${compPhone}
이메일: ${compEmail}`);
  }, [targetName, companyInfo]);

  const totalAmount = items.reduce((acc, item) => acc + item.total, 0);

  const updateQuantity = (id, delta) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty, total: item.price * newQty };
      }
      return item;
    }));
  };

  const handleGovSearch = (e) => {
    const val = e.target.value;
    setTargetName(val);
    setIsGovDropdownOpen(true);
    setFilteredGovs(govList.filter(g => g.name.includes(val)));
  };

  const handleSelectGov = (gov) => {
    setTargetName(gov.name);
    setTargetEmail(gov.manager_email || gov.email || '');
    setIsGovDropdownOpen(false);
  };

  // 💡 PDF 저장 옵션 공통화
  const getPdfOptions = () => ({
    margin: 0,
    filename: `${targetName || '지자체'}_견적서.pdf`,
    image: { type: 'jpeg', quality: 1 },
    // 💡 변경: scrollY: 0 을 추가하여 스크롤 위치와 상관없이 항상 문서 최상단부터 캡처하도록 강제합니다.
    html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  });

  // 💡 [기능 1] PDF 강제 다운로드
  const handlePdfDownload = () => {
    html2pdf().set(getPdfOptions()).from(printRef.current).save();
  };

  // 💡 [기능 2] 최종 이메일 발송 (PDF 변환 후 첨부)
  const handleSendEmail = async () => {
    setIsSending(true);
    try {
      // 1. DB에 견적 이력 저장
      const { error: dbError } = await supabase.from('estimates').insert([{
        company_id: companyId,
        target_name: targetName,
        items: items,
        total_amount: totalAmount
      }]);
      if (dbError) throw dbError;

      // 2. 화면의 견적서를 PDF Base64 데이터로 변환 (백그라운드에서 진행)
      const pdfBase64String = await html2pdf()
        .set(getPdfOptions())
        .from(printRef.current)
        .outputPdf('datauristring');
      
      // 'data:application/pdf;base64,' 앞부분을 잘라내고 순수 데이터만 추출
      const base64Data = pdfBase64String.split(',')[1];

      // 3. Supabase Edge Function 호출
      const { error: emailError } = await supabase.functions.invoke('send-estimate-email', {
        body: {
          to: targetEmail,
          subject: emailSubject,
          textBody: emailBody,
          companyName: companyInfo?.company_name || '협력업체',
          targetName: targetName || '지자체',
          attachmentBase64: base64Data // PDF 첨부파일 탑재
        }
      });
      if (emailError) throw emailError;

      alert('✅ 견적서가 PDF로 첨부되어 성공적으로 발송되었습니다!');
      onClose();
    } catch (error) {
      console.error(error);
      alert('견적서 발송에 실패했습니다: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in font-sans">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
        
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <FileText className="text-indigo-600" /> 견적서 발행 및 발송
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 bg-white rounded-full transition-all shadow-sm">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          
          {/* 좌측 패널: 기본 설정 모드 vs 이메일 작성 모드 교체 */}
          <div className="w-full md:w-1/3 bg-white border-r border-gray-100 p-6 flex flex-col overflow-y-auto custom-scrollbar">
            
            {!isEmailMode ? (
              // --- [기본 모드] 수신처 및 수량 설정 ---
              <>
                <div className="space-y-4 mb-6">
                  <h3 className="font-black text-gray-800 text-sm">1. 수신처 정보 설정</h3>
                  
                  <div className="relative">
                    <label className="text-xs font-bold text-gray-500 ml-1 flex items-center gap-1 mb-1.5"><Building size={12}/> 기관명(지자체명) 검색</label>
                    <div className="relative">
                      <input 
                        type="text" placeholder="예: 성남시청 (검색어 입력)" 
                        className="w-full bg-gray-50 p-3 pr-10 rounded-xl outline-none font-bold text-sm focus:ring-2 focus:ring-indigo-100"
                        value={targetName} onChange={handleGovSearch}
                        onFocus={() => setIsGovDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setIsGovDropdownOpen(false), 200)}
                      />
                      <Search size={16} className="absolute right-3 top-3.5 text-gray-400" />
                    </div>
                    {isGovDropdownOpen && filteredGovs.length > 0 && (
                      <ul className="absolute z-10 w-full bg-white border border-gray-200 mt-1 rounded-xl shadow-xl max-h-48 overflow-y-auto top-full left-0">
                        {filteredGovs.map(gov => (
                          <li key={gov.id} className="p-3 hover:bg-indigo-50 cursor-pointer text-sm font-bold border-b border-gray-100 flex justify-between" onMouseDown={() => handleSelectGov(gov)}>
                            <span>{gov.name}</span>
                            <span className="text-gray-400 text-xs truncate max-w-[120px]">{gov.manager_email || gov.email}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 ml-1 flex items-center gap-1 mb-1.5"><Mail size={12}/> 수신 이메일</label>
                    <input 
                      type="email" placeholder="이메일 주소 직접 입력/수정" 
                      className="w-full bg-gray-50 p-3 rounded-xl outline-none font-bold text-sm focus:ring-2 focus:ring-indigo-100"
                      value={targetEmail} onChange={(e) => setTargetEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4 flex-1">
                  <h3 className="font-black text-gray-800 text-sm border-t pt-4">2. 품목 수량 조절 ({items.length}건)</h3>
                  <div className="space-y-3">
                    {items.map(item => (
                      <div key={item.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <p className="font-black text-gray-900 text-sm mb-2 line-clamp-1">{item.name}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-indigo-600 font-bold text-sm">₩{item.price.toLocaleString()}</span>
                          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-2 py-1">
                            <button onClick={() => updateQuantity(item.id, -1)} className="text-gray-400 hover:text-gray-900"><Minus size={14}/></button>
                            <span className="font-black text-sm w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="text-gray-400 hover:text-gray-900"><Plus size={14}/></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => {
                        if(!targetName || !targetEmail) return alert('수신처와 이메일을 먼저 입력해주세요.');
                        setIsEmailMode(true); // 이메일 작성 모드로 전환
                      }} 
                      className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Mail size={18}/> 이메일 발송 내용 작성하기
                    </button>
                    <button 
                      onClick={handlePdfDownload}
                      className="w-full py-3.5 bg-white border-2 border-indigo-100 text-indigo-600 rounded-xl font-black hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Download size={18}/> PDF 저장 및 인쇄
                    </button>
                  </div>
                </div>
              </>
            ) : (
              // --- [이메일 모드] 메일 제목 및 본문 수정 ---
              <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
                <button 
                  onClick={() => setIsEmailMode(false)} 
                  className="flex items-center gap-1 text-gray-500 font-bold hover:text-gray-900 mb-6 text-sm w-fit"
                >
                  <ChevronLeft size={16}/> 이전으로 돌아가기
                </button>
                
                <h3 className="font-black text-xl text-gray-900 mb-6">메일 미리보기 및 수정</h3>
                
                <div className="space-y-5 flex-1">
                  <div>
                    <label className="text-xs font-bold text-gray-500 ml-1 mb-1.5 block">보내는 사람 (발송자)</label>
                    <input 
                      type="text" disabled 
                      value={`${companyInfo?.company_name || '협력업체'} <no-reply@aidbill.kr>`} 
                      className="w-full bg-gray-100 text-gray-500 p-3 rounded-xl outline-none font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 ml-1 mb-1.5 block">메일 제목</label>
                    <input 
                      type="text" 
                      value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none font-bold text-sm focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <label className="text-xs font-bold text-gray-500 ml-1 mb-1.5 block">메일 본문 내용</label>
                    <textarea 
                      value={emailBody} onChange={(e) => setEmailBody(e.target.value)}
                      className="w-full flex-1 bg-gray-50 border border-gray-200 p-4 rounded-xl outline-none font-medium text-sm focus:ring-2 focus:ring-indigo-100 resize-none leading-relaxed"
                    />
                  </div>
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-2">
                    <FileText size={16} className="text-indigo-500 shrink-0"/>
                    <span className="text-sm font-bold text-indigo-700 truncate">{targetName}_견적서.pdf (자동 첨부)</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100">
                  <button 
                    onClick={handleSendEmail} 
                    disabled={isSending}
                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {isSending ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>}
                    PDF 첨부하여 최종 발송하기
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* 우측: 실제 견적서 렌더링 영역 (PDF 변환의 원본) */}
          <div className="w-full md:w-2/3 bg-gray-200 p-4 md:p-8 overflow-y-auto flex justify-center items-start custom-scrollbar">
            {/* 💡 회색 박스(bg-gray-200)가 침범하지 않도록 불필요한 div와 여백(padding)을 완전히 제거했습니다. */}
            <div className="shadow-xl transform origin-top md:scale-100 scale-75 shrink-0">
              <div ref={printRef} className="bg-white">
                <EstimateDoc 
                  targetName={targetName || '지자체명 미지정'} 
                  companyInfo={companyInfo} 
                  items={items} 
                  totalAmount={totalAmount} 
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}