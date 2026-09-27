/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Table, PhoneCall, BookOpen, GitFork, ClipboardCheck } from 'lucide-react';

interface HeaderProps {
  activeTab: 'ledger' | 'simulator' | 'scripts' | 'flowchart' | 'checksheet';
  setActiveTab: (tab: 'ledger' | 'simulator' | 'scripts' | 'flowchart' | 'checksheet') => void;
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
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              LED
            </div>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('ledger');
              }}
              className="text-base sm:text-lg font-bold tracking-tight text-slate-900 hover:text-blue-700 transition-colors"
            >
              蛍光灯→LED切替 事前調査ヒアリングCRM
            </a>
          </div>

          {/* Zone 2: Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'ledger'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Table className="w-4 h-4 text-blue-600" />
              <span>A〜T列 店舗進捗台帳</span>
            </button>

            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'simulator'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <PhoneCall className="w-4 h-4" />
              <span>通話ナビ（ヒアリング）</span>
              {selectedStoreName && (
                <span className="text-[11px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                  {selectedStoreName}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('flowchart')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'flowchart'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <GitFork className="w-4 h-4" />
              <span>分岐フロー図</span>
            </button>

            <button
              onClick={() => setActiveTab('scripts')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'scripts'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>トークスクリプト全文</span>
            </button>

            <button
              onClick={() => setActiveTab('checksheet')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'checksheet'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>記録カルテ</span>
            </button>
          </nav>

          {/* Zone 3: Quick Action */}
          <div className="flex items-center gap-2">
            <button
              onClick={onNewCall}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-xs whitespace-nowrap"
            >
              <PhoneCall className="w-4 h-4" />
              <span>通話ナビを開始</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
