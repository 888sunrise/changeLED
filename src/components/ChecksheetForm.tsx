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
  Edit3,
  CalendarClock,
  Layers,
  BarChart3,
  X,
} from 'lucide-react';
import { HearingRecord } from '../types/hearing';
import { PrintSheetModal } from './PrintSheetModal';

interface ChecksheetFormProps {
  records: HearingRecord[];
  onDeleteRecord: (id: string) => void;
  onEditRecord: (record: HearingRecord) => void;
  onStartNewHearing: () => void;
}

export const ChecksheetForm: React.FC<ChecksheetFormProps> = ({
  records,
  onDeleteRecord,
  onEditRecord,
  onStartNewHearing,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRequirement, setFilterRequirement] = useState<'all' | 'required' | 'not_required' | 'recontact'>('all');
  const [selectedRecordForPrint, setSelectedRecordForPrint] = useState<HearingRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<HearingRecord | null>(null);

  // Recontact record condition (only active recontacts, excluding completed ones)
  const isRecontactRecord = (r: HearingRecord) => {
    if (r.status === 'completed' || r.callStatus === '完了') return false;
    if (r.surveyRequirement === 'required' || r.surveyRequirement === 'not_required') return false;
    return Boolean(
      r.callbackScheduledAt ||
      r.status === 'follow_up_needed' ||
      r.callStatus === '再連絡待ち' ||
      r.callStatus === '折返待ち' ||
      r.callStatus === '出ず' ||
      r.callStatus === '電話するも出ず' ||
      r.callStatus === '留守電' ||
      r.callStatus === '担当不在' ||
      r.surveyRequirement === 'pending'
    );
  };

  // Dashboard Metrics Calculation
  const totalCount = records.length;
  const requiredCount = records.filter((r) => r.surveyRequirement === 'required').length;
  const recontactCount = records.filter(isRecontactRecord).length;
  const notRequiredCount = records.filter((r) => r.surveyRequirement === 'not_required').length;

  const requiredPct = totalCount > 0 ? ((requiredCount / totalCount) * 100).toFixed(1).replace(/\.0$/, '') : '0';
  const recontactPct = totalCount > 0 ? ((recontactCount / totalCount) * 100).toFixed(1).replace(/\.0$/, '') : '0';
  const notRequiredPct = totalCount > 0 ? ((notRequiredCount / totalCount) * 100).toFixed(1).replace(/\.0$/, '') : '0';

  const requiredNum = totalCount > 0 ? (requiredCount / totalCount) * 100 : 0;
  const recontactNum = totalCount > 0 ? (recontactCount / totalCount) * 100 : 0;
  const notRequiredNum = totalCount > 0 ? (notRequiredCount / totalCount) * 100 : 0;

  // Filtered list
  const filteredRecords = records.filter((r) => {
    if (filterRequirement === 'required') {
      if (r.surveyRequirement !== 'required') return false;
    } else if (filterRequirement === 'not_required') {
      if (r.surveyRequirement !== 'not_required') return false;
    } else if (filterRequirement === 'recontact') {
      if (!isRecontactRecord(r)) return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.storeName.toLowerCase().includes(q) ||
      (r.storeId && r.storeId.toLowerCase().includes(q)) ||
      r.contactPerson.toLowerCase().includes(q) ||
      (r.notes && r.notes.toLowerCase().includes(q)) ||
      (r.callStatus && r.callStatus.toLowerCase().includes(q)) ||
      (r.callbackScheduledAt && r.callbackScheduledAt.toLowerCase().includes(q))
    );
  });

  // Render timestamp in two lines if modified/updated
  const renderTimestamp = (ts: string) => {
    const match = ts.match(/^(.*?)\s*\((修正|更新):\s*(.*?)\)$/);
    if (match) {
      const orig = match[1].trim();
      const type = match[2];
      const updated = match[3].trim();
      return (
        <div className="space-y-0.5 leading-tight">
          <div className="font-mono text-slate-800 font-medium whitespace-nowrap">{orig}</div>
          <div className="text-[11px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block font-semibold whitespace-nowrap">
            {type}: {updated}
          </div>
        </div>
      );
    }
    return <div className="font-mono text-slate-600 whitespace-nowrap">{ts}</div>;
  };

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

      {/* Visual KPI Dashboard Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <span>ヒアリング集計ダッシュボード</span>
                <span className="text-xs text-slate-500 font-normal hidden sm:inline">（各カードクリックで絞り込み可能）</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                登録済みカルテ全体の調査要否判定・再連絡ステータスと構成比率
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">カルテ総登録数:</span>
            <span className="font-bold font-mono text-slate-900 text-sm bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
              {totalCount} 件
            </span>
          </div>
        </div>

        {/* 4 Dashboard Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: すべて */}
          <button
            type="button"
            onClick={() => setFilterRequirement('all')}
            className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
              filterRequirement === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold ${filterRequirement === 'all' ? 'text-slate-200' : 'text-slate-600'}`}>
                すべて
              </span>
              <Layers className={`w-4 h-4 ${filterRequirement === 'all' ? 'text-slate-300' : 'text-slate-500'}`} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono tracking-tight">{totalCount}</span>
              <span className={`text-xs ${filterRequirement === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>件</span>
              <span className={`text-[11px] font-bold ml-auto px-1.5 py-0.5 rounded ${
                filterRequirement === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                100%
              </span>
            </div>
            <div className={`mt-2 text-[11px] leading-tight truncate ${
              filterRequirement === 'all' ? 'text-slate-300' : 'text-slate-500'
            }`}>
              カルテ登録全件を表示
            </div>
          </button>

          {/* Card 2: 要訪問調査 */}
          <button
            type="button"
            onClick={() => setFilterRequirement('required')}
            className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
              filterRequirement === 'required'
                ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/20'
                : 'bg-blue-50/60 hover:bg-blue-100/70 text-slate-800 border-blue-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold ${filterRequirement === 'required' ? 'text-blue-100' : 'text-blue-900'}`}>
                要訪問調査
              </span>
              <Calendar className={`w-4 h-4 ${filterRequirement === 'required' ? 'text-blue-200' : 'text-blue-600'}`} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black font-mono tracking-tight ${filterRequirement === 'required' ? 'text-white' : 'text-blue-950'}`}>
                {requiredCount}
              </span>
              <span className={`text-xs ${filterRequirement === 'required' ? 'text-blue-100' : 'text-blue-700'}`}>件</span>
              <span className={`text-xs font-black ml-auto font-mono px-1.5 py-0.5 rounded ${
                filterRequirement === 'required' ? 'bg-white/20 text-white' : 'bg-blue-200 text-blue-900'
              }`}>
                {requiredPct}%
              </span>
            </div>
            <div className={`mt-2 text-[11px] leading-tight truncate ${
              filterRequirement === 'required' ? 'text-blue-100' : 'text-blue-700'
            }`}>
              一部未LED・蛍光灯残存店舗
            </div>
          </button>

          {/* Card 3: 再連絡 */}
          <button
            type="button"
            onClick={() => setFilterRequirement('recontact')}
            className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
              filterRequirement === 'recontact'
                ? 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-500/20'
                : 'bg-amber-50/60 hover:bg-amber-100/70 text-slate-800 border-amber-200 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold ${filterRequirement === 'recontact' ? 'text-amber-100' : 'text-amber-900'}`}>
                再連絡
              </span>
              <CalendarClock className={`w-4 h-4 ${filterRequirement === 'recontact' ? 'text-amber-200' : 'text-amber-600'}`} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black font-mono tracking-tight ${filterRequirement === 'recontact' ? 'text-white' : 'text-amber-950'}`}>
                {recontactCount}
              </span>
              <span className={`text-xs ${filterRequirement === 'recontact' ? 'text-amber-100' : 'text-amber-700'}`}>件</span>
              <span className={`text-xs font-black ml-auto font-mono px-1.5 py-0.5 rounded ${
                filterRequirement === 'recontact' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'
              }`}>
                {recontactPct}%
              </span>
            </div>
            <div className={`mt-2 text-[11px] leading-tight truncate ${
              filterRequirement === 'recontact' ? 'text-amber-100' : 'text-amber-800'
            }`}>
              不在・折返待ち・再架電予約
            </div>
          </button>

          {/* Card 4: 案件終了・調査不要 */}
          <button
            type="button"
            onClick={() => setFilterRequirement('not_required')}
            className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
              filterRequirement === 'not_required'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                : 'bg-emerald-50/60 hover:bg-emerald-100/70 text-slate-800 border-emerald-200 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold ${filterRequirement === 'not_required' ? 'text-emerald-100' : 'text-emerald-900'}`}>
                案件終了・調査不要
              </span>
              <CheckCircle2 className={`w-4 h-4 ${filterRequirement === 'not_required' ? 'text-emerald-200' : 'text-emerald-600'}`} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black font-mono tracking-tight ${filterRequirement === 'not_required' ? 'text-white' : 'text-emerald-950'}`}>
                {notRequiredCount}
              </span>
              <span className={`text-xs ${filterRequirement === 'not_required' ? 'text-emerald-100' : 'text-emerald-700'}`}>件</span>
              <span className={`text-xs font-black ml-auto font-mono px-1.5 py-0.5 rounded ${
                filterRequirement === 'not_required' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900'
              }`}>
                {notRequiredPct}%
              </span>
            </div>
            <div className={`mt-2 text-[11px] font-bold leading-tight truncate flex items-center gap-1 ${
              filterRequirement === 'not_required' ? 'text-emerald-100' : 'text-emerald-700'
            }`}>
              <span>→ 案内終了</span>
            </div>
          </button>
        </div>

        {/* Visual Stacked Composition Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-medium gap-1">
            <span>全体ステータス構成比率バー</span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 inline-block"></span>
                <span>要訪問調査: <strong>{requiredPct}%</strong> ({requiredCount}件)</span>
              </span>
              <span className="flex items-center gap-1 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block"></span>
                <span>再連絡: <strong>{recontactPct}%</strong> ({recontactCount}件)</span>
              </span>
              <span className="flex items-center gap-1 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block"></span>
                <span>案内終了: <strong>{notRequiredPct}%</strong> ({notRequiredCount}件)</span>
              </span>
            </div>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            {requiredNum > 0 && (
              <div
                style={{ width: `${requiredNum}%` }}
                className="bg-blue-500 h-full transition-all duration-300"
                title={`要訪問調査: ${requiredCount}件 (${requiredPct}%)`}
              />
            )}
            {recontactNum > 0 && (
              <div
                style={{ width: `${recontactNum}%` }}
                className="bg-amber-500 h-full transition-all duration-300"
                title={`再連絡: ${recontactCount}件 (${recontactPct}%)`}
              />
            )}
            {notRequiredNum > 0 && (
              <div
                style={{ width: `${notRequiredNum}%` }}
                className="bg-emerald-500 h-full transition-all duration-300"
                title={`案件終了・案内終了: ${notRequiredCount}件 (${notRequiredPct}%)`}
              />
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Segmented Buttons */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setFilterRequirement('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              filterRequirement === 'all'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            すべて ({totalCount})
          </button>
          <button
            onClick={() => setFilterRequirement('required')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              filterRequirement === 'required'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            要訪問調査 ({requiredCount})
          </button>
          <button
            onClick={() => setFilterRequirement('recontact')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              filterRequirement === 'recontact'
                ? 'bg-amber-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            再連絡 ({recontactCount})
          </button>
          <button
            onClick={() => setFilterRequirement('not_required')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              filterRequirement === 'not_required'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            案件終了・調査不要 ({notRequiredCount})
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="店舗名・担当者で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                title="検索クリア"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {searchQuery && (
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200 whitespace-nowrap">
              {filteredRecords.length}件該当
            </span>
          )}
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
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderTimestamp(r.timestamp)}
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
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>全灯LED済</span>
                            </span>
                            {(r.autoCompletedByDocScope || (r.notes && r.notes.includes('P列'))) && (
                              <span className="text-[10px] text-emerald-600 block font-normal">
                                (P列:対象外連動)
                              </span>
                            )}
                          </div>
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
                        {r.surveyRequirement === 'not_required' ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>調査不要・案件終了</span>
                            </span>
                            {(r.autoCompletedByDocScope || (r.notes && r.notes.includes('P列'))) && (
                              <span className="text-[10px] text-slate-500 block">
                                P列結果連動
                              </span>
                            )}
                          </div>
                        ) : r.surveyRequirement === 'required' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>要訪問調査</span>
                          </span>
                        ) : r.callStatus ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            r.callStatus === '出ず' || r.callStatus === '電話するも出ず'
                              ? 'bg-rose-100 text-rose-800'
                              : r.callStatus === '留守電'
                              ? 'bg-amber-100 text-amber-800'
                              : r.callStatus === '折返待ち'
                              ? 'bg-purple-100 text-purple-800'
                              : r.callStatus === '再連絡待ち'
                              ? 'bg-cyan-100 text-cyan-800'
                              : r.callStatus === '担当不在'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}>
                            <span>{r.callStatus}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                            <span>未確定</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs">
                        {r.surveyRequirement === 'pending' && r.callbackScheduledAt ? (
                          <div className="font-semibold text-cyan-800 bg-cyan-50 px-2.5 py-1 rounded border border-cyan-200 inline-block">
                            <span>📅 再連絡予約: {r.callbackScheduledAt}</span>
                          </div>
                        ) : r.surveyRequirement === 'not_required' ? (
                          <span className="text-slate-400">訪問なし（案件終了）</span>
                        ) : (
                          <div>
                            <div className="font-semibold text-slate-800">
                              {r.visitPeriodStart && r.visitPeriodEnd
                                ? `${r.visitPeriodStart} 〜 ${r.visitPeriodEnd}`
                                : r.preferredDate1 && r.preferredDate2
                                ? `${r.preferredDate1} 〜 ${r.preferredDate2}`
                                : r.visitPeriodStart || r.preferredDate1 || '未定'}
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
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 修正ボタン (通話ナビへ戻って修正・上書き保存) */}
                          <button
                            type="button"
                            onClick={() => onEditRecord(r)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-900 rounded-md border border-blue-200 transition-colors shadow-2xs cursor-pointer"
                            title="通話ナビに戻って修正・上書き保存"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>修正</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedRecordForPrint(r)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="カルテ・帳票印刷"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setRecordToDelete(r)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
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
        onEditRecord={onEditRecord}
      />

      {/* Deletion Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">記録カルテの削除</h3>
                <p className="text-xs text-slate-500">この操作は取り消せません</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-5">
              店舗「<strong className="text-slate-900 font-bold">{recordToDelete.storeName}</strong>」のヒアリング記録（受付日時: {recordToDelete.timestamp}）を削除してもよろしいですか？
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = recordToDelete.id;
                  setRecordToDelete(null);
                  onDeleteRecord(targetId);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>削除する</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
