import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, Plus, Trash2, Edit, Filter, Search, Phone, Printer, MapPin
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function NHISBranches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [primaryRegion, setPrimaryRegion] = useState('전체');
  const [secondaryRegion, setSecondaryRegion] = useState('전체');

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase.from('nhis_branches').select('*').order('name');
      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('공단지사 로드 실패:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const primaryRegions = useMemo(() => {
    const p = [...new Set(branches.map(b => b.region?.split(' ')[0] || '기타'))];
    return ['전체', ...p.sort()];
  }, [branches]);

  const secondaryRegions = useMemo(() => {
    if (primaryRegion === '전체') return ['전체'];
    const s = [...new Set(branches
      .filter(b => (b.region?.split(' ')[0] || '기타') === primaryRegion)
      .map(b => b.region?.split(' ')[1] || '전체'))];
    return ['전체', ...s.sort()];
  }, [branches, primaryRegion]);

  const filteredBranches = useMemo(() => {
    return branches.filter(b => {
      const bPrimary = b.region?.split(' ')[0] || '기타';
      const bSecondary = b.region?.split(' ')[1] || '전체';
      const matchPrimary = primaryRegion === '전체' || bPrimary === primaryRegion;
      const matchSecondary = secondaryRegion === '전체' || bSecondary === secondaryRegion;
      return matchPrimary && matchSecondary;
    });
  }, [branches, primaryRegion, secondaryRegion]);

  useEffect(() => {
    setSecondaryRegion('전체');
  }, [primaryRegion]);

  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Building2 size={20} className="text-blue-600" />
            공단 지사
          </h3>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-1 font-bold text-sm hover:bg-blue-700 transition">
            <Plus size={16} /> 추가
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select className="bg-gray-50 text-xs md:text-sm font-bold p-2.5 rounded-lg border border-gray-200 flex-1" value={primaryRegion} onChange={(e) => setPrimaryRegion(e.target.value)}>
            {primaryRegions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="bg-gray-50 text-xs md:text-sm font-bold p-2.5 rounded-lg border border-gray-200 flex-1" value={secondaryRegion} onChange={(e) => setSecondaryRegion(e.target.value)}>
            {secondaryRegions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      
      {loading ? (
        <div className="py-10 text-center text-gray-500 font-medium">로딩 중...</div>
      ) : (
        <>
          {/* 데스크톱 테이블 뷰 */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-100 text-gray-600">
                  <th className="py-3 px-4 font-bold">지사명</th>
                  <th className="py-3 px-4 font-bold">주소</th>
                  <th className="py-3 px-4 font-bold">연락처/팩스</th>
                  <th className="py-3 px-4 font-bold text-right">관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredBranches.map((b) => (
                  <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-semibold text-gray-800">{b.name}</td>
                    <td className="py-3 px-4 text-gray-600 text-xs">[{b.zip_code}] {b.address}</td>
                    <td className="py-3 px-4 text-gray-600 font-mono text-xs">Tel: {b.phone_number}<br/>Fax: {b.fax_number}</td>
                    <td className="py-3 px-4 text-right">
                      <button className="text-gray-400 hover:text-blue-600 p-1"><Edit size={16} /></button>
                      <button className="text-gray-400 hover:text-red-600 p-1 ml-2"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 뷰 */}
          <div className="md:hidden space-y-3">
            {filteredBranches.map((b) => (
              <div key={b.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-900">{b.name}</h4>
                  <div className="flex gap-1">
                    <button className="text-gray-400 p-1"><Edit size={16} /></button>
                    <button className="text-gray-400 p-1"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <p className="flex items-start gap-1.5"><MapPin size={12} className="mt-0.5 shrink-0"/> [{b.zip_code}] {b.address}</p>
                  <p className="flex items-center gap-1.5"><Phone size={12} className="shrink-0"/> {b.phone_number || '-'}</p>
                  <p className="flex items-center gap-1.5"><Printer size={12} className="shrink-0"/> {b.fax_number || '-'}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}