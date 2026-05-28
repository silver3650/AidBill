import React from 'react';
import { BookOpen, Download } from 'lucide-react';

// 💡 제일 앞에 있는 'export default'가 반드시 있어야 합니다!
export default function ManualDownload() {
  return (
    <a
      href="/AidBill_Manual.pdf"
      download="AidBill_사용매뉴얼.pdf"
      className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 rounded-xl text-sm font-black transition-colors border border-indigo-100 shadow-sm"
      title="AidBill 사용 매뉴얼 다운로드"
    >
      <BookOpen size={16} />
      <span className="hidden sm:inline">매뉴얼 다운로드</span>
      <Download size={14} className="opacity-70" />
    </a>
  );
}