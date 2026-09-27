/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PhoneCall, BookOpen, GitFork, ClipboardCheck, PlusCircle } from 'lucide-react';

interface HeaderProps {
  activeTab: 'simulator' | 'scripts' | 'flowchart' | 'checksheet';
  setActiveTab: (tab: 'simulator' | 'scripts' | 'flowchart' | 'checksheet') => void;
  onNewCall: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onNewCall }) => {
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
                setActiveTab('simulator');
              }}
              className="text-base sm:text-lg font-bold tracking-tight text-slate-900 hover:text-blue-700 transition-colors"
            >
              蛍光灯→LED切替 事前調査ヒアリングCRM
            </a>
          </div>

          {/* Zone 2: Clean text navigation links */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'simulator'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <PhoneCall className="w-4 h-4" />
              <span>通話ナビ（実務モード）</span>
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
              <span>チェックシート・記録</span>
            </button>
          </nav>

          {/* Zone 3: Primary action button */}
          <div className="flex items-center gap-2">
            <button
              onClick={onNewCall}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-xs whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4" />
              <span>新規ヒアリング開始</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
