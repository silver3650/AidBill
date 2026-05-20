import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, X, Search, Edit3, Trash2, 
  Phone, User, Check, FileCheck, Mail, PlusCircle, MinusCircle
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const STANDARD_DOCS = [
  { id: '교부비용청구서', label: '보조기기 교부 비용청구서' },
  { id: '교부확인서', label: '보조기기 교부 확인서' },
  { id: '사업자등록증', label: '사업자 등록증 사본' },
  { id: '계좌사본', label: '통장 사본 (업체)' },
  { id: '물품인수증', label: '물품 인수증' },
  { id: '견적서', label: '견적서' },
  { id: '거래명세서', label: '거래명세서' },
  { id: '기타 첨부(교부사진, 배송추적 캡쳐본 등)', label: '발송 내역(송장/배송추적이미지)' },
];

export default function LocalGovernments() {
  const [govs, setGovs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    memo: '',
    additional_contacts: [], // 💡 추가 담당자를 관리하는 배열
    required_documents: ['교부비용청구서', '교부확인서', '사업자등록증', '계좌사본']
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data, error } = await supabase
      .from('local_governments')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) console.error('Error fetching govs:', error);
    else setGovs(data || []);
  }

  // DB 유령 데이터 필터 및 정규화
  const normalizeDocs = (docs) => {
    let rawDocs = docs;
    if (typeof rawDocs === 'string') {
      try { rawDocs = JSON.parse(rawDocs); } 
      catch (e) { rawDocs = rawDocs.split(',').map(s => s.trim()); }
    }
    if (!Array.isArray(rawDocs)) return [];

    const legacyMap = {
      'cost_claim': '교부비용청구서', 'delivery_confirm': '교부확인서',
      'biz_reg': '사업자등록증', 'bankbook': '계좌사본',
      'receipt': '물품인수증', 'estimate': '견적서',
      'invoice': '거래명세서', 'customer_id_card': '기타 첨부(교부사진, 배송추적 캡쳐본 등)'
    };

    const translated = rawDocs.map(d => legacyMap[d] || d);
    const validDocs = translated.filter(d => STANDARD_DOCS.some(sd => sd.id === d));
    return [...new Set(validDocs)];
  };

  // 추가 담당자 데이터 안전하게 파싱
  const parseContacts = (contacts) => {
    if (!contacts) return [];
    if (typeof contacts === 'string') {
      try { return JSON.parse(contacts); } catch(e) { return []; }
    }
    return Array.isArray(contacts) ? contacts : [];
  };

  const toggleDoc = (docId) => {
    setFormData(prev => ({
      ...prev,
      required_documents: prev.required_documents.includes(docId)
        ? prev.required_documents.filter(id => id !== docId)
        : [...prev.required_documents, docId]
    }));
  };

  // 💡 추가 담당자 제어 함수들
  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      additional_contacts: [...prev.additional_contacts, { name: '', phone: '', email: '' }]
    }));
  };

  const updateContact = (index, field, value) => {
    setFormData(prev => {
      const newContacts = [...prev.additional_contacts];
      newContacts[index][field] = value;
      return { ...prev, additional_contacts: newContacts };
    });
  };

  const removeContact = (index) => {
    setFormData(prev => ({
      ...prev,
      additional_contacts: prev.additional_contacts.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!formData.name) return alert('지자체명은 필수 입력 항목입니다.');

    const payload = {
      name: formData.name,
      contact_person: formData.contact_person,
      phone: formData.phone,
      email: formData.email,
      memo: formData.memo,
      additional_contacts: formData.additional_contacts,
      required_documents: formData.required_documents
    };

    let result;
    if (editingId) {
      result = await supabase.from('local_governments').update(payload).eq('id', editingId);
    } else {
      result = await supabase.from('local_governments').insert([payload]);
    }

    if (result.error) {
      alert('저장 실패: ' + result.error.message);
    } else {
      alert(editingId ? '지자체 정보가 수정되었습니다.' : '새로운 지자체가 등록되었습니다.');
      closeModal();
      fetchData();
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`[${name}] 지자체 정보를 정말 삭제하시겠습니까?\n이 지자체에 소속된 대상자가 있을 경우 삭제되지 않을 수 있습니다.`)) return;

    const { error } = await supabase.from('local_governments').delete().eq('id', id);
    
    if (error) {
      if (error.code === '23503') {
        alert('삭제 실패: 이 지자체에 등록된 대상자(수급자)가 있습니다. 대상자 정보를 먼저 수정하거나 삭제해 주세요.');
      } else {
        alert('삭제 실패: ' + error.message);
      }
    } else {
      alert('삭제되었습니다.');
      fetchData();
    }
  };

  const openEditModal = (gov) => {
    setFormData({
      name: gov.name,
      contact_person: gov.contact_person || '',
      phone: gov.phone || '',
      email: gov.email || '',
      memo: gov.memo || '',
      additional_contacts: parseContacts(gov.additional_contacts),
      required_documents: normalizeDocs(gov.required_documents)
    });
    setEditingId(gov.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ 
      name: '', 
      contact_person: '', 
      phone: '', 
      email: '', 
      memo: '', 
      additional_contacts: [],
      required_documents: ['교부비용청구서', '교부확인서', '사업자등록증', '계좌사본'] 
    });
  };

  const filteredGovs = govs
    .filter(g => g.name.includes(searchTerm))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-20 font-sans">
      
      {/* 모바일 반응형 헤더 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter">지자체 관리</h1>
          <p className="text-gray-500 mt-2 font-bold flex items-center gap-2 text-sm md:text-base">
            <Building2 size={18} className="text-blue-600 shrink-0" /> 총 {govs.length}개의 관할 지자체가 등록되어 있습니다.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto bg-blue-600 text-white px-6 md:px-8 py-3.5 md:py-4 rounded-2xl md:rounded-[1.5rem] font-black shadow-xl shadow-blue-200 flex items-center justify-center gap-2 hover:scale-105 transition-all"
        >
          <Plus size={22} /> 지자체 등록
        </button>
      </div>

      {/* 모바일 반응형 검색바 */}
      <div className="bg-white p-2 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-sm flex items-center group focus-within:border-blue-200 transition-all">
        <Search className="ml-4 md:ml-6 text-gray-400 group-focus-within:text-blue-600" size={20} />
        <input 
          type="text" placeholder="지자체명으로 검색하세요..." 
          className="w-full p-4 md:p-5 outline-none font-bold text-gray-800 bg-transparent text-sm md:text-base"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {filteredGovs.map(gov => {
          const cleanDocs = normalizeDocs(gov.required_documents);
          const extraContacts = parseContacts(gov.additional_contacts);
          
          return (
            <div key={gov.id} className="bg-white rounded-3xl md:rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/10 p-6 md:p-8 flex flex-col group hover:border-blue-200 transition-all">
              <div className="flex justify-between items-start mb-5 md:mb-6">
                <div>
                  <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg mb-2 md:mb-3 tracking-widest">
                    관할 기관
                  </span>
                  <h3 
                    onClick={() => openEditModal(gov)}
                    className="text-xl md:text-2xl font-black text-gray-900 tracking-tight leading-tight cursor-pointer hover:text-blue-600 transition-colors"
                  >
                    {gov.name}
                  </h3>
                </div>
                {/* 모바일에서는 버튼 상시 노출, PC에서는 Hover 시 노출 */}
                <div className="flex gap-1.5 md:gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal(gov)} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-xl hover:bg-blue-50 transition-all shadow-sm"><Edit3 size={16}/></button>
                  <button onClick={() => handleDelete(gov.id, gov.name)} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-xl hover:bg-red-50 transition-all shadow-sm"><Trash2 size={16}/></button>
                </div>
              </div>

              <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                {/* 대표 담당자 */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[11px] font-black text-blue-600 mb-2 tracking-widest">대표 담당자</p>
                  <p className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-1"><User size={14} className="text-gray-400"/> {gov.contact_person || '미지정'}</p>
                  <p className="text-sm font-bold text-gray-500 flex items-center gap-2"><Phone size={14} className="text-gray-400"/> {gov.phone || '연락처 미등록'}</p>
                  {gov.email && <p className="text-sm font-bold text-gray-500 flex items-center gap-2 mt-1"><Mail size={14} className="text-gray-400"/> {gov.email}</p>}
                </div>

                {/* 추가 담당자 목록 렌더링 */}
                {extraContacts.length > 0 && (
                  <div className="space-y-2">
                    {extraContacts.map((contact, idx) => (
                      <div key={idx} className="bg-white border border-gray-100 p-3 rounded-xl flex flex-col gap-1">
                        <p className="text-sm font-bold text-gray-700 flex items-center gap-2"><User size={14} className="text-gray-400"/> {contact.name || '이름 없음'}</p>
                        {contact.phone && <p className="text-xs font-bold text-gray-500 flex items-center gap-2"><Phone size={14} className="text-gray-400"/> {contact.phone}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-auto pt-5 md:pt-6 border-t border-gray-100">
                <p className="text-[11px] md:text-xs font-black text-gray-400 mb-3 flex items-center gap-1">
                  <FileCheck size={14} className="text-blue-400"/> 필수 제출 서류 ({cleanDocs.length}종)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {cleanDocs.map(docId => {
                    const doc = STANDARD_DOCS.find(d => d.id === docId);
                    return doc ? (
                      <span key={docId} className="px-2 py-1 bg-gray-50 border border-gray-100 rounded-md text-[10px] font-bold text-gray-600">
                        {doc.label}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 신규 등록 및 수정 모달 (모바일 반응형 최적화) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl md:rounded-[3rem] shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            
            <div className="p-6 md:p-8 border-b border-gray-50 flex justify-between items-center bg-blue-50/30 shrink-0">
              <div>
                <h4 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                  {editingId ? '지자체 정보 수정' : '신규 지자체 등록'}
                </h4>
                <p className="text-xs md:text-sm text-gray-500 font-bold mt-1">담당 기관의 정보와 요구 서류를 설정합니다.</p>
              </div>
              <button onClick={closeModal} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white border border-gray-100 rounded-xl md:rounded-2xl text-gray-400 hover:text-black shadow-sm transition-all shrink-0">
                <X size={20} className="md:w-6 md:h-6"/>
              </button>
            </div>
            
            <div className="p-6 md:p-8 space-y-6 md:space-y-8 overflow-y-auto flex-1 custom-scrollbar">
              {/* 기본 지자체 정보 */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1">관할 지자체명 *</label>
                  <input 
                    className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl md:rounded-2xl border-none outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-600 transition-all text-sm md:text-base"
                    placeholder="예: 성남시청 노인복지과"
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>

              {/* 담당자 영역 */}
              <div className="bg-white border-2 border-gray-50 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 space-y-5 md:space-y-6">
                <div className="flex justify-between items-center">
                  <h5 className="font-black text-gray-800 flex items-center gap-2 text-sm md:text-base"><User size={18} className="text-blue-600"/> 담당자 정보</h5>
                  <button 
                    onClick={addContact}
                    className="text-[10px] md:text-xs font-black text-blue-600 bg-blue-50 px-3 py-1.5 md:px-4 md:py-2 rounded-xl flex items-center gap-1 hover:bg-blue-100 transition-all"
                  >
                    <PlusCircle size={14}/> 담당자 추가
                  </button>
                </div>

                {/* 대표 담당자 입력란 */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 relative">
                  <span className="absolute -top-2.5 left-4 bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md">대표</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-2">
                    <div className="space-y-1.5">
                      <label className="text-[11px] md:text-xs font-bold text-gray-500 ml-1">성명</label>
                      <input 
                        className="w-full bg-white p-3 rounded-xl border border-gray-200 outline-none font-bold text-sm text-gray-800 focus:border-blue-500 transition-all"
                        placeholder="예: 홍길동 주무관"
                        value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] md:text-xs font-bold text-gray-500 ml-1">연락처</label>
                      <input 
                        className="w-full bg-white p-3 rounded-xl border border-gray-200 outline-none font-bold text-sm text-gray-800 focus:border-blue-500 transition-all"
                        placeholder="031-000-0000"
                        value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[11px] md:text-xs font-bold text-gray-500 ml-1">이메일 주소</label>
                      <input 
                        type="email"
                        className="w-full bg-white p-3 rounded-xl border border-gray-200 outline-none font-bold text-sm text-gray-800 focus:border-blue-500 transition-all"
                        placeholder="official@city.go.kr"
                        value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* 추가 담당자 동적 렌더링 */}
                {formData.additional_contacts.map((contact, index) => (
                  <div key={index} className="p-4 bg-white border-2 border-dashed border-gray-200 rounded-2xl relative animate-in fade-in slide-in-from-top-2">
                    <button 
                      onClick={() => removeContact(index)}
                      className="absolute -top-3 -right-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-full p-1.5 transition-all shadow-sm"
                    >
                      <MinusCircle size={18}/>
                    </button>
                    <span className="absolute -top-2.5 left-4 bg-gray-200 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-md">추가 {index + 1}</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-2">
                      <div className="space-y-1.5">
                        <label className="text-[11px] md:text-xs font-bold text-gray-500 ml-1">성명</label>
                        <input 
                          className="w-full bg-gray-50 p-3 rounded-xl border-none outline-none font-bold text-sm text-gray-800 focus:ring-2 focus:ring-gray-200 transition-all"
                          placeholder="추가 담당자명"
                          value={contact.name} onChange={e => updateContact(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] md:text-xs font-bold text-gray-500 ml-1">연락처</label>
                        <input 
                          className="w-full bg-gray-50 p-3 rounded-xl border-none outline-none font-bold text-sm text-gray-800 focus:ring-2 focus:ring-gray-200 transition-all"
                          placeholder="연락처"
                          value={contact.phone} onChange={e => updateContact(index, 'phone', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[11px] md:text-xs font-bold text-gray-500 ml-1">이메일 주소</label>
                        <input 
                          type="email"
                          className="w-full bg-gray-50 p-3 rounded-xl border-none outline-none font-bold text-sm text-gray-800 focus:ring-2 focus:ring-gray-200 transition-all"
                          placeholder="이메일"
                          value={contact.email} onChange={e => updateContact(index, 'email', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 필수 서류 영역 */}
              <div className="pt-6 border-t border-gray-100 space-y-4">
                <div className="flex flex-col">
                  <label className="text-xs md:text-sm font-extrabold text-gray-800 ml-1 flex items-center gap-1">
                    <FileCheck size={16} className="text-blue-600"/> 해당 지자체 요구 서류 설정
                  </label>
                  <p className="text-[10px] md:text-[11px] text-gray-400 font-bold ml-1 mt-1 mb-3 md:mb-4">
                    체크된 서류는 향후 이 지자체 소속 대상자의 청구 메일 발송 시 기본 첨부 목록으로 자동 세팅됩니다.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3">
                  {STANDARD_DOCS.map(doc => {
                    const isSelected = formData.required_documents.includes(doc.id);
                    return (
                      <button 
                        key={doc.id} onClick={() => toggleDoc(doc.id)}
                        className={`flex items-center gap-3 p-3.5 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all text-left ${isSelected ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-100 bg-white text-gray-500 hover:border-blue-200'}`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                          {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                        </div>
                        <span className="text-xs md:text-sm font-bold flex-1">{doc.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-5 md:p-8 bg-gray-50 flex gap-3 md:gap-4 border-t border-gray-100 shrink-0">
              <button onClick={closeModal} className="flex-1 py-3.5 md:py-5 bg-white border border-gray-200 rounded-xl md:rounded-[1.5rem] font-black text-gray-500 hover:bg-gray-50 transition-all text-sm md:text-base">취소</button>
              <button onClick={handleSave} className="flex-[1.5] md:flex-1 py-3.5 md:py-5 bg-blue-600 text-white rounded-xl md:rounded-[1.5rem] font-black shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm md:text-base">
                {editingId ? '지자체 수정' : '지자체 등록'}
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}