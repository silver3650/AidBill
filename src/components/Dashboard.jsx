import React, { useState, useEffect } from 'react';
import { 
  Users, FileText, Banknote, Clock, 
  TrendingUp, PieChart, Activity,
  ChevronRight, Package
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { format, subDays, subMonths } from 'date-fns';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

// 💡 체험판 모델이 적용된 요금 정책 상세 설정
const getPlanDetails = (planId) => {
  switch(planId) {
    case 'starter': return { id: 'starter', name: '스타터 (체험판)', baseFee: 0, freeLimit: 2, overageRate: 5000 };
    case 'standard': return { id: 'standard', name: '스탠다드', baseFee: 49000, freeLimit: 10, overageRate: 3000 };
    case 'pro': return { id: 'pro', name: '프로', baseFee: 99000, freeLimit: 30, overageRate: 2000 };
    case 'enterprise': return { id: 'enterprise', name: '엔터프라이즈', baseFee: 0, freeLimit: 999999, overageRate: 0 };
    case 'free': return { id: 'starter', name: '스타터(구)', baseFee: 0, freeLimit: 2, overageRate: 5000 };
    case 'basic': return { id: 'standard', name: '스탠다드(구)', baseFee: 49000, freeLimit: 10, overageRate: 3000 };
    default: return { id: 'starter', name: '스타터 (체험판)', baseFee: 0, freeLimit: 2, overageRate: 5000 };
  }
};

// 💡 체험판 만료 여부를 계산하는 핵심 로직
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
  
  // 가입월 + 익월 말일까지 계산 (Day 0은 이전 달의 마지막 날을 의미)
  const signUpDate = compData.created_at ? new Date(compData.created_at) : today;
  const trialEndDate = new Date(signUpDate.getFullYear(), signUpDate.getMonth() + 2, 0); 
  const isTrialExpired = (currentPlan === 'starter' && today > trialEndDate);

  return { activePlan: currentPlan, isTrialExpired };
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    thisMonth: { receipts: 0, claims: 0, amount: 0 },
    prevMonth: { receipts: 0, claims: 0, amount: 0 },
    cumulative: { claims: 0, amount: 0 },
    unsettled: { count: 0, amount: 0 },
    statusCounts: { '대기 중': 0, '배송 중': 0, '교부 완료': 0, '청구 완료': 0, '정산 완료': 0 },
    totalActiveMonth: 0
  });
  
  const [rawClaims, setRawClaims] = useState([]); 
  const [recentClaims, setRecentClaims] = useState([]);
  const [chartFilter, setChartFilter] = useState('monthly');
  const [chartData, setChartData] = useState([]);
  const [monthToggle, setMonthToggle] = useState('this'); 
  
  const [planInfo, setPlanInfo] = useState(getPlanDetails('starter'));
  const [isTrialExpired, setIsTrialExpired] = useState(false);

  const fetchDashboardData = async (user) => {
    try {
      const [claimsRes, custRes, compRes] = await Promise.all([
        supabase.from('claims').select('*').eq('company_id', user.id).order('created_at', { ascending: false }),
        supabase.from('customers').select('id, name').eq('company_id', user.id),
        supabase.from('company_profile').select('*').eq('company_id', user.id).maybeSingle()
      ]);

      if (claimsRes.error) throw claimsRes.error;
      if (custRes.error) throw custRes.error;

      const claimsData = claimsRes.data || [];
      const custData = custRes.data || [];
      const compData = compRes.data || {};

      const { activePlan, isTrialExpired: expiredCheck } = resolveActivePlan(compData);
      setPlanInfo(getPlanDetails(activePlan));
      setIsTrialExpired(expiredCheck);

      const mergedClaims = claimsData.map(claim => {
        const matchedCust = custData.find(c => String(c.id) === String(claim.customer_id));
        return {
          ...claim,
          customerName: matchedCust ? matchedCust.name : '대상자 미상'
        };
      });
      
      setRawClaims(mergedClaims);
    } catch (e) {
      console.error("대시보드 데이터 로드 에러:", e);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let timeoutId;
    let currentUser = null;

    async function initializeDashboard() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session || !session.user) {
          if (isMounted) setLoading(false);
          return; 
        }
        
        currentUser = session.user;
        await fetchDashboardData(currentUser);

      } catch(e) {
        console.error("대시보드 초기화 에러:", e);
      } finally {
        if (isMounted) setLoading(false); 
      }
    }
    
    setLoading(true);
    initializeDashboard();

    const handleFocus = () => {
      if (currentUser) fetchDashboardData(currentUser);
    };
    window.addEventListener('focus', handleFocus);

    timeoutId = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 8000);

    return () => { 
      isMounted = false; 
      clearTimeout(timeoutId);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    if (loading || !rawClaims) return;

    const safeClaims = rawClaims;
    const today = new Date();
    const thisMonthStr = format(today, 'yyyy-MM');
    const prevMonthStr = format(subMonths(today, 1), 'yyyy-MM');

    const statusMap = { '대기 중': 0, '배송 중': 0, '교부 완료': 0, '청구 완료': 0, '정산 완료': 0 };
    let unsettledCount = 0, unsettledAmount = 0;
    let cumulativeClaims = 0, cumulativeAmount = 0;

    const thisMonthData = { receipts: 0, claims: 0, amount: 0 };
    const prevMonthData = { receipts: 0, claims: 0, amount: 0 };

    safeClaims.forEach(c => {
      const claimDateStr = c.claim_date || (c.created_at ? c.created_at.split('T')[0] : '');
      const amount = Number(c.total_amount) || 0;
      const currentStatus = c.status || '대기 중';
      
      const isClaimed = currentStatus.includes('청구 완료');
      const isSettled = currentStatus === '정산 완료';

      if (isClaimed) {
        statusMap['청구 완료']++;
      } else if (statusMap[currentStatus] !== undefined) {
        statusMap[currentStatus]++;
      } else {
        statusMap['대기 중']++;
      }

      if (isClaimed) {
        unsettledCount++;
        unsettledAmount += amount;
      }

      cumulativeClaims++;
      cumulativeAmount += amount;

      if (claimDateStr.startsWith(thisMonthStr)) {
        thisMonthData.receipts++;
        thisMonthData.amount += amount;
        if (isClaimed || isSettled) thisMonthData.claims++;
      }
      if (claimDateStr.startsWith(prevMonthStr)) {
        prevMonthData.receipts++;
        prevMonthData.amount += amount;
        if (isClaimed || isSettled) prevMonthData.claims++;
      }
    });

    setStats({
      thisMonth: thisMonthData,
      prevMonth: prevMonthData,
      cumulative: { claims: cumulativeClaims, amount: cumulativeAmount },
      unsettled: { count: unsettledCount, amount: unsettledAmount },
      statusCounts: statusMap,
      totalActiveMonth: safeClaims.filter(c => {
        const dStr = c.claim_date || c.created_at || '';
        return dStr.startsWith(thisMonthStr);
      }).length
    });

    setRecentClaims(safeClaims.slice(0, 5));

    const trendData = [];
    if (chartFilter === 'weekly') {
      for (let i = 6; i >= 0; i--) {
        const d = subDays(today, i);
        const fullDate = format(d, 'yyyy-MM-dd');
        const dayClaims = safeClaims.filter(c => {
          const dStr = c.claim_date || (c.created_at ? c.created_at.split('T')[0] : '');
          return dStr === fullDate;
        });
        trendData.push({
          label: format(d, 'MM/dd'),
          count: dayClaims.length,
          amount: dayClaims.reduce((acc, cur) => acc + (Number(cur.total_amount) || 0), 0)
        });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(today, i);
        const monthStr = format(d, 'yyyy-MM');
        const monthClaims = safeClaims.filter(c => {
          const dStr = c.claim_date || c.created_at || '';
          return dStr.startsWith(monthStr);
        });
        trendData.push({
          label: format(d, 'MM월'),
          count: monthClaims.length,
          amount: monthClaims.reduce((acc, cur) => acc + (Number(cur.total_amount) || 0), 0)
        });
      }
    }
    setChartData(trendData);

  }, [rawClaims, chartFilter, loading]);

  if (loading) {
    return (
      <div className="h-full min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const activeData = monthToggle === 'this' ? stats.thisMonth : stats.prevMonth;

  let usageSubText = '';
  let isOverLimit = false;

  // 💡 체험판 만료 시 강제 경고 메시지 출력
  if (planInfo.id === 'starter' && isTrialExpired) {
    isOverLimit = true;
    usageSubText = '🔥 체험판 이용 기간 만료 (스탠다드 이상 업그레이드 필수)';
  } else if (planInfo.id !== 'enterprise') {
    const overage = Math.max(0, activeData.receipts - planInfo.freeLimit);
    if (overage > 0) {
      isOverLimit = true;
      usageSubText = `🔥 무료 한도 초과 (+${overage}건) / 초과 건당 ${planInfo.overageRate.toLocaleString()}원 과금`;
    } else {
      usageSubText = `잔여 무료 건수: ${planInfo.freeLimit - activeData.receipts}건 남음`;
    }
  } else {
     usageSubText = '무제한 요금제 이용 중';
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-10 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter">대시보드</h1>
          <p className="text-sm md:text-base text-gray-500 mt-2 font-medium">실시간 접수/청구 및 파이프라인 현황입니다.</p>
        </div>
        
        <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-full md:w-auto">
          <button 
            onClick={() => setMonthToggle('this')}
            className={`flex-1 md:flex-none px-6 py-2.5 text-sm font-black transition-all rounded-lg ${monthToggle === 'this' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-400 hover:text-gray-700'}`}
          >
            이번 달
          </button>
          <button 
            onClick={() => setMonthToggle('prev')}
            className={`flex-1 md:flex-none px-6 py-2.5 text-sm font-black transition-all rounded-lg ${monthToggle === 'prev' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-400 hover:text-gray-700'}`}
          >
            지난 달
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard 
          title={`${monthToggle === 'this' ? '이번 달' : '지난 달'} 접수건 (${planInfo.name})`} 
          value={activeData.receipts.toLocaleString()} 
          unit={planInfo.id === 'enterprise' ? '건' : ` / ${planInfo.freeLimit} 건`} 
          subText={usageSubText}
          icon={<Package className={isOverLimit ? "text-rose-600" : "text-blue-600"} />} 
          color={isOverLimit ? "bg-rose-50 border border-rose-100" : "bg-blue-50"} 
          valueColor={isOverLimit ? "text-rose-600" : "text-gray-900"}
        />
        
        <StatCard 
          title={`${monthToggle === 'this' ? '이번 달' : '지난 달'} 청구 현황`} 
          value={activeData.amount.toLocaleString()} 
          unit="원" 
          subText={`청구 완료 ${activeData.claims.toLocaleString()}건`} 
          icon={<FileText className="text-indigo-600" />} 
          color="bg-indigo-50" 
        />
        
        <StatCard 
          title="누적 청구 금액" 
          value={stats.cumulative.amount.toLocaleString()} 
          unit="원" 
          subText={`총 누적 접수 ${stats.cumulative.claims.toLocaleString()}건`} 
          icon={<Banknote className="text-emerald-600" />} 
          color="bg-emerald-50" 
        />
        
        <StatCard 
          title="미정산 상태 (청구완료)" 
          value={stats.unsettled.amount.toLocaleString()} 
          unit="원" 
          subText={`정산 대기 ${stats.unsettled.count.toLocaleString()}건`} 
          icon={<Clock className="text-rose-600" />} 
          color="bg-rose-50" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <div className="bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
              <h3 className="text-lg md:text-xl font-black text-gray-900 flex items-center gap-2">
                <TrendingUp className="text-blue-600" size={20} /> 청구(건/금액) 추이
              </h3>
              <div className="flex w-full sm:w-auto bg-gray-100 rounded-xl p-1">
                <button onClick={() => setChartFilter('weekly')} className={`flex-1 sm:flex-none px-4 py-2 text-xs md:text-sm font-bold transition-all ${chartFilter === 'weekly' ? 'bg-white text-blue-600 shadow-sm rounded-lg' : 'text-gray-500 hover:text-gray-700'}`}>주간</button>
                <button onClick={() => setChartFilter('monthly')} className={`flex-1 sm:flex-none px-4 py-2 text-xs md:text-sm font-bold transition-all ${chartFilter === 'monthly' ? 'bg-white text-blue-600 shadow-sm rounded-lg' : 'text-gray-500 hover:text-gray-700'}`}>월간</button>
              </div>
            </div>
            <div className="w-full overflow-x-auto custom-scrollbar pb-2">
              <div className="h-72" style={{ minWidth: '600px' }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <ComposedChart data={chartData} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 'bold' }} dy={10} />
                    <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={30} />
                    <YAxis yAxisId="right" orientation="right" stroke="#10b981" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={45} tickFormatter={(val) => `${(val/10000).toLocaleString()}만`} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }} 
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                      formatter={(value, name) => {
                        if (name === '청구금액') return [`${Number(value).toLocaleString()}원`, '청구금액'];
                        if (name === '청구건수') return [`${Number(value).toLocaleString()}건`, '청구건수'];
                        return [value, name];
                      }} 
                    />
                    <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '12px', fontWeight: 'bold' }} />
                    <Bar yAxisId="left" dataKey="count" name="청구건수" fill="#3b82f6" barSize={16} radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="amount" name="청구금액" stroke="#10b981" strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
            <div className="p-5 md:p-8 border-b border-gray-50 flex justify-between items-center">
              <h3 className="text-lg md:text-xl font-black text-gray-900">최근 청구 내역</h3>
              <Link to="/claims" className="text-blue-600 text-xs md:text-sm font-black flex items-center gap-1 hover:text-blue-800 transition-colors">
                전체보기 <ChevronRight size={16} />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentClaims.length > 0 ? recentClaims.map((claim) => {
                const isClaimed = claim.status?.includes('청구 완료');
                const displayStatus = isClaimed ? '청구 완료' : claim.status || '대기 중';
                return (
                  <div key={claim.id} onClick={() => navigate('/claims')} className="p-4 md:p-6 flex items-center justify-between hover:bg-indigo-50/50 cursor-pointer transition-all group">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 group-hover:bg-white rounded-xl md:rounded-2xl flex items-center justify-center text-gray-400 shrink-0 transition-colors">
                        <Package size={18} className="md:w-5 md:h-5 group-hover:text-indigo-600 transition-colors" />
                      </div>
                      <div>
                        <p className="font-black text-sm md:text-base text-gray-900 leading-tight truncate max-w-[120px] md:max-w-[200px] group-hover:text-indigo-700 transition-colors">
                          {claim.customerName}
                        </p>
                        <p className="text-[10px] md:text-xs text-gray-400 font-bold mt-0.5">
                          {claim.claim_date || (claim.created_at ? claim.created_at.split('T')[0] : '날짜 없음')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end shrink-0">
                      <p className="font-black text-sm md:text-base text-gray-900">₩ {Number(claim.total_amount || 0).toLocaleString()}</p>
                      <span className="text-[9px] md:text-[11px] font-black px-2 py-0.5 md:px-2.5 md:py-1 rounded-md bg-gray-100 text-gray-500 mt-1 inline-block">{displayStatus}</span>
                    </div>
                  </div>
                );
              }) : (
                <div className="p-8 text-center text-xs md:text-sm text-gray-400 font-bold">최근 청구 내역이 없습니다. (청구 관리를 시작해 보세요!)</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 md:space-y-8">
          <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 shadow-xl">
            <h3 className="text-lg md:text-xl font-black text-gray-900 flex items-center gap-2 mb-1 md:mb-2">
              <PieChart className="text-purple-600" size={20} /> 실시간 파이프라인
            </h3>
            <p className="text-[11px] md:text-xs font-bold text-gray-400 mb-6 md:mb-8">실제 진행 상태별 점유율</p>
            <div className="space-y-4 md:space-y-5">
              <StatusRow label="정산 완료" count={stats.statusCounts['정산 완료']} total={stats.cumulative.claims} color="bg-emerald-500" />
              <StatusRow label="청구 완료 (전체)" count={stats.statusCounts['청구 완료']} total={stats.cumulative.claims} color="bg-blue-500" />
              <StatusRow label="교부 완료" count={stats.statusCounts['교부 완료']} total={stats.cumulative.claims} color="bg-purple-500" />
              <StatusRow label="배송 중" count={stats.statusCounts['배송 중']} total={stats.cumulative.claims} color="bg-amber-400" />
              <StatusRow label="대기 중" count={stats.statusCounts['대기 중']} total={stats.cumulative.claims} color="bg-rose-500" />
            </div>
          </div>

          <div className="bg-indigo-600 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl text-white">
            <Activity className="mb-3 md:mb-4" size={24} />
            <h4 className="text-base md:text-lg font-black leading-tight mb-2">업무 효율성 증가</h4>
            <p className="text-indigo-100 text-[11px] md:text-xs font-medium leading-relaxed">
              교부가 완료되었으나 아직 청구 메일이 발송되지 않은 건이 <strong>{stats.statusCounts['교부 완료']}건</strong> 있습니다. 누락되지 않도록 서류를 확인하세요.
            </p>
            <button 
              onClick={() => navigate('/claims')}
              className="mt-5 md:mt-6 w-full py-3.5 md:py-4 bg-white text-indigo-600 rounded-xl md:rounded-2xl font-black text-xs md:text-sm hover:bg-indigo-50 transition-all shadow-lg"
            >
              교부 완료건 (청구 대기) 확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, unit, icon, color, subText, valueColor = "text-gray-900" }) {
  return (
    <div className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20 hover:scale-[1.02] transition-all flex flex-col justify-between relative overflow-hidden">
      <div className="flex justify-between items-start mb-3 md:mb-6">
        <div className={`w-10 h-10 md:w-12 md:h-12 ${color} rounded-xl md:rounded-2xl flex items-center justify-center shrink-0`}>
          <div className="scale-75 md:scale-100">{icon}</div>
        </div>
        {subText && (
          <span className={`hidden xl:inline-block text-[10px] md:text-xs font-bold px-2.5 py-1.5 rounded-lg border ${valueColor === 'text-rose-600' ? 'text-rose-600 bg-rose-50 border-rose-100 animate-pulse' : 'text-gray-500 bg-gray-50 border-gray-100'}`}>
            {subText}
          </span>
        )}
      </div>
      <div>
        <p className="text-gray-400 text-[10px] md:text-xs font-black uppercase tracking-widest mb-0.5 md:mb-1">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className={`text-xl md:text-3xl font-black tracking-tighter truncate ${valueColor}`}>{value}</span>
          <span className="text-[10px] md:text-sm font-bold text-gray-400 whitespace-nowrap">{unit}</span>
        </div>
        {subText && (
          <p className={`xl:hidden text-[9px] font-bold mt-2 truncate break-keep leading-tight ${valueColor === 'text-rose-600' ? 'text-rose-500' : 'text-gray-400'}`}>
            {subText}
          </p>
        )}
      </div>
    </div>
  );
}

function StatusRow({ label, count, total, color }) {
  const percent = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1.5 md:space-y-2">
      <div className="flex justify-between text-[11px] md:text-xs font-black">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-900">{count}건</span>
      </div>
      <div className="w-full h-2 md:h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000 rounded-full`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}