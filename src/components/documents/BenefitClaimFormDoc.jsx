import React from 'react';

export default function BenefitClaimFormDoc({ data }) {
  // 데이터 안전성 확보
  const customer = data?.customer || {};
  const product = data?.product || {};
  const account = data?.account || {};
  const claimant = data?.claimant || {};
  
  // 날짜 데이터 파싱 (YYYY-MM-DD -> 년, 월, 일 분리)
  const dateParts = data?.claim_date ? data.claim_date.split('-') : ['', '', ''];

  // 주소 합치기
  const fullAddress = `${customer?.address || ''} ${customer?.detail_address || ''}`.trim();

  return (
    // A4 규격(210x297) 여백 및 폰트 설정 (기존 양식과 동일)
    <div className="bg-white w-[210mm] h-[297mm] p-[15mm] flex flex-col text-slate-900 box-border overflow-hidden relative font-sans">
        
      {/* 상단 서식 번호 */}
      <div className="text-[11px] text-left mb-1 text-slate-500 font-medium shrink-0">
        ■ 국민건강보험법 시행규칙 [별지 제21호서식]
      </div>

      {/* 1. 서류 타이틀 */}
      <table className="w-full mb-3 border-none border-collapse table-fixed shrink-0">
        <tbody>
          <tr className="border-none">
            <td className="border-none text-2xl font-black tracking-[0.2em] text-center align-middle py-3">
              보조기기 급여 지급청구서
            </td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-between items-end mb-1 text-[11px] font-medium text-slate-500 shrink-0">
        <p>※ 색상이 어두운 난은 청구인이 작성하지 않으며, [ ]에는 해당되는 곳에 √표를 합니다.</p>
        <p>(앞쪽)</p>
      </div>

      {/* 2. 수급자 정보 */}
      <table className="w-full border-collapse border-[1.5px] border-slate-800 text-[12px] mb-2.5 table-fixed shrink-0">
        <tbody>
          <tr>
            <td rowSpan="3" className="border border-slate-800 py-1 px-1 w-[80px] text-center font-bold bg-slate-50 leading-tight">수급자</td>
            <td className="border border-slate-800 py-1 px-3 w-[25%] text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">성명</td>
            <td colSpan="2" className="border border-slate-800 py-1 px-3 w-[45%] text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">주민등록번호</td>
          </tr>
          <tr>
            <td className="border border-slate-800 py-1.5 px-3 text-center font-black text-[14px] border-t-0">{customer?.name}</td>
            <td colSpan="2" className="border border-slate-800 py-1.5 px-3 text-center font-bold text-[13px] border-t-0">{customer?.resident_number}</td>
          </tr>
          <tr>
            <td className="border border-slate-800 py-1 px-3 text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">전화번호</td>
            <td colSpan="2" className="border border-slate-800 py-1 px-3 text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">휴대전화</td>
          </tr>
          <tr>
            <td className="border border-slate-800 py-1.5 px-1 text-center font-bold bg-slate-50 leading-tight border-t-0"></td>
            <td className="border border-slate-800 py-1.5 px-3 text-center font-bold text-[13px] border-t-0">{customer?.phone}</td>
            <td colSpan="2" className="border border-slate-800 py-1.5 px-3 text-center font-bold text-[13px] border-t-0">{customer?.mobile}</td>
          </tr>
          <tr>
            <td colSpan="4" className="border border-slate-800 py-1 px-3 text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">자택 주소</td>
          </tr>
          <tr>
            <td colSpan="4" className="border border-slate-800 py-1.5 px-3 text-left font-bold text-[13px] border-t-0">{fullAddress}</td>
          </tr>
        </tbody>
      </table>

      {/* 3. 급여 청구 내역 */}
      <table className="w-full border-collapse border-[1.5px] border-slate-800 text-[12px] mb-2.5 table-fixed shrink-0 text-center">
        <tbody>
          <tr>
            <td rowSpan="3" className="border border-slate-800 py-1 px-1 w-[80px] font-bold bg-slate-50 leading-tight">청구내역<br/>(보조기기)</td>
            <td className="border border-slate-800 py-1 px-2 font-bold bg-slate-50 text-slate-600 text-[11px]">품목명</td>
            <td className="border border-slate-800 py-1 px-2 font-bold bg-slate-50 text-slate-600 text-[11px]">모델명</td>
            <td colSpan="2" className="border border-slate-800 py-1 px-2 font-bold bg-slate-50 text-slate-600 text-[11px]">바코드(제조번호)</td>
          </tr>
          <tr>
            <td className="border border-slate-800 py-2 px-2 font-bold text-[13px]">{product?.name}</td>
            <td className="border border-slate-800 py-2 px-2 font-bold text-[13px]">{product?.model}</td>
            <td colSpan="2" className="border border-slate-800 py-2 px-2 font-bold text-[13px]">{product?.barcode}</td>
          </tr>
          <tr>
            <td colSpan="2" className="border border-slate-800 py-1 px-2 font-bold bg-slate-50 text-slate-600 text-[11px]">구입일자</td>
            <td colSpan="2" className="border border-slate-800 py-1 px-2 font-bold bg-slate-50 text-slate-600 text-[11px]">구입금액 (원)</td>
          </tr>
          <tr>
            <td className="border border-slate-800 py-1.5 px-1 font-bold bg-slate-50 border-t-0"></td>
            <td colSpan="2" className="border border-slate-800 py-2 px-2 font-bold text-[13px]">{product?.purchase_date}</td>
            <td colSpan="2" className="border border-slate-800 py-2 px-3 text-right font-black text-[15px] bg-slate-50/30 text-indigo-900">
              {product?.price ? product.price.toLocaleString() : '0'} <span className="text-[11px] font-bold text-slate-500">원</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 4. 지급계좌 정보 */}
      <table className="w-full border-collapse border-[1.5px] border-slate-800 text-[12px] mb-2.5 table-fixed shrink-0">
        <tbody>
          <tr>
            <td rowSpan="2" className="border border-slate-800 py-1 px-1 w-[80px] text-center font-bold bg-slate-50 leading-tight">지급계좌</td>
            <td className="border border-slate-800 py-1 px-3 w-[25%] text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">예금주</td>
            <td className="border border-slate-800 py-1 px-3 w-[25%] text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">금융기관명</td>
            <td className="border border-slate-800 py-1 px-3 w-[50%] text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">계좌번호</td>
          </tr>
          <tr>
            <td className="border border-slate-800 py-1.5 px-3 text-left font-bold text-[13px] border-t-0">{account?.holder}</td>
            <td className="border border-slate-800 py-1.5 px-3 text-left font-bold text-[13px] border-t-0">{account?.bank}</td>
            <td className="border border-slate-800 py-1.5 px-3 text-left font-bold text-[13px] border-t-0">{account?.account_number}</td>
          </tr>
        </tbody>
      </table>

      {/* 5. 청구인 정보 (대리 청구 시) */}
      <table className="w-full border-collapse border-[1.5px] border-slate-800 text-[12px] mb-3 table-fixed shrink-0">
        <tbody>
          <tr>
            <td rowSpan="2" className="border border-slate-800 py-1 px-1 w-[80px] text-center font-bold bg-slate-50 leading-tight">청구인</td>
            <td className="border border-slate-800 py-1 px-3 w-[33%] text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">성명</td>
            <td className="border border-slate-800 py-1 px-3 w-[33%] text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">수급자와의 관계</td>
            <td className="border border-slate-800 py-1 px-3 w-[34%] text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">전화번호</td>
          </tr>
          <tr>
            <td className="border border-slate-800 py-1.5 px-3 text-left font-bold text-[13px] border-t-0">{claimant?.name || customer?.name}</td>
            <td className="border border-slate-800 py-1.5 px-3 text-left font-bold text-[13px] border-t-0">{claimant?.relation || '본인'}</td>
            <td className="border border-slate-800 py-1.5 px-3 text-left font-bold text-[13px] border-t-0">{claimant?.phone || customer?.mobile}</td>
          </tr>
        </tbody>
      </table>

      {/* 6. 제출문 및 서명 */}
      <div className="mb-auto space-y-3 flex-1 flex flex-col justify-center">
        <p className="text-[13px] leading-snug text-justify px-4 font-medium text-slate-700">
          「국민건강보험법」 제51조, 같은 법 시행규칙 제26조 및 「보조기기 보험급여 기준 등에 관한 규칙」에 따라 위와 같이 보조기기 급여비용의 지급을 청구합니다.
        </p>
        
        <div className="text-right pr-12 font-bold text-[14px] tracking-widest pt-4">
            {dateParts[0]} 년 &nbsp;&nbsp; {dateParts[1]} 월 &nbsp;&nbsp; {dateParts[2]} 일
        </div>

        <div className="flex justify-end items-center pr-10 text-[15px] pt-2">
          <span className="mr-6 font-bold text-slate-600">청구인</span>
          <div className="relative flex items-center border-b-[1.5px] border-slate-800 min-w-[280px] justify-between pb-1">
            <span className="pl-2 font-black text-[15px] text-slate-900">{claimant?.name || customer?.name}</span>
            <span className="text-[12px] whitespace-nowrap font-bold ml-6 text-slate-400">(서명 또는 인)</span>
          </div>
        </div>
        <h3 className="text-[19px] font-black text-left pl-4 mt-6 tracking-tighter">국민건강보험공단 이사장 <span className="text-[15px] font-normal text-slate-500">귀하</span></h3>
      </div>

      {/* 7. 하단 처리절차 안내 */}
      <div className="space-y-2 shrink-0 border-[1.5px] border-slate-800 p-2 text-[11px] mt-4">
        <div className="text-center font-black bg-slate-800 text-white py-1 mb-2.5 border border-slate-800 w-28 mx-auto rounded-sm text-[10px] uppercase tracking-widest">처 리 절 차</div>
        <div className="flex justify-between items-center text-center px-8">
          {[
            { label: '청구서 작성\n(청구인)' },
            { label: '접 수\n(국민건강보험공단)' },
            { label: '지급 여부 확인\n및 결정' },
            { label: '지 급\n(청구인)' }
          ].map((step, idx) => (
            <React.Fragment key={idx}>
              <div className="flex flex-col items-center">
                <div className="border border-slate-800 px-1 py-0.5 w-[100px] h-10 flex items-center justify-center bg-white whitespace-pre-line leading-tight text-center font-bold text-[10px] shadow-sm">
                  {step.label}
                </div>
              </div>
              {idx < 3 && <div className="text-lg font-black text-slate-300">➔</div>}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* 하단 용지 규격 */}
      <div className="text-[10px] text-right mt-1.5 text-slate-400 font-medium shrink-0">
        210mm×297mm [백상지(80g/㎡) 또는 중질지(80g/㎡)]
      </div>
    </div>
  );
}