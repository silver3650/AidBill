import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Building2, Plus, Trash2, Edit, Filter } from 'lucide-react';

export default function NHISBranches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 필터 상태
  const [primaryRegion, setPrimaryRegion] = useState('전체'); // 1차: 서울특별시, 경기도 등
  const [secondaryRegion, setSecondaryRegion] = useState('전체'); // 2차: 강남구, 성남시 등

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

  // 1차 필터 목록 (서울특별시, 경기도 등)
  const primaryRegions = useMemo(() => {
    const p = [...new Set(branches.map(b => b.region?.split(' ')[0] || '기타'))];
    return ['전체', ...p.sort()];
  }, [branches]);

  // 2차 필터 목록 (1차 선택에 따라 동적 변경)
  const secondaryRegions = useMemo(() => {
    if (primaryRegion === '전체') return ['전체'];
    const s = [...new Set(branches
      .filter(b => (b.region?.split(' ')[0] || '기타') === primaryRegion)
      .map(b => b.region?.split(' ')[1] || '전체'))];
    return ['전체', ...s.sort()];
  }, [branches, primaryRegion]);

  // 필터링 적용
  const filteredBranches = useMemo(() => {
    return branches.filter(b => {
      const bPrimary = b.region?.split(' ')[0] || '기타';
      const bSecondary = b.region?.split(' ')[1] || '전체';
      
      const matchPrimary = primaryRegion === '전체' || bPrimary === primaryRegion;
      const matchSecondary = secondaryRegion === '전체' || bSecondary === secondaryRegion;
      return matchPrimary && matchSecondary;
    });
  }, [branches, primaryRegion, secondaryRegion]);

  // 1차 필터 변경 시 2차 초기화
  useEffect(() => {
    setSecondaryRegion('전체');
  }, [primaryRegion]);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Building2 size={20} className="text-blue-600" />
          국민건강보험공단지사 목록
        </h3>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={18} className="text-gray-400" />
          <select className="bg-gray-50 text-sm font-bold p-2 rounded-lg border border-gray-200" value={primaryRegion} onChange={(e) => setPrimaryRegion(e.target.value)}>
            {primaryRegions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="bg-gray-50 text-sm font-bold p-2 rounded-lg border border-gray-200" value={secondaryRegion} onChange={(e) => setSecondaryRegion(e.target.value)}>
            {secondaryRegions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-blue-700 transition">
            <Plus size={18} /> 추가
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="py-10 text-center text-gray-500 font-medium">로딩 중...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-100 text-gray-600">
                <th className="py-3 px-4 font-bold">지사명</th>
                <th className="py-3 px-4 font-bold">우편번호</th>
                <th className="py-3 px-4 font-bold">주소</th>
                <th className="py-3 px-4 font-bold">전화번호</th>
                <th className="py-3 px-4 font-bold">팩스번호</th>
                <th className="py-3 px-4 font-bold text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredBranches.length === 0 ? (
                <tr><td colSpan="6" className="py-10 text-center text-gray-400">데이터가 없습니다.</td></tr>
              ) : (
                filteredBranches.map((branch) => (
                  <tr key={branch.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-semibold text-gray-800">{branch.name}</td>
                    <td className="py-3 px-4 text-gray-600 font-mono">{branch.zip_code || '-'}</td>
                    <td className="py-3 px-4 text-gray-600 text-xs">{branch.address || '-'}</td>
                    <td className="py-3 px-4 text-gray-600 font-mono">{branch.phone_number || '-'}</td>
                    <td className="py-3 px-4 text-gray-600 font-mono">{branch.fax_number || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <button className="text-gray-400 hover:text-blue-600 p-1"><Edit size={16} /></button>
                      <button className="text-gray-400 hover:text-red-600 p-1 ml-2"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}