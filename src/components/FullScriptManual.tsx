/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TALK_SCRIPTS } from '../data/scripts';
import { Copy, Check, Search, BookOpen, AlertCircle, Sparkles, Printer, FileText } from 'lucide-react';

export const FullScriptManual: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export clean formatted text for Google Docs / Word
  const handleExportGoogleDocsText = () => {
    let docText = `=======================================================\n`;
    docText += `【LED切替 事前調査 電話ヒアリング 実務トークスクリプト全文マニュアル】\n`;
    docText += `作成日: 2026年9月現在 / 対象: オペレーター実務・手元参照用\n`;
    docText += `=======================================================\n\n`;

    TALK_SCRIPTS.forEach((sec, idx) => {
      docText += `-------------------------------------------------------\n`;
      docText += `■ ${sec.title}\n`;
      docText += `概要: ${sec.shortDesc}\n`;
      if (sec.conditionNotice) {
        docText += `※発動条件: ${sec.conditionNotice}\n`;
      }
      docText += `-------------------------------------------------------\n\n`;

      sec.dialogues.forEach((dlg) => {
        const role = dlg.speaker === 'operator' ? '【オペレーター（当社）】' : '【店舗様（店長・担当者）】';
        docText += `${role}\n${dlg.text}\n`;
        if (dlg.tips && dlg.tips.length > 0) {
          docText += `  ・話し方のポイント: ${dlg.tips.join(' / ')}\n`;
        }
        if (dlg.keyPoints && dlg.keyPoints.length > 0) {
          docText += `  ・確認事項: ${dlg.keyPoints.join(' / ')}\n`;
        }
        docText += `\n`;
      });
      docText += `\n`;
    });

    navigator.clipboard.writeText(docText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 3000);
  };

  const handlePrint = () => {
    // Switch to all categories temporarily when printing if needed, or print current view
    window.print();
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
      {/* Printable Header (Visible only when printing) */}
      <div className="hidden print:block mb-8 pb-4 border-b-2 border-slate-900">
        <h1 className="text-2xl font-bold text-slate-900">
          蛍光灯→LED切替 事前調査 電話ヒアリング トークスクリプト実務マニュアル
        </h1>
        <div className="text-xs text-slate-600 mt-2 flex justify-between">
          <span>対象: コールセンター実務・オペレーター研修用</span>
          <span>出力日: {new Date().toLocaleDateString('ja-JP')}</span>
        </div>
      </div>

      {/* Top Banner / Controls (Hidden on Print) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span>トークスクリプト全文マニュアル</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            丁寧なビジネス敬語で構成された電話ヒアリングの実務台本です。印刷・PDF保存やGoogleドキュメントへそのまま貼り付けできます。
          </p>
        </div>

        {/* Action Buttons: PDF/Print & Google Docs Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Print / PDF Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
            title="ブラウザの印刷ダイアログからPDFとして保存またはプリンターで印刷できます"
          >
            <Printer className="w-4 h-4" />
            <span>印刷 / PDF出力</span>
          </button>

          {/* Copy formatted text for Google Docs */}
          <button
            onClick={handleExportGoogleDocsText}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors shadow-xs"
            title="GoogleドキュメントやWordに貼り付け可能な整形テキストを全コピーします"
          >
            {copiedAll ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 font-bold">ドキュメント用コピー完了！</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Googleドキュメント用に全コピー</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search & Category Filter Controls (Hidden on Print) */}
      <div className="space-y-3 print:hidden">
        {/* Search */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="台本内をキーワード検索（例: ビルトイン、完全無料、アイドルタイム、鍵）..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all shadow-xs"
          />
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
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sections List */}
      <div className="space-y-6">
        {filteredSections.map((sec) => (
          <div
            key={sec.id}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs avoid-break print:border-slate-300 print:shadow-none"
          >
            {/* Section Header */}
            <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:bg-slate-100 print:border-slate-300">
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-sm sm:text-base text-slate-900">{sec.title}</span>
                {sec.badgeText && (
                  <span className="text-xs bg-amber-100 text-amber-800 border border-amber-300 font-semibold px-2 py-0.5 rounded">
                    {sec.badgeText}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 print:text-slate-600">{sec.shortDesc}</p>
            </div>

            {/* Condition Notice if any */}
            {sec.conditionNotice && (
              <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center gap-2 text-xs text-amber-900 print:border-amber-300">
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
                    className={`relative rounded-xl p-4 transition-all avoid-break ${
                      isOp
                        ? 'bg-blue-50/60 border border-blue-200 ml-0 sm:mr-8 print:bg-slate-50 print:border-slate-300'
                        : 'bg-slate-50 border border-slate-200 ml-4 sm:ml-8 print:bg-white print:border-slate-300'
                    }`}
                  >
                    {/* Speaker Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded print:text-black print:border print:border-slate-400 ${
                            isOp
                              ? 'bg-blue-600 text-white print:bg-slate-200'
                              : 'bg-slate-700 text-white print:bg-slate-100'
                          }`}
                        >
                          {isOp ? 'オペレーター（当社）' : '店舗様（店長・担当者）'}
                        </span>
                        {dlg.keyPoints && (
                          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500 print:flex">
                            {dlg.keyPoints.map((kp, idx) => (
                              <span
                                key={idx}
                                className="bg-white/80 border border-slate-200 px-1.5 py-0.5 rounded text-[11px] text-slate-700 font-medium print:border-slate-300"
                              >
                                ✓ {kp}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Copy Button (Hidden on Print) */}
                      <button
                        onClick={() => handleCopy(dlg.text, dlg.id)}
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-700 p-1 rounded hover:bg-white/60 transition-colors print:hidden"
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
                    <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed font-normal print:text-black">
                      {dlg.text}
                    </div>

                    {/* Tips / Notes */}
                    {dlg.tips && dlg.tips.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-start gap-1.5 text-xs text-slate-600 print:border-slate-300 print:text-slate-700">
                        <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5 print:hidden" />
                        <div>
                          <span className="font-semibold text-slate-700 print:text-black">話し方のポイント：</span>
                          <span className="ml-1 text-slate-600 print:text-slate-800">{dlg.tips.join(' / ')}</span>
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

