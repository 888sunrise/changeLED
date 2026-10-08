/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Table, PhoneCall, BookOpen, GitFork, ClipboardCheck, FileCheck2 } from 'lucide-react';

interface HeaderProps {
  activeTab: 'ledger' | 'simulator' | 'post_visit' | 'scripts' | 'flowchart' | 'checksheet';
  setActiveTab: (tab: 'ledger' | 'simulator' | 'post_visit' | 'scripts' | 'flowchart' | 'checksheet') => void;
  onNewCall: () => void;
  selectedStoreName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onNewCall,
  selectedStoreName,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tier 1 (一段上): Logo, Wordmark Title & Primary Action */}
        <div className="flex items-center justify-between h-13 py-2 border-b border-slate-100">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
              LED
            </div>
            <div className="flex items-center gap-2.5 min-w-0">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('ledger');
                }}
                className="text-base sm:text-lg font-bold tracking-tight text-slate-900 hover:text-blue-700 transition-colors whitespace-nowrap"
              >
                蛍光灯→LED切替 事前調査ヒアリングCRM
              </a>
              <span className="hidden md:inline-flex text-[11px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full border border-blue-200 whitespace-nowrap">
                全173店舗マスタ連動
              </span>
            </div>
          </div>

          {/* Zone 3: Quick Action & Calling Status */}
          <div className="flex items-center gap-2.5 shrink-0 ml-3">
            {selectedStoreName && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md font-medium whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>通話中: <strong>{selectedStoreName}</strong></span>
              </span>
            )}
            <button
              onClick={onNewCall}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-xs whitespace-nowrap cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>通話ナビを開始</span>
            </button>
          </div>
        </div>

        {/* Tier 2 (下段ナビゲーション): Navigation Tabs with full horizontal width */}
        <nav className="flex items-center gap-1 sm:gap-2 h-11 overflow-x-auto scrollbar-none py-1">
          <button
            onClick={() => setActiveTab('checksheet')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'checksheet'
                ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ClipboardCheck className="w-4 h-4 text-blue-600" />
            <span>記録カルテ</span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'ledger'
                ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Table className="w-4 h-4 text-blue-600" />
            <span>A〜U列 店舗進捗台帳</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <PhoneCall className="w-4 h-4 text-blue-600" />
            <span>通話ナビ（ヒアリング）</span>
            {selectedStoreName && (
              <span className="text-[11px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                {selectedStoreName}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('post_visit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'post_visit'
                ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileCheck2 className="w-4 h-4 text-indigo-600" />
            <span>通話ナビ2（訪問後）</span>
          </button>

          <button
            onClick={() => setActiveTab('flowchart')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'flowchart'
                ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <GitFork className="w-4 h-4 text-slate-500" />
            <span>分岐フロー図</span>
          </button>

          <button
            onClick={() => setActiveTab('scripts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'scripts'
                ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4 text-slate-500" />
            <span>トークスクリプト全文</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
