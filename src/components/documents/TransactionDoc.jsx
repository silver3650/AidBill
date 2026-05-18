import React from 'react';

export default function TransactionDoc({ data, company }) {
  const customer = data?.customers || {};
  const product = data?.products || {};
  const govName = customer.local_governments?.name || '지자체명 미지정';
  const dateStr = data?.claim_date?.replace(/-/g, '. ') || '2026. 00. 00';

  const getFontSize = (name) => {
    if (name.length > 15) return '1.1rem';
    if (name.length > 10) return '1.25rem';
    return '1.5rem';
  };

  return (
    <div className="bg-white w-[210mm] min-h-[297mm] p-12 font-sans border border-gray-200 shadow-sm mx-auto text-black">
      <h1 className="text-4xl text-center font-black mb-10 tracking-widest">거 래 명 세 서</h1>
      
      <div className="flex justify-between items-end mb-4">
        <div className="text-lg font-bold">일자: {dateStr}</div>
        <div className="text-sm font-bold text-gray-500">(공급받는자 보관용)</div>
      </div>

      <div className="flex border-t-2 border-b-2 border-black bg-white">
        {/* 공급받는 자 (지자체) */}
        <div className="w-1/2 border-r border-black p-6 flex flex-col justify-center">
          <div className="flex items-baseline gap-2 w-full">
            <span className="font-black truncate underline underline-offset-8" style={{ fontSize: getFontSize(govName) }}>
              {govName}
            </span>
            <span className="text-xl font-bold flex-shrink-0">귀하</span>
          </div>
        </div>

        {/* 🚨 공급자 정보 (견적서와 완벽히 통일된 레이아웃) */}
        <div className="w-1/2 p-0">
          <table className="w-full text-[10px] border-collapse h-full">
            <tbody>
              <tr>
                <td rowSpan="5" className="bg-gray-50 border-r border-black w-8 text-center font-bold py-1 leading-tight">
                  공<br/>급<br/>자
                </td>
                <td className="border-b border-r border-black px-1.5 py-2 bg-gray-50 font-bold w-16">등록번호</td>
                <td colSpan="3" className="border-b border-black px-2 py-2 text-center font-black text-sm tracking-tighter">
                  {company?.business_number || '등록번호 확인 필요'}
                </td>
              </tr>
              <tr>
                <td className="border-b border-r border-black px-1.5 py-1.5 bg-gray-50 font-bold">상호</td>
                <td className="border-b border-r border-black px-2 py-1.5 font-bold truncate max-w-[90px]">
                  {company?.company_name}
                </td>
                <td className="border-b border-r border-black px-1.5 py-1.5 bg-gray-50 font-bold w-10 text-center">성명</td>
                <td className="border-b border-black px-2 py-1.5 relative min-w-[60px]">
                  <span className="relative z-10 font-bold">{company?.representative_name}</span>
                  {company?.seal_image && (
                    <img 
                      src={company.seal_image} 
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 object-contain mix-blend-multiply max-w-none" 
                    />
                  )}
                </td>
              </tr>
              <tr>
                <td className="border-b border-r border-black px-1.5 py-1.5 bg-gray-50 font-bold">주소</td>
                <td colSpan="3" className="border-b border-black px-2 py-1.5 text-[10px] leading-tight">
                  {company?.address}{company?.detail_address ? `, ${company.detail_address}` : ''}
                </td>
              </tr>
              <tr>
                <td className="border-b border-r border-black px-1.5 py-1.5 bg-gray-50 font-bold">업태</td>
                <td className="border-b border-r border-black px-2 py-1.5">{company?.biz_type}</td>
                <td className="border-b border-r border-black px-1.5 py-1.5 bg-gray-50 font-bold text-center">종목</td>
                <td className="border-b border-black px-2 py-1.5">{company?.biz_item}</td>
              </tr>
              <tr>
                <td className="border-r border-black px-1.5 py-1.5 bg-gray-50 font-bold">전화번호</td>
                <td colSpan="3" className="px-2 py-1.5">{company?.contact_number}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 품목 리스트 (기존 유지) */}
      <table className="w-full border-collapse border-2 border-black text-sm mt-8 text-center">
        <thead className="bg-gray-100 font-bold h-12">
          <tr>
            <th className="border border-black p-2">월.일</th>
            <th className="border border-black p-2">품목 / 규격</th>
            <th className="border border-black p-2 w-16">수량</th>
            <th className="border border-black p-2 w-28">단가</th>
            <th className="border border-black p-2 w-32">공급가액</th>
            <th className="border border-black p-2 w-20">비고</th>
          </tr>
        </thead>
        <tbody>
          <tr className="h-12 font-bold text-base">
            <td className="border border-black p-2">{dateStr.split('. ')[1]}.{dateStr.split('. ')[2]}</td>
            <td className="border border-black p-2 text-left">{product.name}</td>
            <td className="border border-black p-2">1</td>
            <td className="border border-black p-2 text-right">{Number(product.price || 0).toLocaleString()}</td>
            <td className="border border-black p-2 text-right">{Number(product.price || 0).toLocaleString()}</td>
            <td className="border border-black p-2"></td>
          </tr>
          {[...Array(12)].map((_, i) => (
            <tr key={i} className="h-9">
              <td className="border border-black p-2"></td>
              <td className="border border-black p-2"></td>
              <td className="border border-black p-2"></td>
              <td className="border border-black p-2"></td>
              <td className="border border-black p-2"></td>
              <td className="border border-black p-2"></td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-100 font-black h-14">
          <tr>
            <td colSpan="2" className="border border-black p-2 text-lg">합 계 (VAT포함)</td>
            <td colSpan="4" className="border border-black p-2 text-right text-xl pr-10">
              ₩ {Number(product.price || 0).toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-10 p-6 border border-gray-300 rounded-2xl bg-gray-50 text-sm leading-relaxed">
        <p className="font-bold mb-2">※ 알림사항</p>
        <p>1. 본 명세서는 공급받는 자의 확인용으로 발행되었습니다.</p>
        <p>2. 물품의 품질 및 규격에 이상이 있을 경우 7일 이내에 연락 주시기 바랍니다.</p>
      </div>
    </div>
  );
}