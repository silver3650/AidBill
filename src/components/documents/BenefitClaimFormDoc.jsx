import React from 'react';

export default function BenefitClaimFormDoc({ data }) {
  // 1. 빈자리를 채워줄 기본(샘플) 데이터
  const dummyData = {
    claim_date: '2026-05-24',
    customer: {
      name: '홍길동',
      resident_number: '800101-1234567',
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
      resident_number: '700101-1234567',
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

  // 2. 전달받은 실데이터와 더미 데이터를 깊은 병합
  const activeData = data || {};
  const customer = { ...dummyData.customer, ...(activeData.customer || {}) };
  const company = { ...dummyData.company, ...(activeData.company || {}) };
  const product = { ...dummyData.product, ...(activeData.product || {}) };
  const account = { ...dummyData.account, ...(activeData.account || {}) };
  const claimant = { ...dummyData.claimant, ...(activeData.claimant || {}) };
  const signatures = { ...dummyData.signatures, ...(activeData.signatures || {}) };
  const claim_date = activeData.claim_date || dummyData.claim_date;
  
  // 💡 청구 주체 3단계 분류
  const claimSubject = activeData.claimSubject || '기업 (업체 위탁 청구)';
  const isSelfClaim = claimSubject === '개인 (본인 계좌 청구)';
  const isFamilyClaim = claimSubject === '개인 (가족 계좌 청구)';
  const isCompanyClaim = claimSubject === '기업 (업체 위탁 청구)';

  // 💡 ⑩ 수령 계좌 동적 매핑
  let displayBank = '';
  let displayAccountNum = '';
  let displayHolder = '';
  let displayIdNum = '';

  if (isCompanyClaim) {
    displayBank = company?.bank;
    displayAccountNum = company?.account_number;
    displayHolder = company?.name;
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

  // 💡 ⑧, ⑨ 금액 자동 계산 로직 (건강보험 대상자일 경우)
  let displaySelfBurden = product?.self_burden_price ? `${product.self_burden_price} 원` : '';
  let displayClaimAmount = product?.claim_price ? `${product.claim_price} 원` : '';

  if (customer?.qualification === '건강보험' || customer?.qualification === '경감(건강보험)') {
    const baseP = Number(product?.base_price?.toString().replace(/,/g, '')) || 0;
    const noticeP = Number(product?.notice_price?.toString().replace(/,/g, '')) || 0;
    const actualP = Number(product?.actual_price?.toString().replace(/,/g, '')) || 0;
    
    // 0보다 큰 금액들 중에서 최저가 산출
    const validPrices = [baseP, noticeP, actualP].filter(p => p > 0);
    if (validPrices.length > 0) {
      const lowestPrice = Math.min(...validPrices);
      const calcSelfBurden = Math.floor(lowestPrice * 0.1); // 10% 본인부담
      const calcClaim = lowestPrice - calcSelfBurden;       // 나머지 청구금액
      
      displaySelfBurden = `${calcSelfBurden.toLocaleString()} 원`;
      displayClaimAmount = `${calcClaim.toLocaleString()} 원`;
    }
  }

  // 날짜 파싱
  const dateParts = claim_date ? claim_date.split('-') : ['    ', '  ', '  '];

  const TableCell = ({ children, className = "", ...props }) => (
    <td className={`border border-slate-800 p-[3px] align-middle ${className}`} {...props}>
      {children}
    </td>
  );

  const CheckBox = ({ checked }) => (
    <span className="inline-block w-[12px] text-center font-black">
      {checked ? '√' : '\u00A0'}
    </span>
  );

  return (
    <div className="bg-white w-[210mm] h-[297mm] p-[15mm] text-slate-900 font-sans text-[11px] box-border relative flex flex-col justify-between overflow-hidden">
      
      <div className="shrink-0">
        <div className="text-[10px] text-left mb-0.5 text-slate-700">■ 국민건강보험법 시행규칙 [별지 제21호서식]</div>
        <div className="text-2xl font-black text-center tracking-[0.3em] py-1.5">보조기기 급여 지급청구서</div>
        <div className="flex justify-between text-[10px] text-slate-600 mb-1">
          <span>※ 색상이 어두운 난은 신청인이 적지 않으며, [  ]에는 해당되는 곳에 √ 표시를 합니다.</span>
          <span>(제1쪽)</span>
        </div>
      </div>

      {/* 접수 정보 */}
      <table className="w-full border-collapse border-[1px] border-slate-800 mb-1 text-center shrink-0">
        <tbody>
          <tr className="h-4 bg-slate-200">
            <TableCell className="w-[16%] font-bold text-left px-2 border-r-0">접수번호</TableCell>
            <TableCell className="border-l-0 w-auto"></TableCell>
            <TableCell className="font-bold text-left px-2 border-r-0 w-[60px]">접수일</TableCell>
            <TableCell className="border-l-0 w-auto"></TableCell>
            <TableCell className="font-bold text-left border-r-0 w-[60px]">처리기간</TableCell>
            {/* 💡 요청: 처리기간 7일 배경색 어둡게 */}
            <TableCell className="text-left border-l-0 w-[100px] bg-slate-200">7일</TableCell>
          </tr>
          <tr>
            <TableCell className="w-[16%] font-bold leading-tight py-1 bg-slate-200">본인부담액<br/>경감 대상자</TableCell>
            <TableCell colSpan="5" className="text-left px-4 leading-tight bg-slate-200 py-1">
              {/* 💡 요청: 경감대상자 우측 아무것도 선택하지 않음 */}
              [ <CheckBox checked={false} /> ] 「국민건강보험법 시행령」 별표 2 제3호라목1)에 해당하는 사람<br/>
              [ <CheckBox checked={false} /> ] 「국민건강보험법 시행령」 별표 2 제3호라목2)에 해당하는 사람
            </TableCell>
          </tr>
        </tbody>
      </table>

      {/* ① 급여를 받을 사람 */}
      <table className="w-full border-collapse border-[1px] border-slate-800 mb-1 text-center shrink-0">
        <tbody>
          <tr>
            <TableCell rowSpan="3" className="w-[16%] font-bold bg-slate-100 leading-snug">① 급여를<br/>받을 사람</TableCell>
            <TableCell className="bg-slate-100 font-bold w-[12%]">성명</TableCell>
            <TableCell className="w-[20%]">{customer?.name}</TableCell>
            <TableCell className="bg-slate-100 font-bold w-[20%]">주민(외국인)등록번호</TableCell>
            <TableCell className="w-[32%] text-left px-2">{customer?.resident_number}</TableCell>
          </tr>
          <tr>
            <TableCell className="bg-slate-100 font-bold">자택 전화번호</TableCell>
            <TableCell>{customer?.phone}</TableCell>
            <TableCell className="bg-slate-100 font-bold">휴대전화 번호</TableCell>
            <TableCell className="text-left px-2">{customer?.mobile}</TableCell>
          </tr>
          <tr>
            <TableCell className="bg-slate-100 font-bold">장애명</TableCell>
            <TableCell>{customer?.disability_type}</TableCell>
            <TableCell className="bg-slate-100 font-bold">장애 정도</TableCell>
            <TableCell className="text-left px-2 whitespace-nowrap">
              [ <CheckBox checked={customer?.disability_level === '심한장애' || customer?.disability_level === '심함'} /> ] 심한 장애 &nbsp;&nbsp;&nbsp; 
              [ <CheckBox checked={customer?.disability_level === '심하지않은장애' || customer?.disability_level === '심하지 않음'} /> ] 심하지 않은 장애
            </TableCell>
          </tr>
        </tbody>
      </table>

      {/* ② 보조기기 (제품정보) */}
      <table className="w-full border-collapse border-[1px] border-slate-800 mb-1 text-center table-fixed shrink-0">
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
      <table className="w-full border-collapse border-[1px] border-slate-800 mb-1 text-center table-fixed shrink-0">
        <tbody>
          <tr>
            <TableCell rowSpan="4" className="w-[16%] font-bold bg-slate-100 leading-snug">③ 급여를 받을<br/>사람 외 청구인</TableCell>
            <TableCell rowSpan="2" className="w-[6%] bg-slate-100 font-bold px-0">가족</TableCell>
            <TableCell className="bg-slate-100 font-bold w-[10%]">성명</TableCell>
            {/* 💡 요청: 개인(가족) 선택 시에만 입력 */}
            <TableCell className="w-[15%]">{isFamilyClaim ? claimant?.name : ''}</TableCell>
            <TableCell className="bg-slate-100 font-bold w-[12%]">주민등록번호</TableCell>
            <TableCell className="w-[15%]">{isFamilyClaim ? claimant?.resident_number : ''}</TableCell>
            <TableCell className="bg-slate-100 font-bold w-[15%] leading-tight">급여를 받을 사람<br/>과의 관계</TableCell>
            <TableCell className="w-[12%]">{isFamilyClaim ? claimant?.relation : ''}</TableCell>
          </tr>
          <tr>
            <TableCell className="bg-slate-100 font-bold">연락처</TableCell>
            <TableCell colSpan="2" className="text-left px-2 border-r-0">(자택) {isFamilyClaim ? claimant?.phone : ''}</TableCell>
            <TableCell colSpan="3" className="text-left px-2 border-l-0">(휴대전화) {isFamilyClaim ? claimant?.mobile : ''}</TableCell>
          </tr>
          <tr>
            <TableCell rowSpan="2" className="bg-slate-100 font-bold leading-tight px-0">판매<br/>업자</TableCell>
            <TableCell className="bg-slate-100 font-bold">상호</TableCell>
            {/* 💡 요청: 기업(업체) 선택 시에만 입력 */}
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
            <TableCell colSpan="2" className="text-left px-2 border-r-0">(업소) {isCompanyClaim ? company?.phone : ''}</TableCell>
            <TableCell colSpan="3" className="text-left px-2 border-l-0">(휴대전화) {isCompanyClaim ? company?.mobile : ''}</TableCell>
          </tr>
        </tbody>
      </table>
      <div className="text-[10px] text-slate-700 leading-tight mb-1 tracking-tight shrink-0">
        ※ 급여를 받을 사람 본인이 아닌 가족 또는 보조기기 판매업자가 청구하는 경우에 기재하며, 보조기기 급여를 청구할 수 있는 가족은 급여를<br/>
        &nbsp;&nbsp;&nbsp;&nbsp;받을 사람의 배우자 및 직계존비속, 급여를 받을 사람과 건강보험증을 같이 하거나 주민등록이 같이 되어 있는 형제자매 또는<br/>
        &nbsp;&nbsp;&nbsp;&nbsp;직계비속의 배우자입니다.
      </div>

      {/* ④ 구입처 */}
      <table className="w-full border-collapse border-[1px] border-slate-800 mb-1 text-center table-fixed shrink-0">
        <tbody>
          <tr>
            <TableCell rowSpan="3" className="w-[16%] font-bold bg-slate-100">④ 구입처</TableCell>
            <TableCell className="w-[14%] bg-slate-100 font-bold text-left px-2 border-r-0">상호</TableCell>
            <TableCell className="w-[15%] border-l-0 text-left px-2">{company?.name}</TableCell>
            <TableCell className="w-[15%] bg-slate-100 font-bold text-left px-2 border-r-0">대표자</TableCell>
            <TableCell className="w-[40%] border-l-0 text-left px-2">{company?.representative}</TableCell>
          </tr>
          <tr>
            <TableCell className="bg-slate-100 font-bold text-left px-2 border-r-0">사업자등록번호</TableCell>
            <TableCell className="border-l-0 text-left px-2">{company?.business_number}</TableCell>
            <TableCell className="bg-slate-100 font-bold text-left px-2 border-r-0">전화번호</TableCell>
            <TableCell className="border-l-0 text-left px-2">{company?.phone}</TableCell>
          </tr>
          <tr>
            <TableCell colSpan="2" className="bg-slate-100 font-bold text-left px-2 border-r-0 whitespace-nowrap">
              주소<span className="font-normal"> (미등록 업소만 기록합니다)</span>
            </TableCell>
            <TableCell colSpan="2" className="text-left px-2 border-l-0">{company?.address}</TableCell>
          </tr>
        </tbody>
      </table>

      {/* ⑤~⑨ 금액 정보 */}
      <table className="w-full border-collapse border-[1px] border-slate-800 mb-1 text-center shrink-0">
        <tbody>
          <tr className="bg-slate-100 font-bold">
            <TableCell className="w-[16%]">⑤ 기준액</TableCell>
            <TableCell className="w-[21%]">⑥ 고시금액</TableCell>
            <TableCell className="w-[21%]">⑦ 실구입(판매)금액(⑧+⑨)</TableCell>
            <TableCell className="w-[21%]">⑧ 본인부담액</TableCell>
            <TableCell className="w-[21%]">⑨ 청구금액</TableCell>
          </tr>
          <tr className="h-[18px]">
            <TableCell className="text-right px-2">{product?.base_price ? `${product.base_price} 원` : ''}</TableCell>
            <TableCell className="text-right px-2">{product?.notice_price ? `${product.notice_price} 원` : ''}</TableCell>
            <TableCell className="text-right px-2">{product?.actual_price ? `${product.actual_price} 원` : ''}</TableCell>
            {/* 💡 요청: 동적 계산된 값 반영 */}
            <TableCell className="text-right px-2">{displaySelfBurden}</TableCell>
            <TableCell className="text-right px-2">{displayClaimAmount}</TableCell>
          </tr>
          <tr className="h-[18px]"><TableCell className="text-right px-2"></TableCell><TableCell className="text-right px-2"></TableCell><TableCell className="text-right px-2"></TableCell><TableCell className="text-right px-2"></TableCell><TableCell className="text-right px-2"></TableCell></tr>
          <tr className="h-[18px]"><TableCell className="text-right px-2"></TableCell><TableCell className="text-right px-2"></TableCell><TableCell className="text-right px-2"></TableCell><TableCell className="text-right px-2"></TableCell><TableCell className="text-right px-2"></TableCell></tr>
        </tbody>
      </table>

      {/* ⑩ 수령 계좌 */}
      <table className="w-full border-collapse border-[1px] border-slate-800 mb-2 text-center shrink-0">
        <tbody>
          <tr>
            <TableCell rowSpan="3" className="w-[8%] font-bold bg-slate-100 leading-snug">⑩<br/>수령<br/>계좌</TableCell>
            <TableCell className="text-left px-2 w-[35%]">
              [ <CheckBox checked={isSelfClaim || isFamilyClaim} /> ] 가입자 또는 피부양자 계좌
            </TableCell>
            <TableCell rowSpan="2" className="bg-slate-100 font-bold w-[10%]">금융기관명</TableCell>
            <TableCell rowSpan="2" className="w-[15%]">{displayBank}</TableCell>
            <TableCell rowSpan="2" className="bg-slate-100 font-bold w-[19%]">계좌번호</TableCell>
            <TableCell rowSpan="2">{displayAccountNum}</TableCell>
          </tr>
          <tr>
            <TableCell className="text-left px-2">
              [ <CheckBox checked={isCompanyClaim} /> ] 보조기기 판매업자 계좌
            </TableCell>
          </tr>
          <tr>
            <TableCell className="text-left px-2 leading-tight">
              [ <CheckBox checked={false} /> ] 급여를 받을 사람 본인의 요양비등 수급계좌<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(압류방지 계좌)
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
              {isFamilyClaim ? claimant?.name : customer?.name}
            </span>
            <span className="relative flex items-center justify-center mr-8 font-medium">
              {signatures?.claimant_sign && (
                <img src={signatures.claimant_sign} alt="서명" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 mix-blend-multiply z-10 pointer-events-none" />
              )}
              <span>(서명 또는 인)</span>
            </span>
            <span className="font-bold mr-3">주민등록번호</span>
            <span className="font-medium">
              {isFamilyClaim ? claimant?.resident_number : customer?.resident_number}
            </span>
          </div>
          
          <div className="flex items-center justify-end whitespace-nowrap mt-1">
            <span className="font-bold mr-3">급여를 받을 사람과의 관계</span>
            <span className="mr-8 font-medium">{isFamilyClaim ? claimant?.relation : '본인'}</span>
            <span className="font-bold mr-3">(휴대)전화번호</span>
            <span className="font-medium">{isFamilyClaim ? claimant?.mobile : customer?.mobile}</span>
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
            <td className="font-bold text-right py-2 px-2 w-[70%] text-[11px]">
              급여를 받을 사람
            </td>
            <td className="text-center relative py-2 px-2 w-[30%] text-[11px]">
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

      <div className="text-[9px] text-right text-slate-500 tracking-wider shrink-0 mt-auto">
        210mm×297mm[백상지(80g/㎡) 또는 중질지(80g/㎡)]
      </div>
    </div>
  );
}