import React from 'react';

const Contracts = ({ data, company }) => {
  // 안전한 데이터 추출
  const customer = data?.customer || {};
  const product = data?.product || {};
  const claimant = data?.claimant || {};
  const signatures = data?.signatures || {};
  const dateParts = data?.issueDate ? data.issueDate.split('-') : ['', '', ''];

  // 금액 표시 함수 (값이 있을 경우에만 숫자 포맷 및 '원' 추가)
  const formatPriceWithUnit = (price) => {
    if (!price || isNaN(price)) return '';
    return `${Number(price).toLocaleString()} 원`;
  };

  // 좌/우측 보청기 분기 처리 (Claims.jsx에서 넘겨준 hearing_aid 객체 활용)
  const hearingAidData = product?.hearing_aid;
  
  // 신규 방식(좌/우 구조) 지원 및 구버전 하위 호환
  const isLeftEar = product?.direction === 'left' || product?.name?.includes('왼쪽');
  const rightEarProduct = hearingAidData ? (hearingAidData.right || {}) : (!isLeftEar ? product : {});
  const leftEarProduct = hearingAidData ? (hearingAidData.left || {}) : (isLeftEar ? product : {});

  return (
    <div id="contract-document" className="w-[210mm] min-h-[297mm] p-[15mm] flex flex-col text-[12px] text-black font-sans leading-snug box-border bg-white mx-auto relative shadow-sm">
      <div className="text-[10px] text-gray-600 mb-2">[별지 제1호서식]</div>
      <h1 className="text-2xl font-black text-center mb-6 tracking-widest">(보험급여용)보청기 구매 표준계약서</h1>
      <p className="text-[11.5px] mb-4 text-justify leading-relaxed">
        보청기에 대하여 보험급여를 신청하려는 가입자 또는 피부양자(이하 "갑"이라 함)와 국민건강보험공단(이하 "공단"이라 함)에 보청기판매업소로 등록한 자(이하 "을"이라 함)는 다음과 같이 보청기 구매 계약을 체결한다.
      </p>

      {/* 1. 제품 표 (병합 구조 및 '원' 표시 적용) */}
      <div className="font-bold text-[12px] mb-1.5 mt-2">제1조(구매 대상) 이 계약에 따라 갑이 을에게서 구입하는 보청기는 다음과 같다.</div>
      <table className="w-full border-collapse border border-black mb-5 text-center text-[11px]">
        <thead className="bg-gray-100">
          <tr>
            <th rowSpan="2" className="border border-black p-2 w-[12%]">구분</th>
            <th rowSpan="2" className="border border-black p-2 w-[28%]">모델명</th>
            <th colSpan="2" className="border border-black p-2 w-[25%]">구매금액</th>
            <th rowSpan="2" className="border border-black p-2 w-[20%]">제조사</th>
            <th rowSpan="2" className="border border-black p-2 w-[15%]">형태</th>
          </tr>
          <tr>
            <th className="border border-black p-1.5">단가</th>
            <th className="border border-black p-1.5">계</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-2 font-bold">오른쪽 귀</td>
            <td className="border border-black p-2">{rightEarProduct.name || ''}</td>
            <td className="border border-black p-2 text-right pr-2">{formatPriceWithUnit(rightEarProduct.price)}</td>
            <td className="border border-black p-2 text-right pr-2">{formatPriceWithUnit(rightEarProduct.price)}</td>
            <td className="border border-black p-2">{rightEarProduct.manufacturer || ''}</td>
            <td className="border border-black p-2"></td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold">왼쪽 귀</td>
            <td className="border border-black p-2">{leftEarProduct.name || ''}</td>
            <td className="border border-black p-2 text-right pr-2">{formatPriceWithUnit(leftEarProduct.price)}</td>
            <td className="border border-black p-2 text-right pr-2">{formatPriceWithUnit(leftEarProduct.price)}</td>
            <td className="border border-black p-2">{leftEarProduct.manufacturer || ''}</td>
            <td className="border border-black p-2"></td>
          </tr>
        </tbody>
      </table>

      {/* 2~8조 조항 세로 나열 */}
      <div className="flex flex-col gap-3 mb-6 text-[11px] leading-relaxed flex-1">
        <div>
          <div className="font-bold text-[12px] mb-1">제2조(적합관리 서비스)</div>
          <div>을은 보청기 성능의 유지·관리를 위하여 보청기를 구매한 날로부터 내구연한 기간 동안 갑에게 다음의 각 호의 서비스를 한다.</div>
          <div className="pl-3 mt-1 space-y-0.5">
            <div>1. 보청기 사용 및 관리에 관한 상담</div>
            <div>2. 청각평가</div>
            <div>3. 보청기 조절</div>
            <div>4. 보청기, 보조장치의 변형 및 정비</div>
            <div>5. 청능훈련</div>
            <div>6. 상호작용과 대화를 통한 서비스 제공</div>
            <div>7. 그 밖에 보청기 성능의 유지·관리를 위해 필요한 사항으로서 갑과 을이 따로 정하는 사항</div>
          </div>
        </div>

        <div>
          <div className="font-bold text-[12px] mb-1">제3조(갑의 의무)</div>
          <div>갑은 보청기 구입비용 및 제2조에 따른 적합관리 비용을 을이 공단에게서 지급받도록 하는 경우에는 그 지급이 원활하게 이루어질 수 있도록 적극 협조해야 한다.</div>
        </div>

        <div>
          <div className="font-bold text-[12px] mb-1">제4조(을의 의무)</div>
          <div className="space-y-0.5">
            <div>① 을은 공단에 등록된 보청기 판매업소로서 관련 규정을 준수해야 한다.</div>
            <div>② 을은 보청기와 보청기를 관리하는 시설·장비에 대하여 적절한 위생관리를 실시해야 한다.</div>
            <div>③ 을은 다음 각 호의 어느 하나의 사유가 발생하여 제2조에 따른 서비스 및 이 조에 따른 의무를 이행할 수 없는 경우에는 갑에게 그 사실을 알려 갑이 적합관리를 받는데 불편함이 없도록 하여야 한다.</div>
            <div className="pl-3 space-y-0.5">
              <div>1. 휴업 또는 폐업</div>
              <div>2. 사업장의 이전</div>
              <div>3. 운영인력, 장비 등의 결여</div>
              <div>4. 그 밖에 해당 서비스 및 의무를 이행할 수 없는 부득이한 사유</div>
            </div>
          </div>
        </div>

        <div>
          <div className="font-bold text-[12px] mb-1">제5조(계약의 해제)</div>
          <div className="space-y-0.5">
            <div>① 갑은 다음 각 호의 어느 하나에 해당하는 경우 제1조에 따른 보청기 구매 계약을 해제할 수 있다.</div>
            <div className="pl-3 space-y-0.5">
              <div>1. 을이 허위·거짓정보를 갑에게 제공하여 보청기 구매계약을 체결한 경우</div>
              <div>2. 보청기 착용 후 청력개선 효과가 없어 갑이 검수확인을 받지 못한 경우</div>
            </div>
            <div>② 제1항에 따라 계약이 해제된 경우 갑은 즉시 보청기를 반환하고 을은 총 구매금액을 반환해야 한다. 다만, 을이 대금 중 일부를 공단에게서 지급받은 경우에는 갑이 지불한 금액은 갑에게, 공단이 지급한 금액은 공단에 각각 반환해야 하며, 을은 반환 후 그 사실을 갑에게 통지해야 한다.</div>
          </div>
        </div>

        <div>
          <div className="font-bold text-[12px] mb-1">제6조(계약의 해지)</div>
          <div className="space-y-0.5">
            <div>① 갑은 다음 각 호에 어느 하나의 사유가 있는 경우에는 제2조에 따른 적합관리 서비스 계약을 해지할 수 있다.</div>
            <div className="pl-3 space-y-0.5">
              <div>1. 을이 보청기 적합관리 급여청구를 위한 구비서류 등을 발급해 주지 않는 경우</div>
              <div>2. 을이 「개인정보 보호법」을 위반하여 갑의 개인정보를 처리한 경우</div>
              <div>3. 갑의 이사 등 부득이한 사유로 적합관리를 받을 수 없게 된 경우</div>
            </div>
            <div>② 갑은 제1항에 따라 계약을 해지하려면 을에게 그 의사를 통지해야 한다.</div>
            <div>③ 갑은 을의 고의 또는 중대한 과실로 손해를 입은 경우에는 제2항에도 불구하고 사전 통지 없이 일방적인 의사표시로 계약을 해지할 수 있다.</div>
          </div>
        </div>

        <div>
          <div className="font-bold text-[12px] mb-1">제7조(개인정보 보호)</div>
          <div className="space-y-0.5">
            <div>① 을은 적합관리 과정에서 수집하는 개인정보는 필요 시 최소한으로 수집하여야 한다.</div>
            <div>② 제1항에 따라 수집된 정보는 개인정보의 분실 및 유출 방지 등을 위하여 관련 법률에 따라 관리되어야 한다.</div>
          </div>
        </div>

        <div>
          <div className="font-bold text-[12px] mb-1">제8조(보칙)</div>
          <div className="space-y-0.5">
            <div>① 이 계약서에서 정하지 않은 사항에 대해서는 「국민건강보험법」, 「소비자기본법」,「약관의 규제에 관한 법률」,「할부거래에 관한 법률」, 「방문판매 등에 관한 법률」,「전자상거래 등에서의 소비자보호에 관한 법률」, 「민법」 등 관계 법령에 따르며, “갑”과 “을”이 개별적으로 약정한 사항이 있는 경우에는 해당 관계 법령 내 강행규정에 반하지 않는 한 그 약정한 바에 따른다.</div>
            <div>② 위 계약 체결을 증명하고 제반 의무를 성실히 수행하기 위하여 본 계약서를 2부 작성하여 서명 날인 후 갑과 을이 각각 1부씩 보관한다.</div>
          </div>
        </div>
      </div>

      {/* 계약 일자 */}
      <div className="text-center font-bold text-[15px] mt-4 mb-6 tracking-widest">
        {dateParts[0] || '202 '}년 &nbsp;&nbsp; {dateParts[1] || '  '}월 &nbsp;&nbsp; {dateParts[2] || '  '}일
      </div>

      {/* 9. 계약당사자 표 */}
      <table className="w-full border-collapse border border-black text-[11px] text-center mt-auto">
        <tbody>
          <tr>
            <th colSpan="5" className="border border-black p-2 font-black bg-gray-200 text-[13px] tracking-[0.5em]">계 약 당 사 자</th>
          </tr>
          
          {/* 갑 (수급자) */}
          <tr>
            <td rowSpan="3" className="border border-black p-2 font-bold bg-gray-100 w-[12%]">갑<br/>(수급자)</td>
            <td className="border border-black p-2 font-bold bg-gray-50 w-[15%]">성명</td>
            
            {/* 3열: 이름 좌측 정렬, 서명 우측 정렬 (내부 테두리 제거) */}
            <td className="border-y border-l border-black border-r-0 p-2 w-[35%]">
              <div className="flex justify-between items-center w-full relative">
                <span className="text-left font-bold">{customer.name || ''}</span>
                <span className="text-[10px] text-gray-700 relative whitespace-nowrap">
                  (서명 또는 인)
                  {signatures.customer_sign && <img src={signatures.customer_sign} alt="서명" className="absolute right-[-2px] top-1/2 -translate-y-1/2 h-[14mm] mix-blend-multiply"/>}
                </span>
              </div>
            </td>
            {/* 4, 5열: 공란 */}
            <td className="border-y border-black border-x-0 p-2 w-[15%]"></td>
            <td className="border-y border-r border-black border-l-0 p-2 w-[23%]"></td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold bg-gray-50">생년월일</td>
            <td className="border border-black p-2 text-left pl-2">{customer.birth_date || ''}</td>
            <td className="border border-black p-2 font-bold bg-gray-50">연락처</td>
            <td className="border border-black p-2 text-left pl-2">{customer.phone || ''}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold bg-gray-50">주소</td>
            <td colSpan="3" className="border border-black p-2 text-left pl-2 text-[10px] leading-tight">{customer.address || ''} {customer.detail_address || ''}</td>
          </tr>

          {/* 을 (판매자) */}
          <tr>
            <td rowSpan="3" className="border border-black p-2 font-bold bg-gray-100">을<br/>(판매자)</td>
            <td className="border border-black p-2 font-bold bg-gray-50">등록업소명</td>
            <td className="border border-black p-2 text-left pl-2 font-bold">{company?.company_name || ''}</td>
            <td className="border border-black p-2 font-bold bg-gray-50">사업자등록번호</td>
            <td className="border border-black p-2 text-left pl-2">{company?.business_registration_number || ''}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold bg-gray-50">사업주 성명</td>
            <td className="border border-black p-2 text-left pl-2 font-bold relative">
              {company?.representative_name || ''}
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-normal">(서명 또는 인)</span>
              {signatures.company_seal && <img src={signatures.company_seal} alt="직인" className="absolute right-14 top-1/2 -translate-y-1/2 h-[14mm] mix-blend-multiply"/>}
            </td>
            <td className="border border-black p-2 font-bold bg-gray-50">연락처</td>
            <td className="border border-black p-2 text-left pl-2">{company?.contact_number || ''}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold bg-gray-50">사업장주소</td>
            <td colSpan="3" className="border border-black p-2 text-left pl-2 text-[10px] leading-tight">{company?.address || ''} {company?.detail_address || ''}</td>
          </tr>

          {/* 병 (대리인) */}
          <tr>
            <td rowSpan="3" className="border border-black p-2 font-bold bg-gray-100">병<br/>(수급자의<br/>대리인)</td>
            <td className="border border-black p-2 font-bold bg-gray-50">성명</td>
            <td className="border border-black p-2 text-left pl-2 font-bold relative">
              {claimant.name || ''}
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-normal">(서명 또는 인)</span>
              {signatures.claimant_sign && <img src={signatures.claimant_sign} alt="서명" className="absolute right-14 top-1/2 -translate-y-1/2 h-[14mm] mix-blend-multiply"/>}
            </td>
            <td className="border border-black p-2 font-bold bg-gray-50">관계</td>
            <td className="border border-black p-2 text-left pl-2">{claimant.relation ? `갑의 ( ${claimant.relation} )` : ''}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold bg-gray-50">생년월일</td>
            <td className="border border-black p-2 text-left pl-2">{(claimant.resident_number || '').substring(0, 6)}</td>
            <td className="border border-black p-2 font-bold bg-gray-50">연락처</td>
            <td className="border border-black p-2 text-left pl-2">{claimant.phone || ''}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold bg-gray-50">주소</td>
            <td colSpan="3" className="border border-black p-2 text-left pl-2 text-[10px] leading-tight"></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default Contracts;