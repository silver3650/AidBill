import React from 'react';

export default function BenefitClaimFormDoc({ data }) {
  const dummyData = {
    claim_date: '2026-05-24',
    customer: {
      name: '홍길동',
      resident_number: '[RRN Omitted]',
      phone: '02-123-4567',
      mobile: '010-1234-5678',
      disability_type: '지체장애',
      disability_level: '심한장애',
      discount_type: '1',
      qualification: '건강보험'
    },
    company: {
      name: '에이드빌 의료기기',
      representative: '김대표',
      business_number: '123-45-67890',
      phone: '02-987-6543',
      mobile: '010-9876-5432',
      address: '경기도 성남시 분당구 판교역로 123',
      bank: '신한은행',
      account_number: '110-123-456789'
    },
    product: {
      name: '수동휠체어',
      purchase_date: '2026-05-20',
      model: 'WHEEL-2000',
      manufacturer: '한국메디칼',
      mfg_date: '2026-01-15',
      serial_no: 'SN-20260115-001',
      std_code: '8801234567890',
      base_price: '480,000',
      notice_price: '500,000',
      actual_price: '500,000',
      self_burden_price: '50,000',
      claim_price: '450,000'
    },
    account: {
      type: '가입자',
      bank: '국민은행',
      account_number: '111-222-3333',
      holder: '홍길동'
    },
    claimant: {
      name: '이순신',
      resident_number: '[RRN Omitted]',
      relation: '배우자',
      phone: '02-321-7654',
      mobile: '010-4321-8765'
    },
    signatures: {
      claimant_sign: '',
      customer_sign: '',
      company_seal: ''
    }
  };

  if (!data) return <div className="p-10">데이터 로딩 중...</div>;

  const activeData = data || {};

  const customerData = activeData.customer || {};
  const customer = {
    name: customerData.name || dummyData.customer.name,
    resident_number: customerData.resident_number || dummyData.customer.resident_number,
    phone: customerData.phone || dummyData.customer.phone,
    mobile: customerData.mobile || customerData.phone || dummyData.customer.mobile,
    disability_type: customerData.disability_type || dummyData.customer.disability_type,
    disability_level: customerData.disability_level || dummyData.customer.disability_level,
    discount_type: customerData.discount_type || dummyData.customer.discount_type,
    qualification: customerData.qualification || dummyData.customer.qualification
  };

  const compData = activeData.company || {};
  const company = {
    name: compData.company_name || dummyData.company.name,
    representative: compData.representative_name || dummyData.company.representative,
    business_number: compData.business_number || dummyData.company.business_number,
    phone: compData.contact_number || dummyData.company.phone,
    mobile: compData.contact_number || dummyData.company.mobile,
    address: `${compData.address || ''} ${compData.detail_address || ''}`.trim() || dummyData.company.address,
    bank: compData.bank_name || compData.bank || dummyData.company.bank,
    account_number: compData.account_number || dummyData.company.account_number,
    account_holder: compData.account_holder || dummyData.company.account_holder,
  };

  const prodData = activeData.product || {};
  const product = {
    name: prodData.name || dummyData.product.name,
    purchase_date: activeData.purchase_date || prodData.purchase_date || dummyData.product.purchase_date,
    model: prodData.model || dummyData.product.model,
    manufacturer: prodData.manufacturer || dummyData.product.manufacturer,
    mfg_date: activeData.mfg_date || prodData.mfg_date || dummyData.product.mfg_date,
    serial_no: prodData.serial_no || dummyData.product.serial_no,
    std_code: prodData.std_code || dummyData.product.std_code,
  };

  const accountData = activeData.account || {};
  const account = {
    bank: accountData.bank || dummyData.account.bank,
    account_number: accountData.account_number || dummyData.account.account_number,
    holder: accountData.holder || dummyData.account.holder
  };

  const claimantData = activeData.claimant || {};
  const claimant = {
    name: claimantData.name || dummyData.claimant.name,
    resident_number: claimantData.resident_number || dummyData.claimant.resident_number,
    relation: claimantData.relation || dummyData.claimant.relation,
    phone: claimantData.phone || dummyData.claimant.phone,
    mobile: claimantData.mobile || dummyData.claimant.mobile
  };

  const sigData = activeData.signatures || {};
  const signatures = {
    claimant_sign: sigData.claimant_sign || dummyData.signatures.claimant_sign,
    customer_sign: sigData.customer_sign || dummyData.signatures.customer_sign,
    company_seal: sigData.company_seal || dummyData.signatures.company_seal
  };

  const claim_date = activeData.claim_date || dummyData.claim_date;
  
  const claimSubject = activeData.claimSubject || '기업 (업체 위탁 청구)';
  const isSelfClaim = claimSubject === '개인 (본인 계좌 청구)';
  const isFamilyClaim = claimSubject === '개인 (가족 계좌 청구)';
  const isCompanyClaim = claimSubject === '기업 (업체 위탁 청구)';

  let displayBank = '';
  let displayAccountNum = '';
  let displayHolder = '';
  let displayIdNum = '';

  if (isCompanyClaim) {
    displayBank = company?.bank;
    displayAccountNum = company?.account_number;
    displayHolder = company?.account_holder || company?.name;
    displayIdNum = company?.business_number;
  } else if (isFamilyClaim) {
    displayBank = account?.bank;
    displayAccountNum = account?.account_number;
    displayHolder = account?.holder || claimant?.name;
    displayIdNum = claimant?.resident_number;
  } else if (isSelfClaim) {
    displayBank = account?.bank;
    displayAccountNum = account?.account_number;
    displayHolder = account?.holder || customer?.name;
    displayIdNum = customer?.resident_number;
  }

  let finalClaimantName = '';
  let finalClaimantSign = null;
  let finalClaimantRRN = '';
  let finalClaimantRel = '';
  let finalClaimantPhone = '';

  if (isCompanyClaim) {
    finalClaimantName = company?.name;
    finalClaimantSign = signatures?.company_seal;
    finalClaimantRRN = company?.business_number;
    finalClaimantRel = '판매업자';
    finalClaimantPhone = company?.phone || company?.mobile;
  } else if (isFamilyClaim) {
    finalClaimantName = claimant?.name;
    finalClaimantSign = signatures?.claimant_sign;
    finalClaimantRRN = claimant?.resident_number;
    finalClaimantRel = claimant?.relation;
    finalClaimantPhone = claimant?.mobile || claimant?.phone;
  } else {
    finalClaimantName = customer?.name;
    finalClaimantSign = signatures?.customer_sign;
    finalClaimantRRN = customer?.resident_number;
    finalClaimantRel = '본인';
    finalClaimantPhone = customer?.mobile || customer?.phone;
  }

  const baseP = prodData.standard_price || 0;
  const noticeP = prodData.price || 0;
  const actualP = activeData.total_amount || 0;

  let displayBasePrice = baseP ? `${baseP.toLocaleString()} 원` : '';
  let displayNoticePrice = noticeP ? `${noticeP.toLocaleString()} 원` : '';
  let displayActualPrice = actualP ? `${actualP.toLocaleString()} 원` : '';
  let displaySelfBurden = '';
  let displayClaimAmount = '';

  if (activeData.calculated_copay !== undefined && activeData.calculated_claim_amount !== undefined) {
    displaySelfBurden = `${activeData.calculated_copay.toLocaleString()} 원`;
    displayClaimAmount = `${activeData.calculated_claim_amount.toLocaleString()} 원`;
  }

  const dateParts = claim_date ? claim_date.split('-') : ['    ', '  ', '  '];

  const TableCell = ({ children, className = "", style = {}, ...props }) => (
    <td className={`border border-slate-800 p-[3px] text-center ${className}`} style={{ verticalAlign: 'middle', ...style }} {...props}>
      {children}
    </td>
  );

  const CheckBox = ({ checked }) => (
    <span className="inline-block w-[12px] text-center font-black">
      {checked ? '√' : '\u00A0'}
    </span>
  );

  return (
    <div 
      className="bg-white w-[210mm] h-[297mm] p-[15mm] text-slate-900 font-sans text-[11px] box-border relative flex flex-col overflow-hidden print:break-after-page print:overflow-visible shrink-0"
      style={{ pageBreakAfter: 'always', pageBreakInside: 'avoid' }}
    >
      
      <div className="shrink-0">
        <div className="text-[10px] text-left mb-0.5 text-slate-700">■ 국민건강보험법 시행규칙 [별지 제21호서식]</div>
        <div className="text-2xl font-black text-center tracking-[0.3em] py-1.5">보조기기 급여 지급청구서</div>
        <div className="flex justify-between text-[10px] text-slate-600 mb-1">
          <span>※ 색상이 어두운 난은 신청인이 적지 않으며, [  ]에는 해당되는 곳에 √ 표시를 합니다.</span>
          <span>(제1쪽)</span>
        </div>
      </div>

      {/* 접수 정보 */}
      <table className="w-full border-collapse border-[1px] border-slate-800 mb-1 shrink-0">
        <tbody>
          <tr className="bg-slate-200">
            <TableCell className="w-[16%] font-bold px-2 border-r-0" style={{ textAlign: 'left' }}>접수번호</TableCell>
            <TableCell className="border-l-0 w-auto"></TableCell>
            <TableCell className="font-bold px-2 border-r-0 w-[60px]" style={{ textAlign: 'left' }}>접수일</TableCell>
            <TableCell className="border-l-0 w-auto"></TableCell>
            <TableCell className="font-bold border-r-0 w-[60px]" style={{ textAlign: 'left' }}>처리기간</TableCell>
            <TableCell className="border-l-0 w-[100px] bg-slate-200" style={{ textAlign: 'left' }}>7일</TableCell>
          </tr>
          <tr>
            <TableCell className="w-[16%] font-bold leading-tight py-1 bg-slate-200">본인부담액<br/>경감 대상자</TableCell>
            <TableCell colSpan="5" className="px-4 leading-tight bg-slate-200 py-1" style={{ textAlign: 'left' }}>
              [ <CheckBox checked={false} /> ] 「국민건강보험법 시행령」 별표 2 제3호라목1)에 해당하는 사람<br/>
              [ <CheckBox checked={false} /> ] 「국민건강보험법 시행령」 별표 2 제3호라목2)에 해당하는 사람
            </TableCell>
          </tr>
        </tbody>
      </table>

      {/* ① 급여를 받을 사람 */}
      <table className="w-full border-collapse border-[1px] border-slate-800 mb-1 shrink-0">
        <tbody>
          <tr>
            <TableCell rowSpan="3" className="w-[16%] font-bold bg-slate-100 leading-snug">① 급여를<br/>받을 사람</TableCell>
            <TableCell className="bg-slate-100 font-bold w-[12%]">성명</TableCell>
            <TableCell className="w-[20%]">{customer?.name}</TableCell>
            <TableCell className="bg-slate-100 font-bold w-[20%]">주민(외국인)등록번호</TableCell>
            <TableCell className="w-[32%] px-2" style={{ textAlign: 'left' }}>{customer?.resident_number}</TableCell>
          </tr>
          <tr>
            <TableCell className="bg-slate-100 font-bold">자택 전화번호</TableCell>
            <TableCell>{customer?.phone}</TableCell>
            <TableCell className="bg-slate-100 font-bold">휴대전화 번호</TableCell>
            <TableCell className="px-2" style={{ textAlign: 'left' }}>{customer?.mobile}</TableCell>
          </tr>
          <tr>
            <TableCell className="bg-slate-100 font-bold">장애명</TableCell>
            <TableCell>{customer?.disability_type}</TableCell>
            <TableCell className="bg-slate-100 font-bold">장애 정도</TableCell>
            <TableCell className="px-2 whitespace-nowrap" style={{ textAlign: 'left' }}>
              [ <CheckBox checked={customer?.disability_level === '심한장애' || customer?.disability_level === '심함'} /> ] 심한 장애 &nbsp;&nbsp;&nbsp; 
              [ <CheckBox checked={customer?.disability_level === '심하지않은장애' || customer?.disability_level === '심하지 않음'} /> ] 심하지 않은 장애
            </TableCell>
          </tr>
        </tbody>
      </table>

      {/* ② 보조기기 (제품정보) */}
      <table className="w-full border-collapse border-[1px] border-slate-800 mb-1 table-fixed shrink-0">
        <tbody>
          <tr>
            <TableCell rowSpan="3" className="w-[16%] font-bold bg-slate-100 leading-snug">② 보조기기<br/><span className="font-normal text-[10px]">(제품정보)</span></TableCell>
            <TableCell className="bg-slate-100 font-bold w-[12%]">명칭</TableCell>
            <TableCell className="w-[17%]">{product?.name}</TableCell>
            <TableCell className="bg-slate-100 font-bold w-[15%]">구입일</TableCell>
            <TableCell colSpan="3" className="w-[40%]">{product?.purchase_date}</TableCell>
          </tr>
          <tr>
            <TableCell className="bg-slate-100 font-bold">모델명</TableCell>
            <TableCell>{product?.model}</TableCell>
            <TableCell className="bg-slate-100 font-bold">제조(수입)업소명</TableCell>
            <TableCell className="w-[15%]">{product?.manufacturer}</TableCell>
            <TableCell className="bg-slate-100 font-bold w-[10%]">제조일</TableCell>
            <TableCell className="w-[13%]">{product?.mfg_date}</TableCell>
          </tr>
          <tr>
            <TableCell className="bg-slate-100 font-bold">제품제조번호</TableCell>
            <TableCell>{product?.serial_no}</TableCell>
            <TableCell className="bg-slate-100 font-bold">표준코드</TableCell>
            <TableCell colSpan="3">{product?.std_code}</TableCell>
          </tr>
        </tbody>
      </table>

      {/* ③ 급여를 받을 사람 외 청구인 */}
      <table className="w-full border-collapse border-[1px] border-slate-800 mb-1 table-fixed shrink-0">
        <tbody>
          <tr>
            <TableCell rowSpan="4" className="w-[16%] font-bold bg-slate-100 leading-snug">③ 급여를 받을<br/>사람 외 청구인</TableCell>
            <TableCell rowSpan="2" className="w-[6%] bg-slate-100 font-bold px-0">가족</TableCell>
            <TableCell className="bg-slate-100 font-bold w-[9%]">성명</TableCell>
            <TableCell className="w-[15%]">{isFamilyClaim ? claimant?.name : ''}</TableCell>
            <TableCell className="bg-slate-100 font-bold w-[12%]">주민등록번호</TableCell>
            <TableCell className="w-[15%]">{isFamilyClaim ? claimant?.resident_number : ''}</TableCell>
            <TableCell className="bg-slate-100 font-bold w-[14%] leading-tight">급여를 받을<br/>사람과의 관계</TableCell>
            <TableCell className="w-[13%]">{isFamilyClaim ? claimant?.relation : ''}</TableCell>
          </tr>
          <tr>
            <TableCell className="bg-slate-100 font-bold">연락처</TableCell>
            <TableCell colSpan="2" className="px-2 border-r-0" style={{ textAlign: 'left' }}>(자택) {isFamilyClaim ? claimant?.phone : ''}</TableCell>
            <TableCell colSpan="3" className="px-2 border-l-0" style={{ textAlign: 'left' }}>(휴대전화) {isFamilyClaim ? claimant?.mobile : ''}</TableCell>
          </tr>
          <tr>
            <TableCell rowSpan="2" className="bg-slate-100 font-bold leading-tight px-0">판매<br/>업자</TableCell>
            <TableCell className="bg-slate-100 font-bold">상호</TableCell>
            <TableCell>{isCompanyClaim ? company?.name : ''}</TableCell>
            <TableCell className="bg-slate-100 font-bold">사업자등록번호</TableCell>
            <TableCell>{isCompanyClaim ? company?.business_number : ''}</TableCell>
            <TableCell className="bg-slate-100 font-bold">대표자</TableCell>
            <TableCell className="relative">
              {isCompanyClaim ? company?.representative : ''}
            </TableCell>
          </tr>
          <tr>
            <TableCell className="bg-slate-100 font-bold">연락처</TableCell>
            <TableCell colSpan="2" className="px-2 border-r-0" style={{ textAlign: 'left' }}>(업소) {isCompanyClaim ? company?.phone : ''}</TableCell>
            <TableCell colSpan="3" className="px-2 border-l-0" style={{ textAlign: 'left' }}>(휴대전화) {isCompanyClaim ? company?.mobile : ''}</TableCell>
          </tr>
        </tbody>
      </table>
      <div className="text-[10px] text-slate-700 leading-tight mb-1 tracking-tight shrink-0">
        ※ 급여를 받을 사람 본인이 아닌 가족 또는 보조기기 판매업자가 청구하는 경우에 기재하며, 보조기기 급여를 청구할 수 있는 가족은 급여를<br/>
        &nbsp;&nbsp;&nbsp;&nbsp;받을 사람의 배우자 및 직계존비속, 급여를 받을 사람과 건강보험증을 같이 하거나 주민등록이 같이 되어 있는 형제자매 또는<br/>
        &nbsp;&nbsp;&nbsp;&nbsp;직계비속의 배우자입니다.
      </div>

      {/* ④ 구입처 */}
      <table className="w-full border-collapse border-[1px] border-slate-800 mb-1 table-fixed shrink-0">
        <tbody>
          <tr>
            <TableCell rowSpan="3" className="w-[16%] font-bold bg-slate-100">④ 구입처</TableCell>
            <TableCell className="w-[14%] bg-slate-100 font-bold px-2 border-r-0" style={{ textAlign: 'left' }}>상호</TableCell>
            <TableCell colSpan="2" className="w-[28%] border-l-0 px-2" style={{ textAlign: 'left' }}>{company?.name}</TableCell>
            <TableCell className="w-[15%] bg-slate-100 font-bold px-2 border-r-0" style={{ textAlign: 'left' }}>대표자</TableCell>
            <TableCell className="w-[27%] border-l-0 px-2" style={{ textAlign: 'left' }}>{company?.representative}</TableCell>
          </tr>
          <tr>
            <TableCell className="bg-slate-100 font-bold px-2 border-r-0" style={{ textAlign: 'left' }}>사업자등록번호</TableCell>
            <TableCell colSpan="2" className="border-l-0 px-2" style={{ textAlign: 'left' }}>{company?.business_number}</TableCell>
            <TableCell className="bg-slate-100 font-bold px-2 border-r-0" style={{ textAlign: 'left' }}>전화번호</TableCell>
            <TableCell className="border-l-0 px-2" style={{ textAlign: 'left' }}>{company?.phone}</TableCell>
          </tr>
          <tr>
            <TableCell colSpan="2" className="bg-slate-100 font-bold px-2 border-r-0 whitespace-nowrap" style={{ textAlign: 'left' }}>
              주소<span className="font-normal"> (미등록 업소만 기록합니다)</span>
            </TableCell>
            <TableCell colSpan="3" className="px-2 border-l-0" style={{ textAlign: 'left' }}>{company?.address}</TableCell>
          </tr>
        </tbody>
      </table>

      {/* ⑤~⑨ 금액 정보 */}
      <table className="w-full border-collapse border-[1px] border-slate-800 mb-1 shrink-0">
        <tbody>
          <tr className="bg-slate-100 font-bold">
            <TableCell className="w-[16%]">⑤ 기준액</TableCell>
            <TableCell className="w-[21%]">⑥ 고시금액</TableCell>
            <TableCell className="w-[21%]">⑦ 실구입(판매)금액(⑧+⑨)</TableCell>
            <TableCell className="w-[21%]">⑧ 본인부담액</TableCell>
            <TableCell className="w-[21%]">⑨ 청구금액</TableCell>
          </tr>
          <tr>
            <TableCell className="px-2 py-1" style={{ textAlign: 'right' }}>{displayBasePrice}</TableCell>
            <TableCell className="px-2 py-1" style={{ textAlign: 'right' }}>{displayNoticePrice}</TableCell>
            <TableCell className="px-2 py-1" style={{ textAlign: 'right' }}>{displayActualPrice}</TableCell>
            <TableCell className="px-2 py-1" style={{ textAlign: 'right' }}>{displaySelfBurden}</TableCell>
            <TableCell className="px-2 py-1" style={{ textAlign: 'right' }}>{displayClaimAmount}</TableCell>
          </tr>
          <tr><TableCell className="px-2 py-1" style={{ textAlign: 'right' }}></TableCell><TableCell className="px-2 py-1" style={{ textAlign: 'right' }}></TableCell><TableCell className="px-2 py-1" style={{ textAlign: 'right' }}></TableCell><TableCell className="px-2 py-1" style={{ textAlign: 'right' }}></TableCell><TableCell className="px-2 py-1" style={{ textAlign: 'right' }}></TableCell></tr>
          <tr><TableCell className="px-2 py-1" style={{ textAlign: 'right' }}></TableCell><TableCell className="px-2 py-1" style={{ textAlign: 'right' }}></TableCell><TableCell className="px-2 py-1" style={{ textAlign: 'right' }}></TableCell><TableCell className="px-2 py-1" style={{ textAlign: 'right' }}></TableCell><TableCell className="px-2 py-1" style={{ textAlign: 'right' }}></TableCell></tr>
        </tbody>
      </table>

      {/* ⑩ 수령 계좌 */}
      <table className="w-full border-collapse border-[1px] border-slate-800 mb-2 shrink-0">
        <tbody>
          <tr>
            <TableCell rowSpan="3" className="w-[8%] font-bold bg-slate-100 leading-snug">⑩<br/>수령<br/>계좌</TableCell>
            <TableCell className="px-2 w-[36%]" style={{ textAlign: 'left' }}>
              [ <CheckBox checked={isSelfClaim || isFamilyClaim} /> ] 가입자 또는 피부양자 계좌
            </TableCell>
            <TableCell rowSpan="2" className="bg-slate-100 font-bold w-[9%]">금융기관명</TableCell>
            <TableCell rowSpan="2" className="w-[13%]">{displayBank}</TableCell>
            <TableCell rowSpan="2" className="bg-slate-100 font-bold w-[17%]">계좌번호</TableCell>
            <TableCell rowSpan="2" className="w-[17%]">{displayAccountNum}</TableCell>
          </tr>
          <tr>
            <TableCell className="px-2" style={{ textAlign: 'left' }}>
              [ <CheckBox checked={isCompanyClaim} /> ] 보조기기 판매업자 계좌
            </TableCell>
          </tr>
          <tr>
            <TableCell className="px-2 leading-tight" style={{ textAlign: 'left' }}>
              [ <CheckBox checked={false} /> ] 급여를 받을 사람 본인의 요양비등 수급계좌<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(압류방지 계좌)
            </TableCell>
            <TableCell className="bg-slate-100 font-bold">예금주</TableCell>
            <TableCell>{displayHolder}</TableCell>
            <TableCell className="bg-slate-100 font-bold leading-tight py-1">주민(외국인)등록번호<br/>또는 사업자등록번호</TableCell>
            <TableCell>{displayIdNum}</TableCell>
          </tr>
        </tbody>
      </table>

      {/* 하단 서명 테이블 블록 */}
      <div className="flex flex-col shrink-0">
        <p className="text-center font-medium mb-1.5 text-[11px]">
          「국민건강보험법 시행규칙」 제26조제2항 및 제4항에 따라 위와 같이 보조기기 급여의 지급을 청구합니다.
        </p>
        
        <div className="text-right font-bold text-[12px] mb-2 pr-6">
          {dateParts[0]} 년 &nbsp;&nbsp;&nbsp;&nbsp; {dateParts[1]} 월 &nbsp;&nbsp;&nbsp;&nbsp; {dateParts[2]} 일
        </div>

        <div className="w-full border-y-[1px] border-slate-800 mb-3 text-[11px] py-2 px-4 flex flex-col items-end justify-center bg-white">
          <div className="flex items-center justify-end whitespace-nowrap mb-1.5">
            <span className="font-bold mr-3">⑪ 청구인</span>
            <span className="relative mr-2 font-medium">
              {finalClaimantName}
            </span>
            <span className="relative flex items-center justify-center mr-8 font-medium">
              {finalClaimantSign && (
                <img src={finalClaimantSign} alt="서명/직인" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 mix-blend-multiply z-10 pointer-events-none" />
              )}
              <span>(서명 또는 인)</span>
            </span>
            <span className="font-bold mr-3">주민등록번호 또는 사업자등록번호</span>
            <span className="font-medium">
              {finalClaimantRRN}
            </span>
          </div>
          
          <div className="flex items-center justify-end whitespace-nowrap mt-1">
            <span className="font-bold mr-3">급여를 받을 사람과의 관계</span>
            <span className="mr-8 font-medium">{finalClaimantRel}</span>
            <span className="font-bold mr-3">(휴대)전화번호</span>
            <span className="font-medium">{finalClaimantPhone}</span>
          </div>
        </div>

        <h2 className="text-[18px] font-black tracking-tighter text-left mb-2 px-2">
          국민건강보험공단 이사장 <span className="text-[13px] font-normal">귀하</span>
        </h2>
      </div>

      {/* 정보 이용 동의서 */}
      <table className="w-full border-y-[2px] border-slate-800 border-x-0 mb-1 shrink-0 text-[11px]">
        <tbody>
          <tr className="bg-slate-200 border-b-[1px] border-slate-800">
            <td colSpan="2" className="text-center font-bold text-[12px] py-1.5 tracking-widest">
              정보 이용 동의서
            </td>
          </tr>
          <tr>
            <td colSpan="2" className="text-[10px] leading-snug py-2 px-2 text-justify">
              본인은 위 보조기기 급여의 지급 관련 정보(급여 지급 여부ㆍ품목, 사용 가능 기간 등)를 「사회보장기본법」 제37조에 따라 사회보장정보시스템에 제공하는 것에 동의합니다.
            </td>
          </tr>
          <tr>
            <td className="font-bold py-2 px-2 w-[70%]" style={{ textAlign: 'right' }}>
              급여를 받을 사람
            </td>
            <td className="text-center relative py-2 px-2 w-[30%]">
              {customer?.name} &nbsp;&nbsp; 
              <span className="relative inline-flex items-center justify-center">
                {signatures?.customer_sign && (
                  <img src={signatures.customer_sign} alt="수급자 서명" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 mix-blend-multiply pointer-events-none" />
                )}
                <span>(서명 또는 인)</span>
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* mt-auto가 이미 존재하므로 이 요소가 남은 공간을 밀어내어 하단 정렬을 유지시킵니다. */}
      <div className="text-[9px] text-right text-slate-500 tracking-wider shrink-0 mt-auto">
        210mm×297mm[백상지(80g/㎡) 또는 중질지(80g/㎡)]
      </div>
    </div>
  );
}