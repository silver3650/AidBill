import React from 'react';

export default function ClaimFormDoc({ data, company }) {
  // 데이터 안전성 확보
  const customer = data?.customers || {};
  const product = data?.products || {};
  
  // 날짜 데이터 파싱 (YYYY-MM-DD -> 년, 월, 일 분리)
  const dateParts = data?.claim_date ? data.claim_date.split('-') : ['', '', ''];

  // 주소 합치기 (대상자 기본주소 + 상세주소)
  const fullAddress = `${customer?.address || ''} ${customer?.detail_address || ''}`.trim();

  // 장애 유형 및 정도 합치기 (유형 / 정도)
  const disabilityCombined = customer?.disability_type && customer?.disability_level 
    ? `${customer.disability_type} / ${customer.disability_level}`
    : (customer?.disability_type || customer?.disability_level || '');

  return (
    // A4 규격(210x297) 안에서 세로 길이를 압축하여 여유를 줍니다.
    <div className="bg-white w-[210mm] h-[297mm] p-[15mm] flex flex-col text-slate-900 box-border overflow-hidden relative font-sans">
        
      {/* 상단 서식 번호 */}
      <div className="text-[11px] text-left mb-1 text-slate-500 font-medium shrink-0">
        ■ 장애인·노인 등을 위한 보조기기 지원 및 활용촉진에 관한 법률 시행규칙 [별지 제2호서식]
      </div>

      {/* 1. 서류 타이틀 */}
      <table className="w-full mb-3 border-none border-collapse table-fixed shrink-0">
        <tbody>
          <tr className="border-none">
            <td rowSpan="3" className="border-none w-1/3 text-2xl font-black tracking-tight text-center align-middle">
              장애인보조기기
            </td>
            <td className="border-none w-1/3 text-[12px] font-bold pl-10 py-1 align-middle">
              <label className="inline-flex items-center gap-2 cursor-pointer whitespace-nowrap">
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-indigo-600 m-0 p-0" />
                <span className="relative -top-[1.5px]">교부</span>
              </label>
            </td>
            <td rowSpan="3" className="border-none w-1/3 text-2xl font-black tracking-[0.4em] text-center align-middle">
              비용청구서
            </td>
          </tr>
          <tr className="border-none">
            <td className="border-none text-[12px] font-bold pl-10 py-1 align-middle">
              <label className="inline-flex items-center gap-2 cursor-pointer whitespace-nowrap">
                <input type="checkbox" className="w-4 h-4 accent-indigo-600 m-0 p-0" />
                <span className="relative -top-[1.5px]">대여</span>
              </label>
            </td>
          </tr>
          <tr className="border-none">
            <td className="border-none text-[12px] font-bold pl-10 py-1 align-middle">
              <label className="inline-flex items-center gap-2 cursor-pointer whitespace-nowrap">
                <input type="checkbox" className="w-4 h-4 accent-indigo-600 m-0 p-0" />
                <span className="relative -top-[1.5px]">사후관리(수리, 점검 등)</span>
              </label>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-between items-end mb-1 text-[11px] font-medium text-slate-500 shrink-0">
        <p>※ 색상이 어두운 난은 청구인이 작성하지 않으며, [ ]에는 해당되는 곳에 √표를 합니다.</p>
        <p>(앞쪽)</p>
      </div>

      {/* 2. 접수 확인란 (행 높이 압축: py-1) */}
      <table className="w-full border-collapse border-[1.5px] border-slate-800 text-[12px] text-center mb-2.5 bg-slate-100 shrink-0">
        <tbody>
          <tr>
            <td className="border border-slate-800 py-1 px-2 w-[12%] font-bold text-slate-700">접수번호</td>
            <td className="border border-slate-800 py-1 px-2 w-[21%]"></td>
            <td className="border border-slate-800 py-1 px-2 w-[12%] font-bold text-slate-700">접수일시</td>
            <td className="border border-slate-800 py-1 px-2 w-[21%]"></td>
            <td className="border border-slate-800 py-1 px-2 w-[12%] font-bold text-slate-700">처리기간</td>
            <td className="border border-slate-800 py-1 px-2 w-[22%] font-extrabold">15일</td>
          </tr>
        </tbody>
      </table>

      {/* 3. 보조기기업체 (행 높이 압축: py-1 ~ py-1.5) */}
      <table className="w-full border-collapse border-[1.5px] border-slate-800 text-[12px] mb-2.5 table-fixed shrink-0">
        <tbody>
          <tr>
            <td rowSpan="6" className="border border-slate-800 py-1 px-1 w-[80px] text-center font-bold bg-slate-50 leading-tight">보조기기<br/>업체</td>
            <td className="border border-slate-800 py-1 px-3 w-[33%] text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">업체명</td>
            <td className="border border-slate-800 py-1 px-3 w-[33%] text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">대표자</td>
            <td className="border border-slate-800 py-1 px-3 w-[34%] text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">생년월일</td>
          </tr>
          <tr>
            <td className="border border-slate-800 py-1.5 px-3 text-left font-bold text-[13px] border-t-0 truncate">{company?.company_name}</td>
            <td className="border border-slate-800 py-1.5 px-3 text-left font-bold text-[13px] border-t-0 truncate">{company?.representative_name}</td>
            <td className="border border-slate-800 py-1.5 px-3 text-left font-bold text-[13px] border-t-0 truncate">{company?.representative_birth}</td>
          </tr>
          <tr>
            <td colSpan="2" className="border border-slate-800 py-1 px-3 text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">주소</td>
            <td className="border border-slate-800 py-1 px-3 text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">우편번호</td>
          </tr>
          <tr>
            <td colSpan="2" rowSpan="3" className="border border-slate-800 py-1.5 px-3 text-left font-bold text-[13px] border-t-0 align-top leading-snug">
              {company?.address} {company?.detail_address}
            </td>
            <td className="border border-slate-800 py-1.5 px-3 text-left font-bold text-[13px] border-t-0 truncate">{company?.zip_code}</td>
          </tr>
          <tr>
            <td className="border border-slate-800 py-1 px-3 text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">전화번호</td>
          </tr>
          <tr>
            <td className="border border-slate-800 py-1.5 px-3 text-left font-bold text-[13px] border-t-0 truncate">{company?.contact_number}</td>
          </tr>
        </tbody>
      </table>

      {/* 4. 청구내용 (행 높이 대폭 압축: py-1) */}
      <table className="w-full border-collapse border-[1.5px] border-slate-800 text-[12px] mb-2.5 table-fixed shrink-0">
        <tbody>
          <tr>
            <td rowSpan="6" className="border border-slate-800 py-1 px-1 w-[80px] text-center font-bold bg-slate-50 whitespace-nowrap">청구내용</td>
            <td rowSpan="4" className="border border-slate-800 py-1 px-1 w-[100px] text-center font-bold bg-slate-50">인적사항</td>
            <td colSpan="2" className="border border-slate-800 py-1 px-3 text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">성명</td>
            <td colSpan="2" className="border border-slate-800 py-1 px-3 text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">생년월일</td>
            <td className="border border-slate-800 py-1 px-3 text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">성별</td>
          </tr>
          <tr>
            <td colSpan="2" className="border border-slate-800 py-1.5 px-2 text-center border-t-0 font-black text-[14px]">{customer?.name}</td>
            <td colSpan="2" className="border border-slate-800 py-1.5 px-2 text-center border-t-0 font-bold text-[13px]">{customer?.birth_date}</td>
            <td className="border border-slate-800 py-1.5 px-2 text-center border-t-0 align-middle">
              <span className="inline-flex items-center gap-3 justify-center w-full">
                <label className="inline-flex items-center gap-1 font-bold cursor-pointer">
                  <input type="checkbox" className="w-3.5 h-3.5 accent-indigo-600 m-0 p-0" checked={customer?.gender === '남'} readOnly />
                  <span className="relative -top-[1px]">남</span>
                </label>
                <label className="inline-flex items-center gap-1 font-bold cursor-pointer">
                  <input type="checkbox" className="w-3.5 h-3.5 accent-indigo-600 m-0 p-0" checked={customer?.gender === '여'} readOnly />
                  <span className="relative -top-[1px]">여</span>
                </label>
              </span>
            </td>
          </tr>
          <tr>
            <td colSpan="3" className="border border-slate-800 py-1 px-3 text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">주소</td>
            <td colSpan="2" className="border border-slate-800 py-1 px-3 text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">장애 유형 및 정도</td>
          </tr>
          <tr>
            <td colSpan="3" className="border border-slate-800 py-1.5 px-2 text-center border-t-0 font-bold text-[12px] leading-snug">{fullAddress}</td>
            <td colSpan="2" className="border border-slate-800 py-1.5 px-2 text-center border-t-0 font-bold text-[12px]">{disabilityCombined}</td>
          </tr>
          
          <tr>
            <td rowSpan="2" className="border border-slate-800 py-1 px-1 w-[100px] text-center font-bold bg-slate-50 leading-[1.2] text-[11px]">
              보조기기교부·<br/>대여·사후관리<br/>명세
            </td>
            <td colSpan="3" rowSpan="2" className="border border-slate-800 py-1 px-2 text-center align-middle font-bold text-[13px] leading-snug text-indigo-700">{product?.name}</td>
            <td colSpan="2" className="border border-slate-800 py-1 px-3 text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">비용 청구금액</td>
          </tr>
          <tr>
            <td colSpan="2" className="border border-slate-800 py-1 px-3 text-right font-black text-[15px] border-t-0 bg-slate-50/30">
              <span className="mr-1 tracking-tight text-indigo-900">
                {data?.total_amount ? data.total_amount.toLocaleString() : '0'}
              </span>
              <span className="text-[11px] font-bold text-slate-500">원</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 5. 검수확인 */}
      <table className="w-full border-collapse border-[1.5px] border-slate-800 text-[12px] mb-3 text-center table-fixed shrink-0">
        <tbody>
          <tr>
            <td rowSpan="2" className="border border-slate-800 py-1 px-1 w-[80px] font-bold bg-slate-50">검수확인</td>
            <td className="border border-slate-800 py-1 px-3 text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">검수확인자</td>
            <td className="border border-slate-800 py-1 px-3 text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">자격종류</td>
            <td className="border border-slate-800 py-1 px-3 text-left font-bold bg-slate-50 border-b-0 text-slate-600 text-[11px]">자격번호</td>
          </tr>
          <tr>
            {/* 💡 빈 행의 여유공간(h-8)을 기존보다 줄여서 세로 여백 최적화 */}
            <td className="border border-slate-800 py-1 px-2 h-8 border-t-0"></td>
            <td className="border border-slate-800 py-1 px-1 text-[11px] border-t-0 align-middle">
              <div className="flex flex-col items-start justify-center gap-1.5 pl-3 w-full">
                <label className="inline-flex items-center gap-1.5 font-medium whitespace-nowrap cursor-pointer">
                  <input type="checkbox" className="w-3.5 h-3.5 m-0 p-0" />
                  <span className="relative -top-[1.5px] text-[10.5px]">의지보조기기사</span>
                </label>
                <label className="inline-flex items-center gap-1.5 font-medium whitespace-nowrap cursor-pointer">
                  <input type="checkbox" className="w-3.5 h-3.5 m-0 p-0" />
                  <span className="relative -top-[1.5px] text-[10.5px]">보조공학사</span>
                </label>
              </div>
            </td>
            <td className="border border-slate-800 py-1 px-2 border-t-0"></td>
          </tr>
        </tbody>
      </table>

      {/* 6. 제출문 및 서명 (여백 대폭 축소) */}
      <div className="mb-auto space-y-3 flex-1 flex flex-col justify-center">
        <p className="text-[13px] leading-snug text-justify px-4 font-medium text-slate-700">
          「장애인·노인 등을 위한 보조기기 지원 및 활용촉진에 관한 법률」 제8조제1항 및 같은 법 시행규칙 제6조제1항에 따라 보조기기의 교부·대여·사후관리 비용 지급을 위와 같이 청구합니다.
        </p>
        
        <div className="text-right pr-12 font-bold text-[14px] tracking-widest pt-2">
            {dateParts[0]} 년 &nbsp;&nbsp; {dateParts[1]} 월 &nbsp;&nbsp; {dateParts[2]} 일
        </div>

        <div className="flex justify-end items-center pr-10 text-[15px] pt-1">
          <span className="mr-6 font-bold text-slate-600">청구업체</span>
          <div className="relative flex items-center border-b-[1.5px] border-slate-800 min-w-[280px] justify-between pb-1">
            <span className="pl-2 font-black text-[15px] text-slate-900">{company?.company_name}</span>
            <span className="text-[12px] whitespace-nowrap font-bold ml-6 text-slate-400">(서명 또는 인)</span>
            
            {company?.seal_image && (
              <img 
                src={company.seal_image} 
                alt="업체직인" 
                className="absolute right-0 top-1/2 -translate-y-1/2 w-[16mm] h-[16mm] object-contain mix-blend-multiply opacity-90 drop-shadow-sm" 
              />
            )}
          </div>
        </div>
        <h3 className="text-[19px] font-black text-left pl-4 mt-4 tracking-tighter">시장·군수·구청장 <span className="text-[15px] font-normal text-slate-500">귀하</span></h3>
      </div>

      {/* 7. 하단 첨부서류 및 처리절차 (패딩 축소: py-2) */}
      <div className="space-y-2 shrink-0">
        <table className="w-full border-collapse border-[1.5px] border-slate-800 text-[11px]">
          <tbody>
            <tr>
              <td className="border border-slate-800 py-2 px-3 w-[15%] text-center font-bold bg-slate-50 leading-tight">첨부서류</td>
              <td className="border border-slate-800 py-2 px-3 w-[65%] text-justify leading-snug font-medium text-slate-600">
                「장애인·노인 등을 위한 보조기기 지원 및 활용촉진에 관한 법률 시행규칙」 제4조제3항에 따른 의료기관의 진단서가 있는 경우에는 그 진단서에 따라 보조기기가 교부등이 이루어졌다는 확인서 1부
              </td>
              <td className="border border-slate-800 py-2 px-3 w-[20%] text-center bg-slate-50/50">
                <div className="font-bold border-b border-slate-300 pb-1 mb-1 text-slate-500">수수료</div>
                <div className="font-bold text-[12px]">없 음</div>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="border-[1.5px] border-slate-800 p-2 text-[11px]">
          <div className="text-center font-black bg-slate-800 text-white py-1 mb-2.5 border border-slate-800 w-28 mx-auto rounded-sm text-[10px] uppercase tracking-widest">처 리 절 차</div>
          <div className="flex justify-between items-center text-center px-4">
            {[
              { label: '청구서 작성\n(청구인)' },
              { label: '접 수\n(시·군·구)' },
              { label: '확 인' },
              { label: '지급액 결정' },
              { label: '지 급\n(청구인)' }
            ].map((step, idx) => (
              <React.Fragment key={idx}>
                <div className="flex flex-col items-center">
                  <div className="border border-slate-800 px-1 py-0.5 w-[90px] h-9 flex items-center justify-center bg-white whitespace-pre-line leading-tight text-center font-bold text-[10px] shadow-sm">
                    {step.label}
                  </div>
                </div>
                {idx < 4 && <div className="text-lg font-black text-slate-300">➔</div>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      
      {/* 하단 용지 규격 */}
      <div className="text-[10px] text-right mt-1.5 text-slate-400 font-medium shrink-0">
        210mm×297mm [백상지(80g/㎡) 또는 중질지(80g/㎡)]
      </div>
    </div>
  );
}