import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Search, Mail, FileText, Clock, Trash2, 
  ChevronLeft, ChevronRight, PackageCheck, Loader2, Building, Calendar, RefreshCw, X 
} from 'lucide-react';

import EstimateDoc from './documents/EstimateDoc';

export default function EstimateHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState(null); 
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [dateRange, setDateRange] = useState({ start: '', end: '' }); 

  const [selectedDetail, setSelectedDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    fetchHistory();
    fetchCompanyProfile();
  }, []);

  async function fetchCompanyProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase.from('company_profile').select('*').eq('company_id', session.user.id).maybeSingle();
      if (data) setCompanyInfo(data);
    }
  }

  async function fetchHistory() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('estimate_history')
        .select('*')
        .eq('company_id', session.user.id)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const toggleOrderStatus = async (e, id, currentStatus) => {
    if (e) e.stopPropagation();
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

      if (selectedDetail && selectedDetail.id === id) {
        setSelectedDetail(prev => ({ ...prev, order_status: newStatus }));
      }
    } catch (err) {
      alert('상태 변경 실패: ' + err.message);
    }
  };

  const deleteHistory = async (e, id) => {
    if (e) e.stopPropagation();
    if (!window.confirm('이 견적 발송 이력을 삭제하시겠습니까? (삭제 시 복구할 수 없습니다)')) return;
    try {
      const { error } = await supabase.from('estimate_history').delete().eq('id', id);
      if (error) throw error;
      setHistory(prev => prev.filter(item => item.id !== id));
      if (selectedDetail && selectedDetail.id === id) setIsDetailModalOpen(false);
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  const formatDateTime = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

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

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('전체');
    setDateRange({ start: '', end: '' });
    setCurrentPage(1);
  };

  let filteredList = history.filter(h => 
    h.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.items_summary.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  if (statusFilter !== '전체') {
    filteredList = filteredList.filter(h => h.order_status === statusFilter);
  }

  if (dateRange.start && dateRange.end) {
    filteredList = filteredList.filter(h => {
      const claimDate = h.sent_at.split('T')[0]; 
      return claimDate >= dateRange.start && claimDate <= dateRange.end;
    });
  }

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const currentItems = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const openDetailModal = (item) => {
    setSelectedDetail(item);
    setIsDetailModalOpen(true);
  };

  // 💡 견적서에 넘겨줄 아이템 배열을 완벽하게 파싱하는 함수
  const getRenderItems = () => {
    if (!selectedDetail) return [];
    
    let parsedItems = [];
    try {
      // 1. 이미 배열인 경우
      if (Array.isArray(selectedDetail.items)) {
        parsedItems = selectedDetail.items;
      } 
      // 2. DB에서 문자열(String)로 넘어온 경우 JSON으로 변환
      else if (typeof selectedDetail.items === 'string') {
        parsedItems = JSON.parse(selectedDetail.items);
      }
    } catch (e) {
      console.error("세부 품목 파싱 에러:", e);
    }

    // 파싱 성공하여 정상적인 배열이 존재할 경우 리턴 (이 경우 사진과 개별 품목이 모두 나옵니다!)
    if (parsedItems && parsedItems.length > 0) {
      return parsedItems;
    }
    
    // 💡 과거 데이터라서 items 정보가 없는 경우에만 요약 정보 표시
    return [{ 
      name: selectedDetail.items_summary, 
      quantity: 1, 
      price: selectedDetail.total_amount, 
      total: selectedDetail.total_amount 
    }];
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">견적서 발송 이력</h1>
          <p className="text-gray-500 mt-2 font-bold text-sm">단독 발송된 견적서 이력을 확인하고 발주(계약) 상태를 관리합니다.</p>
        </div>
      </div>

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
                <tr 
                  key={item.id} 
                  onClick={() => openDetailModal(item)} 
                  className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                >
                  <td className="py-4 px-6 text-gray-500 font-mono text-xs">{formatDateTime(item.sent_at)}</td>
                  <td className="py-4 px-6">
                    <div className="text-gray-900 truncate flex items-center gap-1.5"><Building size={14} className="text-gray-400"/> {item.recipient_name}</div>
                    {item.recipient_email && <div className="text-[10px] text-gray-400 font-medium mt-1 truncate"><Mail size={10} className="inline mr-1"/>{item.recipient_email}</div>}
                  </td>
                  <td className="py-4 px-6 text-indigo-900">{item.items_summary}</td>
                  <td className="py-4 px-6 text-right font-black font-mono text-gray-900">₩{item.total_amount?.toLocaleString()}</td>
                  <td className="py-4 px-6 text-center">
                    <button 
                      onClick={(e) => toggleOrderStatus(e, item.id, item.order_status)}
                      className={`px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 mx-auto transition-all w-full
                        ${item.order_status === '발주 완료' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200' : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'}`}
                    >
                      {item.order_status === '발주 완료' ? <><PackageCheck size={14}/> 발주 완료</> : <><Clock size={14}/> 견적 발송</>}
                    </button>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button onClick={(e) => deleteHistory(e, item.id)} className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
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

      {isDetailModalOpen && selectedDetail && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <div>
                <h3 className="text-lg md:text-xl font-black text-gray-900 flex items-center gap-2">
                  <FileText className="text-indigo-600" /> 발송된 견적서 원본 보기
                </h3>
                <p className="text-xs text-gray-500 font-bold mt-1">발송일: {formatDateTime(selectedDetail.sent_at)}</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 bg-white rounded-full shadow-sm border border-gray-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            {/* 💡 A4 사이즈 원본 문서 렌더링 영역 */}
            <div className="flex-1 bg-gray-200 p-4 md:p-8 overflow-y-auto flex justify-center items-start custom-scrollbar">
              <div className="shadow-xl transform origin-top md:scale-100 scale-75 shrink-0 bg-white">
                <EstimateDoc 
                  targetName={selectedDetail.recipient_name} 
                  companyInfo={companyInfo} 
                  items={getRenderItems()} /* 💡 안전한 파싱을 거친 완벽한 아이템 배열 전달 */
                  totalAmount={selectedDetail.total_amount} 
                  claimDate={selectedDetail.sent_at.split('T')[0]} 
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-white flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
              <div className="flex items-center gap-4 px-2 w-full sm:w-auto">
                <div>
                   <p className="text-[10px] font-bold text-gray-400 mb-0.5">수신 이메일</p>
                   <p className="text-xs font-black text-gray-800">{selectedDetail.recipient_email || '이메일 미입력'}</p>
                </div>
                <div className="w-px h-8 bg-gray-200"></div>
                <div>
                   <p className="text-[10px] font-bold text-gray-400 mb-0.5">발주 상태</p>
                   <p className={`text-xs font-black ${selectedDetail.order_status === '발주 완료' ? 'text-emerald-600' : 'text-rose-600'}`}>
                     {selectedDetail.order_status}
                   </p>
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                 <button onClick={() => setIsDetailModalOpen(false)} className="px-6 py-3.5 bg-gray-100 border border-transparent rounded-xl font-black text-gray-600 hover:bg-gray-200 transition-colors w-full sm:w-auto">
                   닫기
                 </button>
                 <button onClick={(e) => toggleOrderStatus(e, selectedDetail.id, selectedDetail.order_status)} 
                   className={`px-6 py-3.5 rounded-xl font-black shadow-md flex items-center justify-center gap-2 transition-colors text-white w-full sm:w-auto
                   ${selectedDetail.order_status === '발주 완료' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                    {selectedDetail.order_status === '발주 완료' ? <><Clock size={16}/> 미발주로 변경</> : <><PackageCheck size={16}/> 발주 완료로 변경</>}
                 </button>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}