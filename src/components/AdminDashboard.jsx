import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Building2, Receipt, Calendar, Search, 
  Download, Filter, TrendingUp, AlertCircle, 
  Clock, CheckCircle, X, FileText, Trash2, Award, Settings, Loader2, ArrowRight
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

// 💡 새로운 요금 정책 고정값 세팅 (초과 단가 및 무료 제공량)
const getPlanDetails = (planId) => {
  switch(planId) {
    case 'starter': return { name: '스타터 (기본)', baseFee: 0, freeLimit: 2, overageRate: 5000 };
    case 'standard': return { name: '스탠다드', baseFee: 49000, freeLimit: 10, overageRate: 3000 };
    case 'pro': return { name: '프로', baseFee: 99000, freeLimit: 30, overageRate: 2000 };
    case 'enterprise': return { name: '엔터프라이즈', baseFee: 0, freeLimit: 999999, overageRate: 0 };
    case 'free': return { name: '스타터(구)', baseFee: 0, freeLimit: 2, overageRate: 5000 };
    case 'basic': return { name: '스탠다드(구)', baseFee: 49000, freeLimit: 10, overageRate: 3000 };
    default: return { name: '스타터', baseFee: 0, freeLimit: 2, overageRate: 5000 };
  }
};

// 💡 플랜 동기화 핵심 로직
const resolveActivePlan = (compData) => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  let currentPlan = compData.subscription_plan || 'starter';
  let pendingPlan = compData.pending_plan || null;

  if (pendingPlan && compData.next_plan_apply_date && todayStr >= compData.next_plan_apply_date) {
    currentPlan = pendingPlan;
    pendingPlan = null;
  }

  currentPlan = currentPlan === 'free' ? 'starter' : (currentPlan === 'basic' ? 'standard' : currentPlan);
  if (pendingPlan) {
    pendingPlan = pendingPlan === 'free' ? 'starter' : (pendingPlan === 'basic' ? 'standard' : pendingPlan);
  }

  const signUpDate = compData.created_at ? new Date(compData.created_at) : today;
  const isFirstMonth = (today.getFullYear() === signUpDate.getFullYear() && today.getMonth() === signUpDate.getMonth());
  
  if (!compData.plan_changed_at && isFirstMonth) {
    currentPlan = 'starter';
  }

  return { activePlan: currentPlan, pendingPlan, isFirstMonth: (!compData.plan_changed_at && isFirstMonth) };
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [activeTab, setActiveTab] = useState('dashboard');

  const [companies, setCompanies] = useState([]);
  const [billingData, setBillingData] = useState([]);
  const [pendingCompanies, setPendingCompanies] = useState([]); 
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [invoiceForm, setInvoiceForm] = useState({
    date: '',
    amount: 0,
    status: 'pending',
    selectedPlan: '' 
  });

  const [appSettings, setAppSettings] = useState({ id: 1, terms_of_service: '', privacy_policy: '' });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const today = new Date();
  const [dateRange, setDateRange] = useState({
    start: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
    end: new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
  });

  const PLAN_MAP = {
    starter: { name: '스타터', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    standard: { name: '스탠다드', color: 'bg-blue-50 text-blue-700 border-blue-100' },
    pro: { name: '프로', color: 'bg-purple-50 text-purple-700 border-purple-100' },
    enterprise: { name: '엔터프라이즈', color: 'bg-rose-50 text-rose-700 border-rose-100' }
  };

  const PAYMENT_STATUS_MAP = {
    pending: { name: '발행대기', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    unpaid: { name: '미입금', color: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' },
    paid: { name: '수금완료', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  };

  useEffect(() => {
    checkAdminAndFetchData();
    
    const handleFocus = () => checkAdminAndFetchData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [dateRange]);

  const fetchPendingCompanies = async () => {
    const { data, error } = await supabase
      .from('company_profile') 
      .select('*')
      .eq('is_approved', false)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPendingCompanies(data);
    }
  };

  const fetchAppSettings = async () => {
    try {
      const { data, error } = await supabase.from('app_settings').select('*').limit(1).maybeSingle();
      if (data) setAppSettings(data);
    } catch (err) {
      console.error("앱 설정 로드 실패:", err);
    }
  };

  async function checkAdminAndFetchData() {
    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) { navigate('/login'); return; }

      const { data: adminCheck } = await supabase.from('admin_users').select('*').eq('id', session.user.id).maybeSingle();
      if (!adminCheck) {
        alert('최고 관리자 권한이 없습니다. 접근이 차단되었습니다.');
        navigate('/');
        return;
      }
      setIsAdmin(true);

      await Promise.all([
        fetchPendingCompanies(),
        fetchAppSettings()
      ]);

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
        
        // 💡 동기화 로직 적용
        const { activePlan, pendingPlan, isFirstMonth } = resolveActivePlan(company);
        const planDetails = getPlanDetails(activePlan);

        const extraClaims = Math.max(0, claimCount - planDetails.freeLimit);
        const totalBillingFee = planDetails.baseFee + (extraClaims * planDetails.overageRate);

        const nextActivePlan = pendingPlan || activePlan;
        const nextPlanDetails = getPlanDetails(nextActivePlan);

        return {
          ...company,
          displayPlan: activePlan, 
          pending_plan: pendingPlan,
          isFirstMonth,           
          claimCount,
          totalClaimAmount,
          extraClaims,
          totalBillingFee,
          baseFee: planDetails.baseFee,
          freeLimit: planDetails.freeLimit, 
          overageRate: planDetails.overageRate,
          nextMonthEstimatedFee: nextPlanDetails.baseFee 
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

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const { error } = await supabase.from('app_settings').upsert({
        id: appSettings.id || 1, 
        terms_of_service: appSettings.terms_of_service,
        privacy_policy: appSettings.privacy_policy,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;
      alert('앱 설정(약관 및 정책)이 성공적으로 저장되었습니다.\n신규 회원가입 창에 즉시 반영됩니다.');
    } catch (error) {
      alert('설정 저장 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleApprove = async (companyId, companyName) => {
    if (!window.confirm(`[${companyName}] 업체를 가입 승인하시겠습니까?\n승인 즉시 해당 업체는 로그인이 가능해집니다.`)) return;

    try {
      const { error } = await supabase
        .from('company_profile') 
        .update({ is_approved: true })
        .eq('company_id', companyId);

      if (error) throw error;

      alert(`${companyName} 업체가 성공적으로 승인되었습니다!`);
      await fetchPendingCompanies(); 
      await checkAdminAndFetchData();
    } catch (error) {
      alert('승인 처리 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const handleDeleteCompany = async (companyId, companyName) => {
    if (!window.confirm(`[${companyName}] 업체의 가입 신청을 거절하고 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

    try {
      const { error } = await supabase
        .from('company_profile')
        .delete()
        .eq('company_id', companyId);

      if (error) throw error;

      alert(`${companyName} 업체의 가입 신청이 거절 및 삭제되었습니다.`);
      await fetchPendingCompanies();
      await checkAdminAndFetchData();
    } catch (error) {
      alert('업체 삭제 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const handleSaveInvoiceInfo = async () => {
    if (!selectedCompany) return;
    try {
      const { activePlan: currentPlan } = resolveActivePlan(selectedCompany);
      const newPlan = invoiceForm.selectedPlan || currentPlan;
      
      let updatePayload = {
        tax_invoice_date: invoiceForm.date || null,
        tax_invoice_amount: Number(invoiceForm.amount) || 0,
        payment_status: invoiceForm.status
      };

      if (newPlan !== currentPlan) {
        const currentPlanBase = getPlanDetails(currentPlan).baseFee;
        const newPlanBase = getPlanDetails(newPlan).baseFee;
        
        if (newPlanBase > currentPlanBase) {
          if (window.confirm(`📈 플랜 업그레이드가 감지되었습니다.\n\n[즉시 반영 정책]에 따라 해당 업체의 현재 이용 권한이 즉시 [${getPlanDetails(newPlan).name}] 플랜으로 상향 변경됩니다. 계속하시겠습니까?`)) {
            updatePayload.subscription_plan = newPlan;
            updatePayload.pending_plan = null;
            updatePayload.plan_changed_at = new Date().toISOString();
            updatePayload.next_plan_apply_date = null;
          } else return;
        } else {
          if (window.confirm(`📉 플랜 다운그레이드가 감지되었습니다.\n\n[익월 예약 정책]에 따라 당월은 기존 권한이 유지되며, 다음 달 1일에 맞춰 [${getPlanDetails(newPlan).name}] 플랜으로 자동 전환 예약됩니다. 변경하시겠습니까?`)) {
            updatePayload.pending_plan = newPlan;
            updatePayload.plan_changed_at = new Date().toISOString();
            
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            updatePayload.next_plan_apply_date = nextMonth.toISOString().split('T')[0];
          } else return;
        }
      } else {
        updatePayload.subscription_plan = newPlan;
        updatePayload.pending_plan = null;
        updatePayload.next_plan_apply_date = null;
      }

      const { error } = await supabase
        .from('company_profile')
        .update(updatePayload)
        .eq('company_id', selectedCompany.company_id);

      if (error) throw error;
      alert('업체 정산 약정 및 수금 현황 변경사항이 완벽하게 저장되었습니다.');
      closeModal();
      await checkAdminAndFetchData();
    } catch (error) {
      alert('정보 저장 중 오류가 발생했습니다: ' + error.message);
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
    const headers = ['업체명', '적용플랜', '예약플랜', '대표자', '연락처', '기간내 청구건수/제공한도', '당월 과금액', '익월 고정비 예측', '수금상태'];
    const rows = filteredBillingData.map(c => [
      c.company_name || '미설정',
      PLAN_MAP[c.displayPlan]?.name || '미설정',
      c.pending_plan ? PLAN_MAP[c.pending_plan]?.name : '-',
      c.representative_name || '-',
      c.contact_number || '-',
      `${c.claimCount} / ${c.freeLimit === 999999 ? '무제한' : c.freeLimit}건`, 
      `${c.totalBillingFee}원`,
      `${c.nextMonthEstimatedFee}원`,
      PAYMENT_STATUS_MAP[c.payment_status || 'pending']?.name
    ]);

    let csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `종합_업체_구독과금명세_${dateRange.start}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openCompanyDetails = (company) => {
    setSelectedCompany(company);
    setInvoiceForm({
      date: company.tax_invoice_date || '',
      amount: company.tax_invoice_amount || company.totalBillingFee || 0,
      status: company.payment_status || 'pending',
      selectedPlan: company.pending_plan || company.displayPlan || 'starter'
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCompany(null);
  };

  if (loading) {
    return <div className="h-[80vh] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-20 font-sans relative">
      
      {/* 정산 상세 관리 모달 */}
      {isModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="bg-gray-50 border-b border-gray-100 p-6 flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Building2 className="text-indigo-600" /> 업체 요약 및 정산 관리
              </h2>
              <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-2 gap-y-4 gap-x-4 border-b border-gray-100 pb-5">
                <div className="col-span-2 flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-gray-400 mb-1">업체명</p>
                    <p className="text-lg font-black text-gray-900">{selectedCompany.company_name || '미설정 업체'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 mb-1">플랜 변경 이력</p>
                    <p className="text-[11px] font-bold text-gray-600">
                      {selectedCompany.plan_changed_at ? new Date(selectedCompany.plan_changed_at).toLocaleString('ko-KR') : '변경 이력 없음'}
                    </p>
                  </div>
                </div>
                
                <div className="col-span-2 bg-slate-50 p-4 rounded-xl border border-gray-200">
                  <label className="block text-[11px] font-black text-gray-500 mb-2 uppercase tracking-wider">구독 멤버십 플랜 변경 약정</label>
                  <select 
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-black outline-none focus:border-indigo-500 text-gray-800"
                    value={invoiceForm.selectedPlan}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, selectedPlan: e.target.value })}
                  >
                    <option value="starter">스타터 (월 2건 무료 / 초과시 5,000원)</option>
                    <option value="standard">스탠다드 (월 기본 49,000원 / 10건 제공 / 초과시 3,000원)</option>
                    <option value="pro">프로 (월 기본 99,000원 / 30건 제공 / 초과시 2,000원)</option>
                    <option value="enterprise">엔터프라이즈 (별도 협의 맞춤형 무제한)</option>
                  </select>
                  
                  <div className="mt-3 flex flex-col md:flex-row items-start md:items-center justify-between text-[11px] font-bold text-slate-500 border-t pt-2 border-dashed border-gray-200 gap-1 md:gap-0">
                    <span>당월 마감 고정비: <strong className="text-gray-800 font-mono">₩{getPlanDetails(selectedCompany.displayPlan).baseFee.toLocaleString()}</strong></span>
                    <span className="hidden md:inline-block text-gray-300">|</span>
                    <span>익월 청구 예측비: <strong className="text-indigo-600 font-mono">₩{getPlanDetails(invoiceForm.selectedPlan).baseFee.toLocaleString()}</strong></span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-400 mb-1">대표자명</p>
                  <p className="text-sm font-bold text-gray-700">{selectedCompany.representative_name || '미등록'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-1">사업자등록번호</p>
                  <p className="text-sm font-bold text-gray-700">{selectedCompany.business_number || '미등록'}</p>
                </div>
              </div>

              <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-2xl space-y-4">
                <h4 className="text-sm font-black text-indigo-900 flex items-center gap-1.5">
                  <Receipt size={16} /> 과금 세금계산서 및 입금 등록
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">수금 상태 관리</label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.keys(PAYMENT_STATUS_MAP).map((statusKey) => (
                        <button
                          key={statusKey}
                          type="button"
                          onClick={() => setInvoiceForm({ ...invoiceForm, status: statusKey })}
                          className={`py-2 px-3 border text-xs font-black rounded-xl transition-all ${
                            invoiceForm.status === statusKey
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                              : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {PAYMENT_STATUS_MAP[statusKey].name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">계산서 발행 일자</label>
                    <input 
                      type="date" 
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 transition-colors"
                      value={invoiceForm.date}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, date: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">계산서 발행 금액</label>
                    <input 
                      type="number" 
                      placeholder="금액 입력"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-indigo-500 transition-colors"
                      value={invoiceForm.amount}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveInvoiceInfo}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-black text-xs transition-colors shadow-lg shadow-indigo-100"
                >
                  변경 약정 정보 및 정산현황 업데이트 저장
                </button>
              </div>
              
              {selectedCompany.biz_reg_image && (
                <div className="pt-2">
                  {selectedCompany.biz_reg_image.startsWith('data:') ? (
                    <a href={selectedCompany.biz_reg_image} download={`${selectedCompany.company_name}_사업자등록증.jpg`} className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 py-3 rounded-xl font-bold text-sm transition-colors">
                      <FileText size={18} /> 기존 첨부된 사업자등록증 다운로드
                    </a>
                  ) : (
                    <a href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/biz-licenses/${selectedCompany.biz_reg_image}`} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 py-3 rounded-xl font-bold text-sm transition-colors">
                      <FileText size={18} /> 첨부된 사업자등록증 보기
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 헤더 섹션 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-gray-900 p-6 md:p-8 rounded-[2rem] text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-bold mb-2">
            <ShieldCheck size={20} /> SUPER ADMIN
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter">통합 관리 대시보드</h1>
          <p className="text-gray-400 mt-2 font-medium">업체 가입 승인, 매월 자동 정산 및 앱 설정을 통합 관리합니다.</p>
        </div>
      </div>

      {/* 관리자 메뉴 탭 분리 */}
      <div className="flex gap-2 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`pb-4 px-4 font-black text-[15px] transition-all relative ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          정산 및 업체 관리
          {activeTab === 'dashboard' && <span className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-lg"></span>}
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`pb-4 px-4 font-black text-[15px] transition-all relative ${activeTab === 'settings' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          앱 정책 및 약관 설정
          {activeTab === 'settings' && <span className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-lg"></span>}
        </button>
      </div>

      {/* 탭 1: 대시보드 화면 */}
      {activeTab === 'dashboard' ? (
        <div className="space-y-6 md:space-y-8 animate-in fade-in">
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
                <table className="w-full text-left whitespace-nowrap min-w-[900px]">
                  <thead className="bg-gray-50 text-[12px] font-black text-gray-500 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4 rounded-l-xl">업체명</th>
                      <th className="px-6 py-4">선택 요금제</th>
                      <th className="px-6 py-4">대표자</th>
                      <th className="px-6 py-4">사업자등록번호</th>
                      <th className="px-6 py-4">아이디(이메일)</th>
                      <th className="px-6 py-4 rounded-r-xl text-right">승인 관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pendingCompanies.map(company => (
                      <tr key={company.company_id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-black text-indigo-600 cursor-pointer hover:underline underline-offset-4" onClick={() => openCompanyDetails({ ...company, displayPlan: company.subscription_plan })}>
                          {company.company_name}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 border rounded-lg text-[11px] font-black uppercase tracking-wider ${PLAN_MAP[company.subscription_plan]?.color || 'bg-gray-100 text-gray-700'}`}>
                            {(PLAN_MAP[company.subscription_plan]?.name || '스타터').split(' ')[0]}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-600">{company.representative_name}</td>
                        <td className="px-6 py-4 font-bold text-gray-600">{company.business_number}</td>
                        <td className="px-6 py-4 font-bold text-gray-400">{company.email}</td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                          <button onClick={() => handleApprove(company.company_id, company.company_name)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1 transition-all shadow-md shadow-emerald-100 hover:scale-[1.02]">
                            <CheckCircle size={14} /> 승인
                          </button>
                          <button onClick={() => handleDeleteCompany(company.company_id, company.company_name)} className="bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-100 px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1 transition-all hover:scale-[1.02]">
                            <Trash2 size={14} /> 거절
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

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
                <p className="text-xs font-black text-indigo-100 uppercase tracking-wider mb-1">예상 당월 결제 매출액</p>
                <p className="text-2xl font-black">₩ {billingData.reduce((a, b) => a + b.totalBillingFee, 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

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

            <div className="flex gap-3 w-full xl:w-auto">
              <div className="relative w-full xl:w-80 group flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600" size={18} />
                <input type="text" placeholder="업체명 또는 대표자 검색..." className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-300 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <button onClick={downloadCSV} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap border border-emerald-200">
                <Download size={18} /> CSV 다운로드
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-black text-gray-900 flex items-center gap-2">
                <Filter size={18} className="text-gray-400"/> 조회된 업체 과금 명세
              </h3>
            </div>
            
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left whitespace-nowrap min-w-[1000px]">
                <thead className="bg-white border-b border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">업체 정보</th>
                    <th className="px-6 py-4">연락처 / 이메일</th>
                    <th className="px-6 py-4 text-center">기간 내 청구건 / 기본 제공</th>
                    <th className="px-6 py-4 text-right bg-indigo-50/30 text-indigo-700">당월 과금액 (마감)</th>
                    <th className="px-6 py-4 text-right text-blue-700 bg-blue-50/30">익월 기본료 (예측)</th>
                    <th className="px-6 py-4 text-center">세금계산서 발행 현황</th>
                    <th className="px-6 py-4 text-center">수금 상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredBillingData.length > 0 ? filteredBillingData.map((comp) => (
                    <tr key={comp.company_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-black text-indigo-600 text-sm cursor-pointer hover:underline underline-offset-4" onClick={() => openCompanyDetails(comp)}>
                            {comp.company_name || '미설정 업체'}
                          </div>
                          <span className={`px-1.5 py-0.5 border rounded-md text-[9px] font-black uppercase ${PLAN_MAP[comp.displayPlan]?.color || 'bg-gray-100 text-gray-700'}`}>
                            {PLAN_MAP[comp.displayPlan]?.name.split(' ')[0]}
                          </span>
                          
                          {comp.pending_plan && (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded text-[9px] font-black flex items-center gap-1">
                              익월예약 <ArrowRight size={10}/> {PLAN_MAP[comp.pending_plan]?.name.split(' ')[0]}
                            </span>
                          )}
                          {comp.isFirstMonth && (
                            <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded text-[9px] font-black">신규가입월</span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 font-bold">대표: {comp.representative_name || '-'} | {comp.business_number || '사업자번호 미등록'}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-bold text-gray-700">{comp.contact_number || '-'}</div>
                        <div className="text-xs text-gray-400">{comp.email || '-'}</div>
                      </td>
                      
                      {/* 💡 실시간 사용 건수 / 한도 표시 */}
                      <td className="px-6 py-5 text-center">
                        <div className="inline-flex items-baseline gap-1 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                          <span className={`font-black text-base ${comp.extraClaims > 0 ? 'text-rose-600' : 'text-indigo-600'}`}>
                            {comp.claimCount}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold">
                            / {comp.freeLimit === 999999 ? '무제한' : `${comp.freeLimit}건`}
                          </span>
                        </div>
                        {comp.extraClaims > 0 && (
                          <div className="text-[10px] font-bold text-rose-500 mt-1">({comp.extraClaims}건 초과 / +{(comp.extraClaims * comp.overageRate).toLocaleString()}원)</div>
                        )}
                      </td>

                      <td className="px-6 py-5 text-right bg-indigo-50/10">
                        <span className="font-mono text-base font-black text-indigo-700">₩ {comp.totalBillingFee.toLocaleString()}</span>
                      </td>
                      
                      <td className="px-6 py-5 text-right bg-blue-50/10">
                        <span className="font-mono text-base font-black text-blue-700">₩ {comp.nextMonthEstimatedFee.toLocaleString()}</span>
                      </td>
                      
                      <td className="px-6 py-5 text-center">
                        {comp.tax_invoice_date ? (
                          <div className="space-y-0.5">
                            <div className="text-xs font-mono font-black text-gray-900">₩ {Number(comp.tax_invoice_amount).toLocaleString()}</div>
                            <div className="text-[10px] font-bold text-gray-400">발행일: {comp.tax_invoice_date}</div>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-dashed">미발행</span>
                        )}
                      </td>

                      <td className="px-6 py-5 text-center">
                        <span className={`px-3 py-1 border rounded-xl text-xs font-black tracking-wide ${PAYMENT_STATUS_MAP[comp.payment_status || 'pending']?.color}`}>
                          {PAYMENT_STATUS_MAP[comp.payment_status || 'pending']?.name}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="7" className="py-16 text-center">
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
      ) : (
        /* 탭 2: 앱 설정 관리 화면 */
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm animate-in fade-in">
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Settings className="text-indigo-600" /> 앱 정책 및 약관 설정
              </h3>
              <p className="text-sm font-bold text-gray-400 mt-1">회원가입 시 노출되는 이용약관과 개인정보 처리방침 내용을 관리합니다.</p>
            </div>
            <button 
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSavingSettings ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
              변경사항 저장
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-black text-gray-700">
                <FileText size={18} className="text-blue-500" /> 이용약관 (Terms of Service)
              </label>
              <textarea
                className="w-full h-[500px] bg-gray-50 border border-gray-200 rounded-2xl p-5 text-sm leading-relaxed font-medium text-gray-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all custom-scrollbar resize-none"
                placeholder="이용약관 내용을 이곳에 입력하세요..."
                value={appSettings.terms_of_service}
                onChange={(e) => setAppSettings({ ...appSettings, terms_of_service: e.target.value })}
              />
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-black text-gray-700">
                <ShieldCheck size={18} className="text-blue-500" /> 개인정보 처리방침 (Privacy Policy)
              </label>
              <textarea
                className="w-full h-[500px] bg-gray-50 border border-gray-200 rounded-2xl p-5 text-sm leading-relaxed font-medium text-gray-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all custom-scrollbar resize-none"
                placeholder="개인정보 처리방침 내용을 이곳에 입력하세요..."
                value={appSettings.privacy_policy}
                onChange={(e) => setAppSettings({ ...appSettings, privacy_policy: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}