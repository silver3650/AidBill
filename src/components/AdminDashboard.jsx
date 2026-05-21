import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Building2, Receipt, Calendar, Search, 
  Download, Filter, ArrowUpRight, TrendingUp, AlertCircle, 
  RefreshCw, Clock, CheckCircle, X, FileText // 💡 X, FileText 아이콘 추가
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [companies, setCompanies] = useState([]);
  const [billingData, setBillingData] = useState([]);
  const [pendingCompanies, setPendingCompanies] = useState([]); 
  const [searchTerm, setSearchTerm] = useState('');
  
  // 💡 업체 상세 정보 모달 상태
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 조회 기간 상태 (기본값: 이번 달)
  const today = new Date();
  const [dateRange, setDateRange] = useState({
    start: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
    end: new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
  });

  // 과금 정책
  const PRICING = {
    BASE_FEE: 30000,
    FREE_CLAIMS: 10,
    FEE_PER_CLAIM: 1000
  };

  useEffect(() => {
    checkAdminAndFetchData();
  }, [dateRange]);

  const fetchPendingCompanies = async () => {
    const { data, error } = await supabase
      .from('companies') 
      .select('*')
      .eq('is_approved', false)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPendingCompanies(data);
    }
  };

  async function checkAdminAndFetchData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      const { data: adminCheck } = await supabase.from('admin_users').select('*').eq('id', user.id).maybeSingle();
      if (!adminCheck) {
        alert('최고 관리자 권한이 없습니다. 접근이 차단되었습니다.');
        navigate('/');
        return;
      }
      setIsAdmin(true);

      await fetchPendingCompanies();

      const { data: allCompanies } = await supabase.from('company_profile').select('*').order('created_at', { ascending: false });
      
      const { data: allClaims } = await supabase
        .from('claims')
        .select('*')
        .gte('claim_date', dateRange.start)
        .lte('claim_date', dateRange.end);

      const calculatedData = (allCompanies || []).map(company => {
        const companyClaims = (allClaims || []).filter(c => c.company_id === company.company_id);
        const claimCount = companyClaims.length;
        const totalClaimAmount = companyClaims.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
        
        let extraClaims = claimCount - PRICING.FREE_CLAIMS;
        if (extraClaims < 0) extraClaims = 0;
        const totalBillingFee = PRICING.BASE_FEE + (extraClaims * PRICING.FEE_PER_CLAIM);

        return {
          ...company,
          claimCount,
          totalClaimAmount,
          extraClaims,
          totalBillingFee
        };
      });

      calculatedData.sort((a, b) => b.claimCount - a.claimCount);

      setCompanies(allCompanies || []);
      setBillingData(calculatedData);

    } catch (error) {
      console.error('관리자 데이터 로드 에러:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async (companyId, companyName) => {
    if (!window.confirm(`[${companyName}] 업체를 가입 승인하시겠습니까?\n승인 즉시 해당 업체는 로그인이 가능해집니다.`)) return;

    try {
      const { error } = await supabase
        .from('companies')
        .update({ is_approved: true })
        .eq('id', companyId);

      if (error) throw error;

      alert(`${companyName} 업체가 성공적으로 승인되었습니다!`);
      await fetchPendingCompanies(); 
    } catch (error) {
      alert('승인 처리 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const setQuickDate = (type) => {
    const d = new Date();
    let start, end;
    if (type === 'thisMonth') {
      start = new Date(d.getFullYear(), d.getMonth(), 1);
      end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    } else if (type === 'prevMonth') {
      start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      end = new Date(d.getFullYear(), d.getMonth(), 0);
    } else if (type === 'today') {
      start = d; end = d;
    }
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  };

  const filteredBillingData = billingData.filter(c => 
    (c.company_name || '').includes(searchTerm) || 
    (c.representative_name || '').includes(searchTerm)
  );

  const downloadCSV = () => {
    const headers = ['업체명', '대표자', '연락처', '기간내 청구건수', '기간내 총 청구액', '초과건수', '청구될 과금액(구독료)'];
    const rows = filteredBillingData.map(c => [
      c.company_name || '미설정',
      c.representative_name || '-',
      c.contact_number || '-',
      `${c.claimCount}건`,
      `${c.totalClaimAmount}원`,
      `${c.extraClaims}건`,
      `${c.totalBillingFee}원`
    ]);

    let csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `업체별_과금명세_${dateRange.start}_${dateRange.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 💡 업체 상세 정보 모달 열기/닫기 함수
  const openCompanyDetails = (company) => {
    setSelectedCompany(company);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCompany(null);
  };

  if (loading && !isAdmin) {
    return <div className="h-[80vh] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-20 font-sans relative">
      
      {/* 💡 업체 상세 정보 모달 (isModalOpen이 true일 때만 표시) */}
      {isModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* 모달 헤더 */}
            <div className="bg-gray-50 border-b border-gray-100 p-6 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Building2 className="text-indigo-600" /> 업체 상세 정보
              </h2>
              <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            
            {/* 모달 내용 */}
            <div className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div className="col-span-2">
                  <p className="text-xs font-bold text-gray-400 mb-1">업체명</p>
                  <p className="text-lg font-black text-gray-900">{selectedCompany.company_name || '미설정 업체'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-1">대표자명</p>
                  <p className="text-sm font-bold text-gray-700">{selectedCompany.owner_name || selectedCompany.representative_name || '미등록'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-1">사업자등록번호</p>
                  <p className="text-sm font-bold text-gray-700">{selectedCompany.biz_reg_number || selectedCompany.business_number || '미등록'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-bold text-gray-400 mb-1">이메일 (아이디)</p>
                  <p className="text-sm font-bold text-gray-700">{selectedCompany.email || '미등록'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-bold text-gray-400 mb-1">연락처</p>
                  <p className="text-sm font-bold text-gray-700">{selectedCompany.contact_number || '미등록'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-bold text-gray-400 mb-1">승인 상태</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${selectedCompany.is_approved === false ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {selectedCompany.is_approved === false ? '승인 대기중' : '승인 완료/운영중'}
                  </span>
                </div>
              </div>
              
              {/* 사업자등록증 URL이 있는 경우만 버튼 표시 (가입 대기 목록용) */}
              {selectedCompany.biz_license_url && (
                <div className="pt-6 border-t border-gray-100">
                  <a 
                    href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/biz-licenses/${selectedCompany.biz_license_url}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 py-3 rounded-xl font-bold text-sm transition-colors"
                  >
                    <FileText size={18} /> 첨부된 사업자등록증 보기
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 관리자 헤더 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-gray-900 p-6 md:p-8 rounded-[2rem] text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-bold mb-2">
            <ShieldCheck size={20} /> SUPER ADMIN
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter">통합 관리 대시보드</h1>
          <p className="text-gray-400 mt-2 font-medium">업체 가입 승인 및 플랫폼 내 사용량, 구독료를 집계합니다.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={downloadCSV} className="w-full md:w-auto bg-emerald-500 text-white px-6 py-3.5 rounded-2xl font-black shadow-lg hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
            <Download size={18} /> 정산 엑셀 다운로드
          </button>
        </div>
      </div>

      {/* 신규 가입 대기 목록 섹션 */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
        <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
          <Clock className="text-amber-500" /> 신규 가입 승인 대기
          {pendingCompanies.length > 0 && (
            <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-sm font-black animate-pulse">
              {pendingCompanies.length}건
            </span>
          )}
        </h3>

        {pendingCompanies.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-2xl text-gray-400 font-bold border border-dashed border-gray-200">
            현재 승인 대기 중인 신규 업체가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left whitespace-nowrap min-w-[800px]">
              <thead className="bg-gray-50 text-[12px] font-black text-gray-500 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4 rounded-l-xl">업체명</th>
                  <th className="px-6 py-4">대표자</th>
                  <th className="px-6 py-4">사업자등록번호</th>
                  <th className="px-6 py-4">아이디(이메일)</th>
                  <th className="px-6 py-4 rounded-r-xl text-right">승인 관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pendingCompanies.map(company => (
                  <tr key={company.id} className="hover:bg-gray-50/50 transition-colors">
                    <td 
                      className="px-6 py-4 font-black text-indigo-600 cursor-pointer hover:underline underline-offset-4"
                      onClick={() => openCompanyDetails(company)} // 💡 모달 오픈 이벤트 추가
                    >
                      {company.company_name}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-600">{company.owner_name}</td>
                    <td className="px-6 py-4 font-bold text-gray-600">{company.biz_reg_number}</td>
                    <td className="px-6 py-4 font-bold text-gray-400">{company.email}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleApprove(company.id, company.company_name)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 ml-auto transition-all shadow-md shadow-emerald-200 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <CheckCircle size={16} /> 가입 승인
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 요약 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
            <Building2 size={28} />
          </div>
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">총 등록 업체</p>
            <p className="text-2xl font-black text-gray-900">{companies.length} <span className="text-sm font-bold text-gray-500">개사</span></p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <Receipt size={28} />
          </div>
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">선택 기간 총 청구건</p>
            <p className="text-2xl font-black text-gray-900">{billingData.reduce((a, b) => a + b.claimCount, 0).toLocaleString()} <span className="text-sm font-bold text-gray-500">건</span></p>
          </div>
        </div>
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 rounded-[2rem] shadow-lg flex items-center gap-5 text-white">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-xs font-black text-indigo-100 uppercase tracking-wider mb-1">예상 과금(구독) 매출액</p>
            <p className="text-2xl font-black">₩ {billingData.reduce((a, b) => a + b.totalBillingFee, 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* 필터 영역 */}
      <div className="bg-white p-4 md:p-5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-4">
        <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-xl border border-gray-100 w-full md:w-auto">
            <Calendar className="text-gray-400 shrink-0" size={18} />
            <input type="date" className="bg-transparent outline-none text-sm font-bold text-gray-700 w-full" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
            <span className="text-gray-300 font-bold">~</span>
            <input type="date" className="bg-transparent outline-none text-sm font-bold text-gray-700 w-full" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
          </div>
          
          <div className="flex gap-1 w-full md:w-auto">
            <button onClick={() => setQuickDate('thisMonth')} className="flex-1 px-4 py-3 text-xs font-black bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all whitespace-nowrap">이번 달</button>
            <button onClick={() => setQuickDate('prevMonth')} className="flex-1 px-4 py-3 text-xs font-black bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all whitespace-nowrap">지난 달</button>
            <button onClick={() => setQuickDate('today')} className="flex-1 px-4 py-3 text-xs font-black bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all whitespace-nowrap">오늘</button>
          </div>
        </div>

        <div className="relative w-full xl:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600" size={18} />
          <input type="text" placeholder="업체명 또는 대표자 검색..." className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-300 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* 업체별 과금 리스트 테이블 */}
      <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <h3 className="font-black text-gray-900 flex items-center gap-2">
            <Filter size={18} className="text-gray-400"/> 조회된 업체 과금 명세
          </h3>
          <span className="text-xs font-bold text-gray-400 bg-white px-3 py-1 rounded-lg border border-gray-200">
            기본료 {PRICING.BASE_FEE.toLocaleString()}원 / {PRICING.FREE_CLAIMS}건 초과 시 건당 {PRICING.FEE_PER_CLAIM.toLocaleString()}원
          </span>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap min-w-[800px]">
            <thead className="bg-white border-b border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">업체 정보</th>
                <th className="px-6 py-4">연락처 / 이메일</th>
                <th className="px-6 py-4 text-center">기간 내 청구건</th>
                <th className="px-6 py-4 text-right">고객 청구 누적액</th>
                <th className="px-6 py-4 text-right bg-indigo-50/30 text-indigo-700">과금액 (구독료)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredBillingData.length > 0 ? filteredBillingData.map((comp) => (
                <tr key={comp.company_id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <div 
                      className="font-black text-indigo-600 text-sm cursor-pointer hover:underline underline-offset-4 w-fit"
                      onClick={() => openCompanyDetails(comp)} // 💡 모달 오픈 이벤트 추가
                    >
                      {comp.company_name || '미설정 업체'}
                    </div>
                    <div className="text-[11px] text-gray-500 font-bold mt-1">대표: {comp.representative_name || '-'} | {comp.business_number || '사업자번호 미등록'}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm font-bold text-gray-700">{comp.contact_number || '-'}</div>
                    <div className="text-xs text-gray-400">{comp.email || '-'}</div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="inline-flex items-baseline gap-1 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                      <span className="font-black text-indigo-600 text-base">{comp.claimCount}</span>
                      <span className="text-[10px] text-gray-400 font-bold">건</span>
                    </div>
                    {comp.extraClaims > 0 && (
                      <div className="text-[10px] font-bold text-rose-500 mt-1">({comp.extraClaims}건 초과)</div>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <span className="font-mono text-sm font-bold text-gray-600">₩ {comp.totalClaimAmount.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-5 text-right bg-indigo-50/10">
                    <span className="font-mono text-lg font-black text-indigo-700">₩ {comp.totalBillingFee.toLocaleString()}</span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="py-16 text-center">
                    <AlertCircle size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-400 font-bold">조건에 맞는 데이터가 없습니다.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}