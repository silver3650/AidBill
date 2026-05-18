import React from 'react';

export default function ConfirmationDoc({ data, company }) {
  const customer = data?.customers || {};
  const product = data?.products || {};

  // 데이터베이스에 저장된 사진 배열을 안전하게 불러오기
  let photos = [];
  if (Array.isArray(data?.receipt_photos)) {
    photos = data.receipt_photos;
  } else if (typeof data?.receipt_photos === 'string') {
    try { photos = JSON.parse(data.receipt_photos); } catch(e) {}
  }

  // 🚨 [핵심 해결 구역] 하단 서류 작성일을 상단 교부일과 철저히 분리하기 위해 주입 필드 감지 모듈 배치
  const targetDateStr = data?.issueDate || data?.issue_date || data?.writtenDate || data?.write_date || data?.docDate || data?.claim_date || new Date();
  const dateObj = new Date(targetDateStr);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  return (
    // 💡 단일 A4 전체 영역 컨테이너로 변경하여 사업자등록증처럼 가득 차게 구현
    <div className="bg-white w-[210mm] h-[297mm] p-[20mm] flex flex-col text-slate-900 box-border overflow-hidden relative font-sans">
      
      <h2 className="text-3xl font-black text-center tracking-[0.4em] mb-10 mt-6">
        장애인보조기기 교부 확인서
      </h2>

      <div className="w-full border-t-[2px] border-slate-900 mb-3"></div>

      <table className="w-full border-collapse border-[1.5px] border-slate-900 text-[13px]">
        <tbody>
          {/* 1행: 교부받은 사람 */}
          <tr>
            <td rowSpan="3" className="border border-slate-900 p-2 w-[12%] font-bold text-center align-middle bg-slate-50">교부받은<br/>사람</td>
            <td className="border border-slate-900 p-2 w-[12%] font-bold text-center align-middle bg-slate-50">성명</td>
            <td className="border border-slate-900 p-2 w-[18%] font-black text-center align-middle">{customer?.name}</td>
            <td className="border border-slate-900 p-2 w-[14%] font-bold text-center align-middle bg-slate-50">생년월일</td>
            <td className="border border-slate-900 p-2 w-[18%] text-center align-middle font-mono">{customer?.birth_date}</td>
            <td className="border border-slate-900 p-2 w-[12%] font-bold text-center align-middle bg-slate-50">전화번호</td>
            <td className="border border-slate-900 p-2 w-[14%] text-center align-middle font-mono whitespace-nowrap">{customer?.contact_number || customer?.phone || '-'}</td>
          </tr>
          {/* 2행: 주소 */}
          <tr>
            <td className="border border-slate-900 p-2 font-bold text-center align-middle bg-slate-50">주소</td>
            <td colSpan="5" className="border border-slate-900 p-2 text-center align-middle">
              {customer?.address} {customer?.detail_address}
            </td>
          </tr>
          {/* 3행: 장애유형 / 장애정도 */}
          <tr>
            <td className="border border-slate-900 p-2 font-bold text-center align-middle bg-slate-50">장애유형</td>
            <td colSpan="2" className="border border-slate-900 p-2 text-center align-middle">{customer?.disability_type || '-'}</td>
            <td className="border border-slate-900 p-2 font-bold text-center align-middle bg-slate-50">장애정도</td>
            <td colSpan="2" className="border border-slate-900 p-2 text-center align-middle">{customer?.disability_level || '-'}</td>
          </tr>

          {/* 4행: 보조기기 */}
          <tr>
            <td rowSpan="3" className="border border-slate-900 p-2 font-bold text-center align-middle bg-slate-50">보조기기</td>
            <td className="border border-slate-900 p-2 font-bold text-center align-middle bg-slate-50">품목</td>
            <td colSpan="5" className="border border-slate-900 p-2 font-black text-slate-900 text-center align-middle">
              {product?.name}
            </td>
          </tr>
          {/* 5행: 교부일 / 교부처 */}
          <tr>
            <td className="border border-slate-900 p-2 font-bold text-center align-middle bg-slate-50">교부일</td>
            <td colSpan="2" className="border border-slate-900 p-2 text-center align-middle font-mono">{data?.claim_date}</td>
            <td className="border border-slate-900 p-2 font-bold text-center align-middle bg-slate-50">교부처</td>
            <td colSpan="2" className="border border-slate-900 p-2 text-center align-middle">{company?.company_name}</td>
          </tr>
          {/* 6행: 가격 / 기타 */}
          <tr>
            <td className="border border-slate-900 p-2 font-bold text-center align-middle bg-slate-50">가격</td>
            <td colSpan="2" className="border border-slate-900 p-2 text-center align-middle">
              {data?.total_amount ? data.total_amount.toLocaleString() : '0'} 원
            </td>
            <td className="border border-slate-900 p-2 font-bold text-center align-middle bg-slate-50">기타</td>
            <td colSpan="2" className="border border-slate-900 p-2 text-center align-middle">-</td>
          </tr>

          {/* 7행: 교부확인 */}
          <tr>
            <td rowSpan="2" className="border border-slate-900 p-2 font-bold text-center align-middle bg-slate-50">교부확인</td>
            <td colSpan="6" className="border border-slate-900 p-3 align-middle">
              <div className="text-left font-bold text-[13px] text-slate-900 pl-2">
                {data?.claim_date} 택배발송함 ({data?.carrier || 'CJ대한통운'} {data?.tracking_no || '-'})
              </div>
            </td>
          </tr>
          
          {/* 8행: 💡 발송확인 사진 영역 높이를 h-[220px]로 대폭 확장 */}
          <tr>
            <td colSpan="6" className="border border-slate-900 p-0 h-[220px] align-middle">
              <div className="flex w-full h-full divide-x divide-slate-900">
                {photos.length > 0 ? (
                  photos.map((imgSrc, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center justify-center p-2 bg-white">
                       <img src={imgSrc} alt={`교부사진 ${i+1}`} className="max-h-[180px] max-w-full object-contain mb-1" />
                       <span className="text-[11px] font-bold text-slate-400">사진 {i+1}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex-1 flex items-center justify-center text-slate-300 font-bold text-sm">사진 1</div>
                    <div className="flex-1 flex items-center justify-center text-slate-300 font-bold text-sm">사진 2</div>
                  </>
                )}
              </div>
            </td>
          </tr>

          {/* 9행: 최종 확인 문구 및 업체/담당자 서명란 */}
          <tr>
            <td colSpan="7" className="border border-slate-900 p-6 align-top">
              <div className="text-[14px] font-bold text-left mb-14 mt-2 pl-2">
                위와 같이 보조기기가 교부되었음을 확인합니다
              </div>
              
              <div className="text-center font-bold text-[14px] mb-10">
                {year}년 &nbsp;&nbsp;&nbsp;&nbsp; {month}월 &nbsp;&nbsp;&nbsp;&nbsp; {day}일
              </div>

              {/* 💡 양식을 정확히 반 가른 뒤 중앙(50% 지점)부터 내용이 채워지도록 구현 */}
              <div className="w-full flex">
                <div className="w-1/2"></div> {/* 왼쪽 절반 공간을 완전히 비움 */}
                <div className="w-1/2 pl-4">  {/* 중앙부터 우측 시작 */}
                  <table className="w-full border-none text-[14px] font-bold">
                    <tbody>
                      <tr>
                        <td className="w-[80px] text-left pb-4">업체명 :</td>
                        <td className="text-left pb-4">{company?.company_name}</td>
                      </tr>
                      <tr>
                        <td className="text-left pb-4">직급 :</td>
                        <td className="text-left pb-4">대표</td>
                      </tr>
                      <tr>
                        <td className="text-left pb-2">담당자명 :</td>
                        <td className="text-left pb-2 relative whitespace-nowrap flex items-center justify-between">
                          <span>{company?.representative_name}</span>
                          <span className="relative pr-16">
                            (서명 또는 인)
                            {/* 💡 직인 크기를 비용청구서와 똑같은 16mm 스펙으로 축소 및 위치 정렬 */}
                            {company?.seal_image && (
                              <img 
                                src={company.seal_image} 
                                alt="공급자 직인" 
                                className="absolute left-[85px] top-1/2 -translate-y-1/2 w-[16mm] h-[16mm] object-contain mix-blend-multiply opacity-90"
                              />
                            )}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </td>
          </tr>

        </tbody>
      </table>
    </div>
  );
}