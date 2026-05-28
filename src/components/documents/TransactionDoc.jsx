import React from 'react';

export default function TransactionDoc({ data, company }) {
  if (!data) return null;

  const { customer, items, claim_date, total_amount } = data;
  const comp = company || {};

  // 표의 빈 칸을 채워 깔끔한 명세서 형태를 유지하기 위해 기본 10줄을 생성합니다.
  const MAX_ROWS = 10;
  const safeItems = items || [];
  const displayItems = [...safeItems];
  while (displayItems.length < MAX_ROWS) {
    displayItems.push({ name: '', model: '', quantity: '', price: '', total: '' });
  }

  // 월/일 포맷팅
  const formatDate = (dateStr) => {
    if (!dateStr) return { month: '', day: '' };
    const d = new Date(dateStr);
    return {
      month: String(d.getMonth() + 1).padStart(2, '0'),
      day: String(d.getDate()).padStart(2, '0')
    };
  };

  const { month, day } = formatDate(claim_date);

  return (
    <div className="w-[210mm] h-[297mm] bg-white p-[15mm] text-slate-900 font-sans text-sm box-border flex flex-col relative overflow-hidden">
      
      {/* 타이틀 영역 */}
      <div className="text-center mb-8 relative">
        <h1 className="text-3xl font-black tracking-[1em] border-b-2 border-black pb-2 inline-block px-10">거래명세서</h1>
      </div>

      {/* 상단 공급받는자 & 공급자 정보 */}
      <div className="flex justify-between items-end mb-4 min-h-[40mm]">
        {/* 공급받는자 (고객 또는 지자체) */}
        <div className="w-[40%] flex flex-col justify-end pb-2">
          <div className="flex items-end mb-2">
            <span className="text-xl font-black border-b border-black pb-1 flex-1 text-center truncate">
              {customer?.name}
            </span>
            <span className="text-base font-bold ml-2 pb-1">귀하</span>
          </div>
          <div className="text-xs text-gray-600 font-bold">
            작성일자 : {claim_date || '년 월 일'}
          </div>
        </div>

        {/* 공급자 정보 */}
        <div className="w-[55%] flex">
          {/* 공급자 텍스트 세로 정렬 */}
          <div className="w-8 flex flex-col items-center justify-center border-y-2 border-l-2 border-black bg-gray-100 font-bold text-center text-[13px] shrink-0 gap-3">
            <span>공</span>
            <span>급</span>
            <span>자</span>
          </div>
          {/* 💡 colgroup을 사용하여 열 너비를 완벽하게 고정합니다. */}
          <table className="flex-1 border-collapse border-2 border-black text-[11px] table-fixed w-full">
            <colgroup>
              <col style={{ width: '13%' }} /> {/* 타이틀(상호, 등록번호) */}
              <col style={{ width: '47%' }} /> {/* 텍스트(상호명) - 넓게 할당 */}
              <col style={{ width: '10%' }} /> {/* 타이틀(대표) - 좁게 할당 */}
              <col style={{ width: '30%' }} /> {/* 텍스트(대표명+직인) */}
            </colgroup>
            <tbody>
              <tr className="h-[7.5mm]">
                <td className="border border-black bg-gray-100 text-center font-bold">등록번호</td>
                <td colSpan="3" className="border border-black px-2 font-black tracking-widest text-[14px] text-left">
                  {comp.business_number || ''}
                </td>
              </tr>
              <tr className="h-[7.5mm]">
                <td className="border border-black bg-gray-100 text-center font-bold">상호</td>
                <td className="border border-black px-2 font-bold text-left whitespace-nowrap overflow-hidden text-ellipsis">
                  {comp.company_name || ''}
                </td>
                <td className="border border-black bg-gray-100 text-center font-bold">대표</td>
                <td className="border border-black text-center font-bold px-1 relative">
                  <div className="flex justify-center items-center w-full h-full relative z-10">
                    <span className="mr-1">{comp.representative_name || ''}</span>
                    {comp.representative_name && (
                      <span className="relative inline-block whitespace-nowrap">
                        (인)
                        {/* 💡 직인이 (인) 글자의 정중앙에 위치하도록 설정 */}
                        {comp.seal_image && (
                          <img 
                            src={comp.seal_image} 
                            alt="도장" 
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 max-w-none object-contain mix-blend-multiply opacity-90 pointer-events-none" 
                            style={{ zIndex: -1 }}
                          />
                        )}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
              <tr className="h-[7.5mm]">
                <td className="border border-black bg-gray-100 text-center font-bold">주소</td>
                <td colSpan="3" className="border border-black px-2 text-left truncate">
                  {`${comp.address || ''} ${comp.detail_address || ''}`.trim()}
                </td>
              </tr>
              {/* 업태 / 종목 */}
              <tr className="h-[7.5mm]">
                <td className="border border-black bg-gray-100 text-center font-bold">업태</td>
                <td className="border border-black px-2 font-bold text-left whitespace-nowrap">
                  {comp.business_type || '도소매'}
                </td>
                <td className="border border-black bg-gray-100 text-center font-bold">종목</td>
                <td className="border border-black px-2 font-bold text-left whitespace-nowrap">
                  {comp.business_item || '의료기기'}
                </td>
              </tr>
              <tr className="h-[7.5mm]">
                <td className="border border-black bg-gray-100 text-center font-bold">전화번호</td>
                <td colSpan="3" className="border border-black px-2 font-bold text-left">
                  {comp.contact_number || ''}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 합계 금액 행 */}
      <div className="flex border-y-2 border-black py-2 mb-2 items-center bg-gray-50 px-4">
        <span className="font-black text-sm tracking-widest mr-4">합계금액 :</span>
        <span className="font-black text-lg tracking-wider">₩ {Number(total_amount || 0).toLocaleString()}</span>
        <span className="text-xs text-gray-500 font-bold ml-2">(영수 / 청구)</span>
      </div>

      {/* 품목 리스트 테이블 */}
      <table className="w-full border-collapse border-2 border-black text-[12px] flex-1 table-fixed">
        <thead className="bg-gray-100 border-b-2 border-black">
          <tr>
            <th className="border border-black py-2 w-[8%]">월/일</th>
            <th className="border border-black py-2 w-[35%]">품목명</th>
            <th className="border border-black py-2 w-[22%]">규격 (모델명)</th>
            <th className="border border-black py-2 w-[8%]">수량</th>
            <th className="border border-black py-2 w-[13%]">단가</th>
            <th className="border border-black py-2 w-[14%]">공급가액</th>
          </tr>
        </thead>
        <tbody>
          {displayItems.map((item, idx) => (
            <tr key={idx} className="h-[9.5mm]">
              <td className="border border-black text-center text-gray-600 font-bold">
                {item.name ? `${month}/${day}` : ''}
              </td>
              <td className="border border-black px-2 font-bold break-words whitespace-pre-wrap leading-tight py-1 text-left">
                {item.name || ''}
              </td>
              <td className="border border-black px-2 truncate text-center text-gray-700">{item.model || ''}</td>
              <td className="border border-black text-center font-bold">{item.quantity || ''}</td>
              <td className="border border-black text-right px-2">
                {item.price ? Number(item.price).toLocaleString() : ''}
              </td>
              <td className="border border-black text-right px-2 font-black">
                {item.total ? Number(item.total).toLocaleString() : ''}
              </td>
            </tr>
          ))}
          {/* 총 합계 행 */}
          <tr className="h-[10mm] bg-gray-50 border-t-2 border-black">
            <td colSpan="5" className="border border-black text-center font-black tracking-widest text-sm">총 합 계</td>
            <td className="border border-black text-right px-2 font-black text-sm text-indigo-700">
              {Number(total_amount || 0).toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 하단 비고 및 입금 계좌 */}
      <div className="mt-4 border-2 border-black p-3 text-xs flex justify-between h-[25mm] items-center shrink-0">
        <div className="w-[60%] border-r border-gray-300 pr-4 h-full flex flex-col justify-center">
          <span className="font-black block mb-1">비고:</span>
          <p className="text-gray-600 font-bold break-keep leading-tight">
            본 거래명세서는 보조기기 구매 증빙 및 대금 청구 목적으로 발행되었습니다.
          </p>
        </div>
        <div className="w-[40%] pl-4 flex flex-col justify-center">
          <span className="font-bold block mb-1 text-gray-800">입금 계좌 안내:</span>
          <div className="font-black text-[13px] tracking-tight text-indigo-900">
            {comp.bank_name || comp.bank || ''} {comp.account_number || ''}
          </div>
          <div className="font-bold text-gray-600 mt-0.5">
            예금주: {comp.account_holder || comp.company_name || ''}
          </div>
        </div>
      </div>
      
    </div>
  );
}