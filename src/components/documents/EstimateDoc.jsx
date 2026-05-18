import React from 'react';

export default function EstimateDoc({ data, company }) {
  const customer = data?.customers || {};
  const product = data?.products || {};
  const govName = customer.local_governments?.name || '지자체명 미지정';
  
  // 오늘 날짜 (교부일자 없을 시 백업용 기본값)
  const today = new Date();
  const defaultDateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  // 교부일자(data.claim_date) 포맷팅
  const getClaimDateStr = (dateInput) => {
    if (!dateInput) return defaultDateStr; 
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return defaultDateStr;
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  const getFontSize = (name) => {
    if (name.length > 15) return '1.1rem';
    if (name.length > 10) return '1.25rem';
    return '1.5rem';
  };

  return (
    <div className="bg-white w-[210mm] min-h-[297mm] p-12 font-sans border border-gray-200 shadow-sm mx-auto text-black relative">
      <h1 className="text-4xl text-center font-black underline underline-offset-8 mb-12 tracking-[1em]">견 적 서</h1>

      <div className="flex justify-between items-start mb-6">
        {/* 수신인 영역 */}
        <div className="space-y-4 pt-4">
          <div className="border-b-2 border-black pb-1 flex items-baseline gap-1 w-[320px]">
            <span 
              className="font-bold truncate" 
              style={{ fontSize: getFontSize(govName) }}
            >
              {govName}
            </span>
            <span className="text-xl font-bold flex-shrink-0">귀하</span>
          </div>
          <div className="space-y-1">
            <p className="text-base text-gray-700 font-medium">아래와 같이 견적합니다.</p>
            <p className="text-sm text-gray-600 font-bold">견적일자: {getClaimDateStr(data?.claim_date)}</p>
          </div>
          <div className="text-xl font-bold mt-4">
            견적금액: ₩ {Number(data?.total_amount || product.price || 0).toLocaleString()} -
          </div>
        </div>

        {/* 공급자 정보 */}
        <table className="border-collapse border-2 border-black text-[10px] w-[45%]">
          <tbody>
            <tr>
              <td rowSpan="5" className="border border-black bg-gray-50 w-6 text-center font-bold py-1 leading-tight">
                공<br/>급<br/>자
              </td>
              <td className="border border-black px-1.5 py-1 bg-gray-50 font-bold w-16">등록번호</td>
              <td colSpan="3" className="border border-black px-2 py-1 font-black text-sm tracking-tighter">
                {company?.business_number || '등록번호 확인 필요'}
              </td>
            </tr>
            {/* 🚨 상호와 성명을 한 행으로 분리 */}
            <tr>
              <td className="border border-black px-1.5 py-1 bg-gray-50 font-bold">상호</td>
              <td className="border border-black px-1.5 py-1 truncate max-w-[90px] font-bold">
                {company?.company_name}
              </td>
              <td className="border border-black px-1.5 py-1 bg-gray-50 font-bold w-10 text-center">성명</td>
              <td className="border border-black px-1.5 py-1 relative min-w-[60px]">
                <span className="relative z-10 font-bold">{company?.representative_name}</span>
                {company?.seal_image && (
                  <img 
                    src={company.seal_image} 
                    className="absolute top-1/2 left-1/2 -translate-x-1/3 -translate-y-1/2 w-14 h-14 object-contain opacity-90 max-w-none mix-blend-multiply" 
                  />
                )}
                <span className="z-10 ml-1 font-bold">(인)</span>
              </td>
            </tr>
            <tr>
              <td className="border border-black px-1.5 py-1 bg-gray-50 font-bold">주소</td>
              <td colSpan="3" className="border border-black px-1.5 py-1 text-[9px] leading-tight">
                {company?.address}{company?.detail_address ? `, ${company.detail_address}` : ''}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-1.5 py-1 bg-gray-50 font-bold">업태</td>
              <td className="border border-black px-1.5 py-1">{company?.biz_type}</td>
              <td className="border border-black px-1.5 py-1 bg-gray-50 font-bold text-center">종목</td>
              <td className="border border-black px-1.5 py-1">{company?.biz_item}</td>
            </tr>
            <tr>
              <td className="border border-black px-1.5 py-1 bg-gray-50 font-bold">전화번호</td>
              <td colSpan="3" className="border border-black px-1.5 py-1">{company?.contact_number}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="text-right text-xs font-bold mb-1 text-gray-500">
        유효기간: 견적일로부터 30일
      </div>

      <table className="w-full border-collapse border-2 border-black text-center text-sm">
        <thead>
          <tr className="bg-gray-100 font-bold h-10">
            <th className="border border-black p-2 w-12">No.</th>
            <th className="border border-black p-2">품목명</th>
            <th className="border border-black p-2 w-12">수량</th>
            <th className="border border-black p-2 w-24">단가</th>
            <th className="border border-black p-2 w-28">금액</th>
            <th className="border border-black p-2 w-40">비고 (제품사진)</th>
          </tr>
        </thead>
        <tbody>
          <tr className="h-44">
            <td className="border border-black p-2 font-bold">1</td>
            <td className="border border-black p-4 text-left font-black text-base">{product.name}</td>
            <td className="border border-black p-2">1</td>
            <td className="border border-black p-2 text-right">₩{Number(product.price || 0).toLocaleString()}</td>
            <td className="border border-black p-2 text-right">₩{Number(product.price || 0).toLocaleString()}</td>
            <td className="border border-black p-1 bg-gray-50">
              {product.image ? (
                <img src={product.image} alt="제품" className="w-full h-full object-contain mix-blend-multiply" />
              ) : (
                <span className="text-gray-300 text-xs">사진 미등록</span>
              )}
            </td>
          </tr>
          {[...Array(7)].map((_, i) => (
            <tr key={i} className="h-9">
              <td className="border border-black p-2 font-bold text-gray-300">{i + 2}</td>
              <td className="border border-black p-2"></td>
              <td className="border border-black p-2"></td>
              <td className="border border-black p-2"></td>
              <td className="border border-black p-2"></td>
              <td className="border border-black p-2"></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-black h-12">
            <td colSpan="4" className="border border-black p-2 text-base">합 계 (VAT 포함)</td>
            <td colSpan="2" className="border border-black p-2 text-right text-lg pr-8">
              ₩ {Number(product.price || 0).toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}