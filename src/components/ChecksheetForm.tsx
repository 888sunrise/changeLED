/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ClipboardCheck,
  Printer,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Key,
  Trash2,
  FileText,
  Building,
  Store,
  Car,
  Eye,
  PlusCircle,
} from 'lucide-react';
import { HearingRecord } from '../types/hearing';
import { PrintSheetModal } from './PrintSheetModal';

interface ChecksheetFormProps {
  records: HearingRecord[];
  onDeleteRecord: (id: string) => void;
  onStartNewHearing: () => void;
}

export const ChecksheetForm: React.FC<ChecksheetFormProps> = ({
  records,
  onDeleteRecord,
  onStartNewHearing,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRequirement, setFilterRequirement] = useState<'all' | 'required' | 'not_required'>('all');
  const [selectedRecordForPrint, setSelectedRecordForPrint] = useState<HearingRecord | null>(null);

  // Filtered list
  const filteredRecords = records.filter((r) => {
    if (filterRequirement !== 'all' && r.surveyRequirement !== filterRequirement) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.storeName.toLowerCase().includes(q) ||
      (r.storeId && r.storeId.toLowerCase().includes(q)) ||
      r.contactPerson.toLowerCase().includes(q) ||
      (r.notes && r.notes.toLowerCase().includes(q))
    );
  });

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      '記録ID',
      '受付日時',
      '店舗名',
      '店舗ID',
      '対応者名',
      '役職',
      '電話番号',
      'LED化状況',
      '残存箇所',
      '設置場所区分',
      '訪問調査要否',
      '訪問予定期間',
      '希望時間帯',
      '第2希望時間帯',
      '作業帯',
      '夜間発動',
      '鍵預かり可否',
      '施錠返却手順',
      'オペレーター',
      '特記事項',
    ];

    const rows = filteredRecords.map((r) => [
      `"${r.id}"`,
      `"${r.timestamp}"`,
      `"${r.storeName}"`,
      `"${r.storeId || ''}"`,
      `"${r.contactPerson}"`,
      `"${r.contactRole || ''}"`,
      `"${r.phoneNumber}"`,
      `"${r.ledStatus === 'all_led' ? '全灯LED済' : r.ledStatus === 'partial_led' ? '一部未LED' : '未着手'}"`,
      `"${r.partialAreas || ''}"`,
      `"${r.locationCategory === 'builtin' ? 'ビルトイン' : r.locationCategory === 'foodcourt' ? 'フードコート' : r.locationCategory === 'freesta' ? 'ロードサイド' : '未特定'}"`,
      `"${r.surveyRequirement === 'not_required' ? '不要(案件完了)' : '要訪問調査'}"`,
      `"${r.visitPeriodStart && r.visitPeriodEnd ? `${r.visitPeriodStart}〜${r.visitPeriodEnd}` : r.preferredDate1 || ''}"`,
      `"${r.preferredTimeSlot1 || ''}"`,
      `"${r.preferredTimeSlot2 || ''}"`,
      `"${r.workTiming || ''}"`,
      `"${r.afterHoursTriggered ? '発動' : '未発動'}"`,
      `"${r.keyCustody}"`,
      `"${(r.lockProcedure || '').replace(/"/g, '""')}"`,
      `"${r.operatorName}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LED事前調査ヒアリング記録_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printable Blank Sheet
  const handlePrintBlankSheet = () => {
    const blankRecord: HearingRecord = {
      id: 'BLANK-TEMPLATE',
      timestamp: '____年__月__日 __:__',
      operatorName: '＿＿＿＿＿＿',
      storeName: '＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿',
      storeId: '＿＿＿＿＿＿',
      contactPerson: '＿＿＿＿＿＿',
      contactRole: '店長 / ＿＿',
      phoneNumber: '＿＿＿-＿＿＿＿-＿＿＿＿',
      ledStatus: 'partial_led',
      partialAreas: '＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿',
      locationCategory: 'builtin',
      surveyRequirement: 'required',
      preferredDate1: '____年__月__日',
      preferredDate2: '____年__月__日',
      workTiming: 'idle_time',
      afterHoursTriggered: true,
      keyCustody: 'possible',
      lockProcedure: '＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿',
      emergencyContact: '＿＿＿＿＿＿＿＿＿＿＿＿',
      notes: '＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿',
      status: 'draft',
    };
    setSelectedRecordForPrint(blankRecord);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-blue-600" />
            <span>ヒアリング内容 記録チェックシート & 案件管理</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            電話ヒアリングで取得した全灯LED化状況、設置区分、日程、戸締り確認事項を管理・CSV出力・帳票印刷できます。
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePrintBlankSheet}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>空きチェック用紙を印刷</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 shadow-xs whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSVエクスポート</span>
          </button>

          <button
            onClick={onStartNewHearing}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>新規ヒアリング登録</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Segmented Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setFilterRequirement('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterRequirement === 'all'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            すべて ({records.length})
          </button>
          <button
            onClick={() => setFilterRequirement('required')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterRequirement === 'required'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            要訪問調査 ({records.filter((r) => r.surveyRequirement === 'required').length})
          </button>
          <button
            onClick={() => setFilterRequirement('not_required')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterRequirement === 'not_required'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            案件終了・調査不要 ({records.filter((r) => r.surveyRequirement === 'not_required').length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="店舗名・担当者で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all"
          />
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">受付日時</th>
                <th className="py-3 px-4">対象店舗名 / ID</th>
                <th className="py-3 px-4">対応者</th>
                <th className="py-3 px-4">LED化状況</th>
                <th className="py-3 px-4">設置区分</th>
                <th className="py-3 px-4">訪問調査判定</th>
                <th className="py-3 px-4">訪問予定期間 / 希望時間帯</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    条件に一致するヒアリング記録がありません。
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isDone = r.surveyRequirement === 'not_required';
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {r.timestamp}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{r.storeName}</div>
                        {r.storeId && (
                          <div className="text-[11px] font-mono text-slate-400">{r.storeId}</div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{r.contactPerson} 様</div>
                        <div className="text-[11px] text-slate-400">{r.contactRole || '店長'}</div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {r.ledStatus === 'all_led' ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>全灯LED済</span>
                          </span>
                        ) : r.ledStatus === 'partial_led' ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>一部未LED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>未着手（全蛍光灯）</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {r.locationCategory === 'builtin' ? (
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <Building className="w-3.5 h-3.5 text-blue-500" />
                            <span>ビルトイン</span>
                          </span>
                        ) : r.locationCategory === 'foodcourt' ? (
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <Store className="w-3.5 h-3.5 text-amber-500" />
                            <span>フードコート</span>
                          </span>
                        ) : r.locationCategory === 'freesta' ? (
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <Car className="w-3.5 h-3.5 text-emerald-500" />
                            <span>ロードサイド</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>調査不要・案件終了</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                            <Calendar className="w-3 h-3" />
                            <span>要訪問調査</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs">
                        {isDone ? (
                          <span className="text-slate-400">訪問なし</span>
                        ) : (
                          <div>
                            <div className="font-semibold text-slate-800">
                              {r.visitPeriodStart && r.visitPeriodEnd
                                ? `${r.visitPeriodStart} 〜 ${r.visitPeriodEnd}`
                                : r.preferredDate1 || '未定'}
                            </div>
                            {r.preferredTimeSlot1 && (
                              <div className="text-[11px] text-blue-600 mt-0.5">
                                {r.preferredTimeSlot1 === 'idle_time'
                                  ? 'アイドルタイム (14:00〜16:00)'
                                  : r.preferredTimeSlot1 === 'morning'
                                  ? '午前中 (10:00〜12:00)'
                                  : r.preferredTimeSlot1 === 'afternoon'
                                  ? '午後 (13:00〜17:00)'
                                  : r.preferredTimeSlot1 === 'after_hours'
                                  ? '閉店後・夜間'
                                  : '時間帯指定なし'}
                              </div>
                            )}
                            {r.afterHoursTriggered && (
                              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 mt-0.5">
                                <Key className="w-3 h-3" />
                                <span>夜間・戸締り確認済</span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedRecordForPrint(r)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors"
                            title="カルテ・帳票印刷"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteRecord(r.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Sheet View Modal */}
      <PrintSheetModal
        record={selectedRecordForPrint}
        onClose={() => setSelectedRecordForPrint(null)}
      />
    </div>
  );
};
