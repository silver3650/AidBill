import React from 'react';

export default function ReceiptDoc({ data }) {
  // 안전하게 데이터 추출
  const customer = data?.customers || {};
  const product = data?.products || {};

  // 날짜 포맷팅 (YYYY-MM-DD -> YYYY년 MM월 DD일)
  const dateStr = data?.claim_date || '';
  let formattedDate = '      년     월     일';
  if (dateStr) {
    const [year, month, day] = dateStr.split('-');
    formattedDate = `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
  }

  return (
    <div className="bg-white w-[210mm] min-h-[297mm] p-20 font-sans border border-gray-200 shadow-sm mx-auto text-black relative">
      <h1 className="text-4xl text-center font-black tracking-[1em] mb-20 mt-10">물품인수증</h1>
      
      <div className="space-y-6 text-xl mb-16">
        <div className="flex items-center">
          <span className="w-24 tracking-[1em] font-bold">성명</span> : 
          <span className="ml-4 font-black text-2xl">{customer.name}</span>
        </div>
        <div className="flex items-start">
          <span className="w-24 tracking-[1em] font-bold">주소</span> : 
          <span className="ml-4 flex-1">
            {customer.address}{customer.detail_address ? `, ${customer.detail_address}` : ''}
          </span>
        </div>
        <div className="flex items-center">
          <span className="w-24 tracking-[0.5em] font-bold">연락처</span> : 
          <span className="ml-4">{customer.phone || customer.contact_number}</span>
        </div>
      </div>

      <p className="text-2xl font-black mb-12 tracking-tight">
        상기 본인은 아래 물품을 설치 및 인수했음을 확인합니다.
      </p>
      
      <div className="text-xl font-bold mb-6">- 아    래 -</div>
      
      <div className="flex text-xl mb-32 min-h-[120px] items-start">
        <span className="w-24 tracking-[1em] font-bold">품목</span> : 
        <span className="ml-4 flex-1 whitespace-pre-wrap leading-relaxed font-black text-2xl">
          {product.name}
        </span>
      </div>

      <div className="text-center text-2xl font-black mb-20 tracking-widest">
        {formattedDate}
      </div>

      <div className="flex justify-end flex-col items-end gap-10 text-xl font-bold mr-10">
        <div className="flex items-center gap-4 justify-end">
          <span className="text-2xl font-black">{customer.name}</span>
          <div className="relative inline-flex items-center justify-center">
            <span className="text-2xl font-black">(인)</span>
            
            {/* 서명 이미지: 큼직하게 겹쳐 나오도록 설정 */}
            {customer.signature && (
              <img 
                src={customer.signature} 
                alt="서명" 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] h-32 w-auto max-w-[400px] object-contain mix-blend-multiply pointer-events-none z-10" 
              />
            )}
          </div>
        </div>
        
        <div className="flex items-end gap-2">
          <span className="font-bold">보호자 : </span>
          <span className="w-48 border-b-2 border-black inline-block mb-1"></span>
          <span className="font-bold">(인)</span>
        </div>
      </div>
    </div>
  );
}