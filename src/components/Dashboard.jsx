import React, { useState, useEffect } from 'react';
import { 
  Users, FileText, Banknote, Clock, 
  TrendingUp, PieChart, Activity,
  ChevronRight, Package 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { format, subDays, subMonths, parseISO } from 'date-fns';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalClaims: 0,
    totalAmount: 0,
    pendingClaims: 0,
    statusCounts: { '대기중': 0, '배송중': 0, '교부완료': 0, '청구완료': 0, '지급완료': 0 },
    thisMonthTotal: 0
  });
  
  const [recentClaims, setRecentClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 차트 필터 상태 ('weekly' | 'monthly')
  const [chartFilter, setChartFilter] = useState('monthly');
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [chartFilter]);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      
      // 1. 데이터 병렬 로드 (대상자 수는 카운트만 가져와 성능 최적화)
      const [
        { count: customerCount },
        { data: claims },
      ] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('claims').select('*, customers(name)').order('created_at', { ascending: false })
      ]);

      const safeClaims = claims || [];

      // 2. 누적 통계 계산
      const totalAmt = safeClaims.reduce((acc, cur) => acc + Number(cur.total_amount || 0), 0);
      
      // '대기중' 상태 계산 (DB 값이 한글이거나 영문일 경우 모두 대응)
      const pending = safeClaims.filter(c => 
        c.status === '대기중' || c.status === 'not_claimed' || c.status === 'before_delivery'
      ).length;

      // 3. 상태별 분포 계산 (이번달 기준)
      const today = new Date();
      const thisMonthStr = format(today, 'yyyy-MM');
      
      const thisMonthClaims = safeClaims.filter(c => {
        const dateStr = c.claim_date || c.created_at;
        return dateStr && dateStr.startsWith(thisMonthStr);
      });

      const statusMap = { '대기중': 0, '배송중': 0, '교부완료': 0, '청구완료': 0, '지급완료': 0 };
      
      thisMonthClaims.forEach(c => {
        // 한글 상태명 매칭 또는 기존 영문 상태명 변환
        if (statusMap[c.status] !== undefined) {
          statusMap[c.status]++;
        } else if (c.status === 'not_claimed' || c.status === 'before_delivery') {
          statusMap['대기중']++;
        } else if (c.status === 'claimed') {
          statusMap['청구완료']++;
        } else if (c.status === 'delivered') {
          statusMap['교부완료']++;
        }
      });

      setStats({
        totalCustomers: customerCount || 0,
        totalClaims: safeClaims.length,
        totalAmount: totalAmt,
        pendingClaims: pending,
        statusCounts: statusMap,
        thisMonthTotal: thisMonthClaims.length
      });

      // 4. 최근 청구 내역 5건
      setRecentClaims(safeClaims.slice(0, 5));

      // 5. 차트 데이터 가공 (건수 & 금액 추이)
      const trendData = [];
      if (chartFilter === 'weekly') {
        // 최근 7일
        for (let i = 6; i >= 0; i--) {
          const d = subDays(today, i);
          const dateLabel = format(d, 'MM/dd');
          const fullDate = format(d, 'yyyy-MM-dd');
          
          const dayClaims = safeClaims.filter(c => (c.claim_date || c.created_at?.split('T')[0]) === fullDate);
          trendData.push({
            label: dateLabel,
            count: dayClaims.length,
            amount: dayClaims.reduce((acc, cur) => acc + Number(cur.total_amount || 0), 0)
          });
        }
      } else {
        // 최근 6개월
        for (let i = 5; i >= 0; i--) {
          const d = subMonths(today, i);
          const monthStr = format(d, 'yyyy-MM');
          const labelStr = format(d, 'MM월');
          
          const monthClaims = safeClaims.filter(c => (c.claim_date || c.created_at)?.startsWith(monthStr));
          trendData.push({
            label: labelStr,
            count: monthClaims.length,
            amount: monthClaims.reduce((acc, cur) => acc + Number(cur.total_amount || 0), 0)
          });
        }
      }
      setChartData(trendData);
      
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="h-full min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      {/* 상단 헤더 */}
      <div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tighter">대시보드</h1>
        <p className="text-gray-500 mt-2 font-medium">실시간 데이터 요약 및 분석 현황입니다.</p>
      </div>

      {/* 요약 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="누적 대상자" value={stats.totalCustomers.toLocaleString()} unit="명" icon={<Users className="text-blue-600" />} color="bg-blue-50" />
        <StatCard title="누적 청구건수" value={stats.totalClaims.toLocaleString()} unit="건" icon={<FileText className="text-purple-600" />} color="bg-purple-50" />
        <StatCard title="누적 청구금액" value={stats.totalAmount.toLocaleString()} unit="원" icon={<Banknote className="text-emerald-600" />} color="bg-emerald-50" />
        <StatCard title="대기중" value={stats.pendingClaims.toLocaleString()} unit="건" icon={<Clock className="text-orange-600" />} color="bg-orange-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 청구 현황 차트 영역 (좌측 2칸) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <TrendingUp className="text-blue-600" size={20} /> 청구(건/금액) 추이
              </h3>
              
              {/* 💡 기간 설정 필터 (주간 / 월간) */}
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button 
                  onClick={() => setChartFilter('weekly')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${chartFilter === 'weekly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  주간
                </button>
                <button 
                  onClick={() => setChartFilter('monthly')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${chartFilter === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  월간
                </button>
              </div>
            </div>

            {/* 💡 실제 연동된 듀얼 축 차트 (Recharts) */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 'bold' }} dy={10} />
                  
                  {/* 건수 Y축 (좌측) */}
                  <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  {/* 금액 Y축 (우측) */}
                  <YAxis yAxisId="right" orientation="right" stroke="#10b981" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(val) => `${(val/10000).toLocaleString()}만`} />
                  
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value, name) => [
                      name === 'amount' ? `${value.toLocaleString()} 원` : `${value} 건`, 
                      name === 'amount' ? '청구금액' : '청구건수'
                    ]}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 'bold' }} />
                  <Bar yAxisId="left" dataKey="count" name="청구건수" fill="#3b82f6" barSize={24} radius={[6, 6, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="amount" name="청구금액" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 최근 청구 리스트 */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-gray-900">최근 청구 내역</h3>
              {/* 💡 청구관리 페이지로 라우팅 링크 (App.js의 라우트 경로명에 맞춰 '/claims' 수정 가능) */}
              <Link to="/claims" className="text-blue-600 text-sm font-black flex items-center gap-1 hover:text-blue-800 transition-colors">
                전체보기 <ChevronRight size={16} />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentClaims.length > 0 ? recentClaims.map((claim) => (
                <div key={claim.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">
                      <Package size={20} />
                    </div>
                    <div>
                      <p className="font-black text-gray-900 leading-tight">{claim.customers?.name || '이름 없음'}</p>
                      <p className="text-xs text-gray-400 font-bold mt-0.5">{claim.claim_date || claim.created_at.split('T')[0]}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-gray-900">₩ {Number(claim.total_amount || 0).toLocaleString()}</p>
                    <span className="text-[11px] font-black px-2.5 py-1 rounded-md bg-gray-100 text-gray-500 mt-1 inline-block">
                      {claim.status === 'not_claimed' ? '대기중' : 
                       claim.status === 'claimed' ? '청구완료' : claim.status}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center text-gray-400 font-bold">최근 청구 내역이 없습니다.</div>
              )}
            </div>
          </div>
        </div>

        {/* 상태별 분포 및 알림 (우측 1칸) */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-2">
              <PieChart className="text-purple-600" size={20} /> 상태별 분포
            </h3>
            <p className="text-xs font-bold text-gray-400 mb-8">이번달 기준 ({stats.thisMonthTotal}건)</p>
            
            {/* 💡 요청하신 이번달 기준 5가지 세부 상태 적용 */}
            <div className="space-y-5">
              <StatusRow label="지급완료" count={stats.statusCounts['지급완료']} total={stats.thisMonthTotal} color="bg-emerald-500" />
              <StatusRow label="청구완료" count={stats.statusCounts['청구완료']} total={stats.thisMonthTotal} color="bg-blue-500" />
              <StatusRow label="교부완료" count={stats.statusCounts['교부완료']} total={stats.thisMonthTotal} color="bg-purple-500" />
              <StatusRow label="배송중" count={stats.statusCounts['배송중']} total={stats.thisMonthTotal} color="bg-amber-400" />
              <StatusRow label="대기중" count={stats.statusCounts['대기중']} total={stats.thisMonthTotal} color="bg-rose-500" />
            </div>
          </div>

          <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl text-white">
            <Activity className="mb-4" size={24} />
            <h4 className="text-lg font-black leading-tight mb-2">업무 효율성 증가</h4>
            <p className="text-indigo-100 text-xs font-medium leading-relaxed">
              최근 한 달간 청구 처리 속도가 이전 대비 향상되었습니다. 대기 중인 {stats.pendingClaims}건의 미처리 서류를 확인해 보세요.
            </p>
            <Link to="/claims">
              <button className="mt-6 w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-sm hover:bg-indigo-50 transition-all">
                대기 목록 확인
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 보조 컴포넌트 ---
function StatCard({ title, value, unit, icon, color }) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20 hover:scale-[1.02] transition-all">
      <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center mb-6`}>
        {icon}
      </div>
      <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">{title}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-black text-gray-900 tracking-tighter truncate">{value}</span>
        <span className="text-sm font-bold text-gray-400 whitespace-nowrap">{unit}</span>
      </div>
    </div>
  );
}

function StatusRow({ label, count, total, color }) {
  const percent = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-black">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-900">{count}건</span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000 rounded-full`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}