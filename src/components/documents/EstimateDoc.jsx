import React from 'react';

export default function EstimateDoc({ targetName, companyInfo, items = [], totalAmount = 0, claimDate }) {
  
  // 💡 넘어온 교부일(claimDate)이 있으면 그 날짜를 쓰고, 없으면 오늘 날짜를 사용합니다.
  const getFormattedDate = (dateInput) => {
    if (!dateInput) {
      const today = new Date();
      return `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    }
    const d = new Date(dateInput);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  const displayDateStr = getFormattedDate(claimDate);

  const getFontSize = (name) => {
    if (!name) return '1.5rem';
    if (name.length > 15) return '1.1rem';
    if (name.length > 10) return '1.25rem';
    return '1.5rem';
  };

  const emptyRowsCount = Math.max(0, 8 - items.length);

  return (
    <div className="bg-white w-[210mm] h-[296mm] p-10 font-sans border-0 mx-auto text-black relative box-border overflow-hidden">
      
      <h1 className="text-4xl text-center font-black underline underline-offset-8 mb-12 tracking-[1em]">견 적 서</h1>

      <div className="flex justify-between items-start mb-6">
        <div className="space-y-4 pt-2">
          <div className="border-b-2 border-black pb-2 flex items-end gap-2 w-[320px]">
            <span className="font-bold whitespace-nowrap leading-none" style={{ fontSize: getFontSize(targetName) }}>
              {targetName}
            </span>
            <span className="text-xl font-bold leading-none">귀하</span>
          </div>
          <div className="space-y-1">
            <p className="text-base text-gray-700 font-medium">아래와 같이 견적합니다.</p>
            {/* 💡 계산된 displayDateStr를 출력합니다. */}
            <p className="text-sm text-gray-600 font-bold">견적일자: {displayDateStr}</p>
          </div>
          <div className="text-xl font-bold mt-4">
            견적금액: ₩ {Number(totalAmount).toLocaleString()} -
          </div>
        </div>

        <table className="border-collapse border-2 border-black text-[10px] w-[45%]">
          <tbody>
            <tr>
              <td rowSpan="5" className="border border-black bg-gray-50 w-6 p-0 align-middle">
                {/* 💡 세로 정렬 버그 방지용 Wrapper */}
                <div className="flex items-center justify-center min-h-[110px] text-center font-bold leading-tight">
                  <span>공<br/>급<br/>자</span>
                </div>
              </td>
              <td className="border border-black px-1.5 py-1 bg-gray-50 font-bold w-16 align-middle">등록번호</td>
              <td colSpan="3" className="border border-black px-2 py-1 font-black text-sm tracking-tighter align-middle">
                {companyInfo?.business_number || '등록번호 확인 필요'}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-1.5 py-1 bg-gray-50 font-bold align-middle">상호</td>
              <td className="border border-black px-1.5 py-1 font-bold align-middle max-w-[90px] truncate">
                {companyInfo?.company_name}
              </td>
              <td className="border border-black px-1.5 py-1 bg-gray-50 font-bold w-10 text-center align-middle">성명</td>
              <td className="border border-black px-1.5 py-1 align-middle p-0">
                {/* 💡 도장 이미지가 표 높이를 왜곡하지 않도록 철저히 격리 */}
                <div className="relative flex items-center w-full min-h-[22px] px-1.5">
                  <span className="relative z-10 font-bold">{companyInfo?.representative_name}</span>
                  <span className="relative z-10 ml-1 font-bold">(인)</span>
                  {companyInfo?.seal_image && (
                    <img 
                      src={companyInfo.seal_image} 
                      alt="도장"
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/3 -translate-y-1/2 w-12 h-12 object-contain opacity-90 mix-blend-multiply" 
                    />
                  )}
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-black px-1.5 py-1 bg-gray-50 font-bold align-middle">주소</td>
              <td colSpan="3" className="border border-black px-1.5 py-1 text-[9px] leading-tight align-middle">
                {companyInfo?.address}{companyInfo?.detail_address ? `, ${companyInfo.detail_address}` : ''}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-1.5 py-1 bg-gray-50 font-bold align-middle">업태</td>
              <td className="border border-black px-1.5 py-1 align-middle">{companyInfo?.biz_type}</td>
              <td className="border border-black px-1.5 py-1 bg-gray-50 font-bold text-center align-middle">종목</td>
              <td className="border border-black px-1.5 py-1 align-middle">{companyInfo?.biz_item}</td>
            </tr>
            <tr>
              <td className="border border-black px-1.5 py-1 bg-gray-50 font-bold align-middle">전화번호</td>
              <td colSpan="3" className="border border-black px-1.5 py-1 align-middle">{companyInfo?.contact_number}</td>
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
            <th className="border border-black p-2 w-12 align-middle">No.</th>
            <th className="border border-black p-2 align-middle">품목명</th>
            <th className="border border-black p-2 w-12 align-middle">수량</th>
            <th className="border border-black p-2 w-24 align-middle">단가</th>
            <th className="border border-black p-2 w-28 align-middle">금액</th>
            <th className="border border-black p-2 w-40 align-middle">비고 (제품사진)</th>
          </tr>
        </thead>
        <tbody>
          {/* 💡 tr의 강제 높이(h-32)를 제거하고 내부 이미지 div로 높이를 확보하여 자연스러운 중앙 정렬 유도 */}
          {items.map((item, index) => (
            <tr key={item.id || index}>
              <td className="border border-black p-2 font-bold align-middle">{index + 1}</td>
              <td className="border border-black p-4 text-left font-black text-base leading-snug align-middle">{item.name}</td>
              <td className="border border-black p-2 align-middle">{item.quantity}</td>
              <td className="border border-black p-2 text-right align-middle">₩{Number(item.price || 0).toLocaleString()}</td>
              <td className="border border-black p-2 text-right align-middle">₩{Number(item.total || 0).toLocaleString()}</td>
              <td className="border border-black p-2 bg-gray-50 align-middle">
                <div className="w-full h-28 flex justify-center items-center">
                  {item.image_url || item.image ? (
                    <img src={item.image_url || item.image} alt="제품" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                  ) : (
                    <span className="text-gray-300 text-xs">사진 미등록</span>
                  )}
                </div>
              </td>
            </tr>
          ))}

          {/* 💡 빈 줄 역시 내부 div로 최소 높이를 확보 */}
          {[...Array(emptyRowsCount)].map((_, i) => (
            <tr key={`empty-${i}`}>
              <td className="border border-black p-2 font-bold text-gray-300 align-middle">
                <div className="h-6 flex items-center justify-center w-full">{items.length + i + 1}</div>
              </td>
              <td className="border border-black p-2 align-middle"></td>
              <td className="border border-black p-2 align-middle"></td>
              <td className="border border-black p-2 align-middle"></td>
              <td className="border border-black p-2 align-middle"></td>
              <td className="border border-black p-2 align-middle"></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-black">
            <td colSpan="4" className="border border-black p-2 text-base align-middle">
              <div className="h-8 flex items-center justify-center w-full">합 계 (VAT 포함)</div>
            </td>
            <td colSpan="2" className="border border-black p-2 text-right text-lg pr-8 align-middle">
              ₩ {Number(totalAmount).toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}