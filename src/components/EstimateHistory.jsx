import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Search, Mail, FileText, CheckCircle2, Clock, Trash2, 
  ChevronLeft, ChevronRight, PackageCheck, Loader2, Building, Calendar, RefreshCw 
} from 'lucide-react';

export default function EstimateHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 💡 검색 및 필터 상태 관리
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [dateRange, setDateRange] = useState({ start: '', end: '' }); // 💡 날짜 범위 상태 추가

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const { data, error } = await supabase
        .from('estimate_history')
        .select('*')
        .eq('company_id', user.id)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const toggleOrderStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === '견적 발송' ? '발주 완료' : '견적 발송';
    
    try {
      const { error } = await supabase
        .from('estimate_history')
        .update({ order_status: newStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      setHistory(prev => prev.map(item => 
        item.id === id ? { ...item, order_status: newStatus } : item
      ));
    } catch (err) {
      alert('상태 변경 실패: ' + err.message);
    }
  };

  const deleteHistory = async (id) => {
    if (!window.confirm('이 견적 발송 이력을 삭제하시겠습니까? (삭제 시 복구할 수 없습니다)')) return;
    try {
      const { error } = await supabase.from('estimate_history').delete().eq('id', id);
      if (error) throw error;
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  const formatDateTime = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  // 💡 빠른 날짜 설정 함수 (오늘, 1주일, 1개월)
  const setQuickDate = (type) => {
    const getFormattedDate = (dateObj) => `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    const today = new Date(); 
    const end = getFormattedDate(today); 
    let start = '';
    
    if (type === 'today') { 
      start = end; 
    } else if (type === 'week') { 
      const d = new Date(); d.setDate(d.getDate() - 7); start = getFormattedDate(d); 
    } else if (type === 'month') { 
      const d = new Date(); d.setMonth(d.getMonth() - 1); start = getFormattedDate(d); 
    }
    setDateRange({ start, end });
  };

  // 💡 필터 초기화 함수
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('전체');
    setDateRange({ start: '', end: '' });
    setCurrentPage(1);
  };

  // 💡 복합 필터링 로직 (검색어 + 상태 + 날짜)
  let filteredList = history.filter(h => 
    h.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.items_summary.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  if (statusFilter !== '전체') {
    filteredList = filteredList.filter(h => h.order_status === statusFilter);
  }

  if (dateRange.start && dateRange.end) {
    filteredList = filteredList.filter(h => {
      // sent_at 데이터에서 날짜 부분(YYYY-MM-DD)만 추출하여 비교
      const claimDate = h.sent_at.split('T')[0]; 
      return claimDate >= dateRange.start && claimDate <= dateRange.end;
    });
  }

  // 페이징 처리
  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const currentItems = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">견적서 발송 이력</h1>
          <p className="text-gray-500 mt-2 font-bold text-sm">단독 발송된 견적서 이력을 확인하고 발주(계약) 상태를 관리합니다.</p>
        </div>
      </div>

      {/* 💡 확장된 검색 및 필터 UI 영역 */}
      <div className="flex flex-col xl:flex-row gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm items-center">
        <div className="flex-1 w-full relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600" size={16} />
          <input 
            type="text" placeholder="수신처(기관명) 또는 품목명 검색..." 
            className="w-full pl-10 pr-3 py-3 bg-gray-50 rounded-xl outline-none font-bold text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select 
          className="w-full xl:w-48 p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border-r-8 border-transparent focus:ring-2 focus:ring-indigo-100 transition-all"
          value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
        >
          <option value="전체">모든 상태</option>
          <option value="견적 발송">견적 발송 (미발주)</option>
          <option value="발주 완료">발주 완료 (승인)</option>
        </select>

        {/* 💡 날짜 범위 지정 및 버튼 영역 추가 */}
        <div className="flex flex-wrap md:flex-nowrap justify-start xl:justify-end items-center gap-2 w-full xl:w-auto">
          <div className="flex flex-1 md:flex-none items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl">
            <Calendar className="text-gray-400" size={16} />
            <input type="date" className="bg-transparent outline-none text-xs font-bold text-gray-700 w-full" value={dateRange.start} onChange={e => { setDateRange({...dateRange, start: e.target.value}); setCurrentPage(1); }} />
            <span className="text-gray-300">~</span>
            <input type="date" className="bg-transparent outline-none text-xs font-bold text-gray-700 w-full" value={dateRange.end} onChange={e => { setDateRange({...dateRange, end: e.target.value}); setCurrentPage(1); }} />
          </div>
          <div className="flex gap-1 w-full md:w-auto">
            <button onClick={() => setQuickDate('today')} className="flex-1 px-3 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-indigo-600 shadow-sm transition-colors">오늘</button>
            <button onClick={() => setQuickDate('week')} className="flex-1 px-3 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-indigo-600 shadow-sm transition-colors">1주일</button>
            <button onClick={() => setQuickDate('month')} className="flex-1 px-3 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-indigo-600 shadow-sm transition-colors">1개월</button>
          </div>
          <button onClick={resetFilters} className="px-3 py-2 bg-gray-100 rounded-xl text-xs font-black text-gray-500 hover:bg-gray-200 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap">
            <RefreshCw size={14}/> 초기화
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs font-black text-gray-500 uppercase">
            <tr>
              <th className="py-4 px-6 w-1/6">발송 일시</th>
              <th className="py-4 px-6 w-1/5">수신처 / 기관명</th>
              <th className="py-4 px-6">견적 품목 요약</th>
              <th className="py-4 px-6 w-32 text-right">총 금액</th>
              <th className="py-4 px-6 w-36 text-center">발주 상태</th>
              <th className="py-4 px-6 w-24 text-center">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm font-bold">
            {loading ? (
              <tr><td colSpan="6" className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" /></td></tr>
            ) : currentItems.length > 0 ? (
              currentItems.map((item) => (
                <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="py-4 px-6 text-gray-500 font-mono text-xs">{formatDateTime(item.sent_at)}</td>
                  <td className="py-4 px-6">
                    <div className="text-gray-900 truncate flex items-center gap-1.5"><Building size={14} className="text-gray-400"/> {item.recipient_name}</div>
                    {item.recipient_email && <div className="text-[10px] text-gray-400 font-medium mt-1 truncate"><Mail size={10} className="inline mr-1"/>{item.recipient_email}</div>}
                  </td>
                  <td className="py-4 px-6 text-indigo-900">{item.items_summary}</td>
                  <td className="py-4 px-6 text-right font-black font-mono text-gray-900">₩{item.total_amount?.toLocaleString()}</td>
                  <td className="py-4 px-6 text-center">
                    <button 
                      onClick={() => toggleOrderStatus(item.id, item.order_status)}
                      className={`px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 mx-auto transition-all w-full
                        ${item.order_status === '발주 완료' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200' : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'}`}
                    >
                      {item.order_status === '발주 완료' ? <><PackageCheck size={14}/> 발주 완료</> : <><Clock size={14}/> 견적 발송</>}
                    </button>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button onClick={() => deleteHistory(item.id)} className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                      <Trash2 size={16}/>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" className="py-20 text-center text-gray-400">조건에 맞는 견적 이력이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredList.length > 0 && (
        <div className="flex justify-between items-center px-6 py-4 bg-gray-50/50 border-t border-gray-100 rounded-b-2xl">
          <div className="text-xs font-bold text-gray-500">총 <span className="text-indigo-600 font-black">{filteredList.length}</span> 건 조회됨</div>
          <div className="flex justify-center items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-50 shadow-sm"><ChevronLeft size={16}/></button>
            <span className="font-bold text-sm text-gray-600 px-2">{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-50 shadow-sm"><ChevronRight size={16}/></button>
          </div>
        </div>
      )}
    </div>
  );
}