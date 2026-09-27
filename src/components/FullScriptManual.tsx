/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TALK_SCRIPTS } from '../data/scripts';
import { Copy, Check, Search, BookOpen, AlertCircle, Sparkles } from 'lucide-react';

export const FullScriptManual: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredSections = TALK_SCRIPTS.filter((sec) => {
    const matchesCategory = selectedCategory === 'all' || sec.category === selectedCategory;
    if (!matchesCategory) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const inTitle = sec.title.toLowerCase().includes(query);
    const inDesc = sec.shortDesc.toLowerCase().includes(query);
    const inDialogues = sec.dialogues.some(
      (d) => d.text.toLowerCase().includes(query) || (d.tips && d.tips.some((t) => t.toLowerCase().includes(query)))
    );
    return inTitle || inDesc || inDialogues;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Banner / Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span>トークスクリプト全文マニュアル</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            丁寧なビジネス敬語で構成された電話ヒアリングの実務台本です。オペレーター研修や通話時の手元参照用にご活用ください。
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="台本内をキーワード検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Category Filter Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'すべて表示' },
          { id: 'opening', label: '1. 挨拶・趣旨説明' },
          { id: 'led_status', label: '2. LED化確認' },
          { id: 'location', label: '3. 設置場所判定' },
          { id: 'scheduling', label: '4. 訪問日程調整' },
          { id: 'lock_procedure', label: '5. 【条件発動】戸締り・鍵' },
          { id: 'closing', label: '6. クロージング' },
          { id: 'faq', label: '7. 想定問答・FAQ' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              selectedCategory === tab.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sections List */}
      <div className="space-y-6">
        {filteredSections.map((sec) => (
          <div key={sec.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {/* Section Header */}
            <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-sm sm:text-base text-slate-900">{sec.title}</span>
                {sec.badgeText && (
                  <span className="text-xs bg-amber-100 text-amber-800 border border-amber-300 font-semibold px-2 py-0.5 rounded">
                    {sec.badgeText}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">{sec.shortDesc}</p>
            </div>

            {/* Condition Notice if any */}
            {sec.conditionNotice && (
              <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center gap-2 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-medium">{sec.conditionNotice}</span>
              </div>
            )}

            {/* Dialogues */}
            <div className="p-5 space-y-4">
              {sec.dialogues.map((dlg) => {
                const isOp = dlg.speaker === 'operator';
                return (
                  <div
                    key={dlg.id}
                    className={`relative rounded-xl p-4 transition-all ${
                      isOp
                        ? 'bg-blue-50/60 border border-blue-200 ml-0 sm:mr-8'
                        : 'bg-slate-50 border border-slate-200 ml-4 sm:ml-8'
                    }`}
                  >
                    {/* Speaker Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            isOp ? 'bg-blue-600 text-white' : 'bg-slate-700 text-white'
                          }`}
                        >
                          {isOp ? 'オペレーター（当社）' : '店舗様（店長・担当者）'}
                        </span>
                        {dlg.keyPoints && (
                          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500">
                            {dlg.keyPoints.map((kp, idx) => (
                              <span key={idx} className="bg-white/80 border border-slate-200 px-1.5 py-0.5 rounded text-[11px] text-slate-700 font-medium">
                                ✓ {kp}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Copy Button */}
                      <button
                        onClick={() => handleCopy(dlg.text, dlg.id)}
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-700 p-1 rounded hover:bg-white/60 transition-colors"
                        title="テキストをコピー"
                      >
                        {copiedId === dlg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600 font-medium">コピー済</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>コピー</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Dialogue Text */}
                    <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed font-normal">
                      {dlg.text}
                    </div>

                    {/* Tips / Notes */}
                    {dlg.tips && dlg.tips.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-start gap-1.5 text-xs text-slate-600">
                        <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-slate-700">話し方のポイント：</span>
                          <span className="ml-1 text-slate-600">{dlg.tips.join(' / ')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
