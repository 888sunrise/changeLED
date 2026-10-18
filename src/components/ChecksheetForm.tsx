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
  MapPin,
} from 'lucide-react';
import { HearingRecord, StoreRecord, getStoreKey, isSameStore } from '../types/hearing';
import { PrintSheetModal } from './PrintSheetModal';

const PREFECTURE_REGEX = /^(東京都|北海道|(?:京都|大阪)府|.{2,3}県)/;

export function extractPrefecture(text: string): string {
  if (!text) return '';
  const match = text.match(PREFECTURE_REGEX);
  if (match) return match[1];

  // 地名・店舗名からの推測補完（テストデータ等）
  if (text.includes('渋谷') || text.includes('新宿') || text.includes('池袋') || text.includes('銀座') || text.includes('東京') || text.includes('八王子') || text.includes('町田')) return '東京都';
  if (text.includes('幕張') || text.includes('津田沼') || text.includes('習志野') || text.includes('千葉') || text.includes('船橋') || text.includes('柏') || text.includes('市川') || text.includes('我孫子') || text.includes('木更津')) return '千葉県';
  if (text.includes('相模原') || text.includes('横浜') || text.includes('川崎') || text.includes('神奈川')) return '神奈川県';
  if (text.includes('さいたま') || text.includes('大宮') || text.includes('埼玉') || text.includes('川越')) return '埼玉県';
  return '';
}

export interface RecordAddressInfo {
  fullAddress: string;
  prefecture: string;
  shortAddress: string;
}

export function getRecordAddress(r: HearingRecord, stores?: StoreRecord[]): RecordAddressInfo {
  let full = (r.storeAddress || '').trim();
  let pref = (r.prefecture || '').trim();

  if (stores && stores.length > 0) {
    const matched = stores.find(
      (s) =>
        (r.storeId && s.storeCode && s.storeCode.trim().toLowerCase() === r.storeId.trim().toLowerCase()) ||
        (r.storeName && s.storeName && s.storeName.trim() === r.storeName.trim()) ||
        (r.storeName && s.storeName && (s.storeName.includes(r.storeName) || r.storeName.includes(s.storeName)))
    );
    if (matched) {
      if (!full) {
        full = `${matched.address1 || ''} ${matched.address2 || ''} ${matched.buildingName || ''}`.trim();
      }
      if (!pref) {
        pref = extractPrefecture(matched.address1 || '');
      }
    }
  }

  if (!pref) {
    pref = extractPrefecture(full) || extractPrefecture(r.storeName);
  }
  if (!full && pref) {
    full = `${pref} ${r.storeName}`;
  }

  let short = '';
  if (full) {
    const cityMatch = full.match(/^(東京都|北海道|(?:京都|大阪)府|.{2,3}県)([^市区町村]+[市区町村])/);
    if (cityMatch) {
      short = `${cityMatch[1]}${cityMatch[2]}`;
    } else {
      short = pref || full.slice(0, 10);
    }
  } else if (pref) {
    short = pref;
  }

  return {
    fullAddress: full,
    prefecture: pref,
    shortAddress: short,
  };
}

interface ChecksheetFormProps {
  records: HearingRecord[];
  stores?: StoreRecord[];
  onDeleteRecord: (id: string) => void;
  onEditRecord: (record: HearingRecord) => void;
  onStartNewHearing: () => void;
}

export const ChecksheetForm: React.FC<ChecksheetFormProps> = ({
  records,
  stores,
  onDeleteRecord,
  onEditRecord,
  onStartNewHearing,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRequirement, setFilterRequirement] = useState<'all' | 'required' | 'completed' | 'recontact' | 'not_required'>('all');
  const [excludeCompleted, setExcludeCompleted] = useState<boolean>(false);
  const [selectedRecordForPrint, setSelectedRecordForPrint] = useState<HearingRecord | null>(null);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [recordsForPrint, setRecordsForPrint] = useState<HearingRecord[]>([]);
  const [recordToDelete, setRecordToDelete] = useState<HearingRecord | null>(null);

  // Helper to match store record from stores master
  const getMatchedStore = React.useCallback(
    (r: HearingRecord): StoreRecord | undefined => {
      if (!stores || stores.length === 0) return undefined;
      const rStoreId = (r.storeId || '').trim().toLowerCase();
      const rStoreName = (r.storeName || '').trim();
      return stores.find((s) => {
        if (rStoreId && s.storeCode && s.storeCode.trim().toLowerCase() === rStoreId) return true;
        if (rStoreName && s.storeName && s.storeName.trim() === rStoreName) return true;
        if (isSameStore({ storeCode: s.storeCode, storeName: s.storeName, no: s.no }, r)) return true;
        return false;
      });
    },
    [stores]
  );

  // Check if store survey is completed (either directly in record or from P列:回収済 in stores)
  const checkIsDocCollected = React.useCallback(
    (r: HearingRecord): boolean => {
      if (r.surveyRequirement === 'completed') return true;
      const matched = getMatchedStore(r);
      return Boolean(matched && (matched.surveyDocCollection === '回収済' || Boolean(matched.surveyDocDate)));
    },
    [getMatchedStore]
  );

  // Check if store is out of scope / all LED (from record or from P列:対象外 / 全灯LED in stores)
  const checkIsOutOfScope = React.useCallback(
    (r: HearingRecord): boolean => {
      if (r.surveyRequirement === 'not_required' || r.ledStatus === 'all_led') return true;
      const matched = getMatchedStore(r);
      return Boolean(
        matched &&
          (matched.surveyDocCollection === '対象外' ||
            Boolean(matched.remarks1 && matched.remarks1.includes('全灯LED')))
      );
    },
    [getMatchedStore]
  );

  // Multi-selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredRecords.map((r) => r.id);
    const isAllSelected =
      allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedRecordIds.includes(id));
    if (isAllSelected) {
      setSelectedRecordIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedRecordIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedRecordIds([]);
  };

  const handleOpenMultiPrint = (targetRecords?: HearingRecord[]) => {
    if (targetRecords && targetRecords.length > 0) {
      setRecordsForPrint(targetRecords);
      return;
    }
    const selected = records.filter((r) => selectedRecordIds.includes(r.id));
    if (selected.length > 0) {
      setRecordsForPrint(selected);
    } else if (filteredRecords.length > 0) {
      setRecordsForPrint(filteredRecords);
    }
  };

  // Recontact record condition (only active recontacts, excluding completed ones)
  const isRecontactRecord = (r: HearingRecord) => {
    if (r.status === 'completed' || r.callStatus === '完了') return false;
    if (r.surveyRequirement === 'required' || r.surveyRequirement === 'not_required' || r.surveyRequirement === 'completed') return false;
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

  // Defensive deduplication of records by store (never display duplicates in UI)
  const displayRecords = React.useMemo(() => {
    const seen = new Set<string>();
    const res: HearingRecord[] = [];
    // Sort so completed / all_led records take precedence, then newest timestamp
    const sorted = [...records].sort((a, b) => {
      const aComp = (a.status === 'completed' || a.ledStatus === 'all_led' || a.surveyRequirement === 'completed') ? 1 : 0;
      const bComp = (b.status === 'completed' || b.ledStatus === 'all_led' || b.surveyRequirement === 'completed') ? 1 : 0;
      if (aComp !== bComp) return bComp - aComp;
      return (b.timestamp || '').localeCompare(a.timestamp || '');
    });

    for (const r of sorted) {
      const key = getStoreKey(r, stores);
      if (!seen.has(key)) {
        seen.add(key);
        res.push(r);
      }
    }
    return res;
  }, [records, stores]);

  // Dashboard Metrics Calculation
  const totalCount = displayRecords.length;
  const completedCount = displayRecords.filter(checkIsDocCollected).length;
  const notRequiredCount = displayRecords.filter(checkIsOutOfScope).length;
  const requiredCount = displayRecords.filter(
    (r) => !checkIsDocCollected(r) && !checkIsOutOfScope(r) && r.surveyRequirement === 'required'
  ).length;
  const recontactCount = displayRecords.filter(
    (r) => !checkIsDocCollected(r) && !checkIsOutOfScope(r) && isRecontactRecord(r)
  ).length;

  const requiredPct = totalCount > 0 ? ((requiredCount / totalCount) * 100).toFixed(1).replace(/\.0$/, '') : '0';
  const completedPct = totalCount > 0 ? ((completedCount / totalCount) * 100).toFixed(1).replace(/\.0$/, '') : '0';
  const recontactPct = totalCount > 0 ? ((recontactCount / totalCount) * 100).toFixed(1).replace(/\.0$/, '') : '0';
  const notRequiredPct = totalCount > 0 ? ((notRequiredCount / totalCount) * 100).toFixed(1).replace(/\.0$/, '') : '0';

  const requiredNum = totalCount > 0 ? (requiredCount / totalCount) * 100 : 0;
  const completedNum = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const recontactNum = totalCount > 0 ? (recontactCount / totalCount) * 100 : 0;
  const notRequiredNum = totalCount > 0 ? (notRequiredCount / totalCount) * 100 : 0;

  // Filtered list
  const filteredRecords = displayRecords.filter((r) => {
    const isCollected = checkIsDocCollected(r);
    const isOut = checkIsOutOfScope(r);

    // 要望: 完了・対象外を除外チェックがONの場合、調査完了および案件終了（対象外）を除外
    if (excludeCompleted && (isCollected || isOut)) {
      return false;
    }

    if (filterRequirement === 'required') {
      if (isCollected || isOut || r.surveyRequirement !== 'required') return false;
    } else if (filterRequirement === 'completed') {
      if (!isCollected) return false;
    } else if (filterRequirement === 'not_required') {
      if (!isOut) return false;
    } else if (filterRequirement === 'recontact') {
      if (isCollected || isOut || !isRecontactRecord(r)) return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const addressInfo = getRecordAddress(r, stores);

    return (
      r.storeName.toLowerCase().includes(q) ||
      (r.storeId && r.storeId.toLowerCase().includes(q)) ||
      r.contactPerson.toLowerCase().includes(q) ||
      (r.contactRole && r.contactRole.toLowerCase().includes(q)) ||
      (r.phoneNumber && r.phoneNumber.toLowerCase().includes(q)) ||
      (r.operatorName && r.operatorName.toLowerCase().includes(q)) ||
      (r.notes && r.notes.toLowerCase().includes(q)) ||
      (r.callStatus && r.callStatus.toLowerCase().includes(q)) ||
      (r.callbackScheduledAt && r.callbackScheduledAt.toLowerCase().includes(q)) ||
      (isCollected && ('調査完了'.includes(q) || '回収済'.includes(q))) ||
      (isOut && ('対象外'.includes(q) || '不要'.includes(q))) ||
      // 住所・都道府県検索（裏で検索）
      (addressInfo.fullAddress && addressInfo.fullAddress.toLowerCase().includes(q)) ||
      (addressInfo.prefecture && addressInfo.prefecture.toLowerCase().includes(q)) ||
      (addressInfo.shortAddress && addressInfo.shortAddress.toLowerCase().includes(q))
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
      '都道府県',
      '店舗住所',
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

    const rows = filteredRecords.map((r) => {
      const addr = getRecordAddress(r, stores);
      return [
        `"${r.id}"`,
        `"${r.timestamp}"`,
        `"${r.storeName}"`,
        `"${r.storeId || ''}"`,
        `"${addr.prefecture || ''}"`,
        `"${(addr.fullAddress || '').replace(/"/g, '""')}"`,
        `"${r.contactPerson}"`,
        `"${r.contactRole || ''}"`,
        `"${r.phoneNumber}"`,
        `"${r.ledStatus === 'all_led' ? '全灯LED済' : r.ledStatus === 'partial_led' ? '一部未LED' : '未着手'}"`,
        `"${r.partialAreas || ''}"`,
        `"${r.locationCategory === 'builtin' ? 'ビルトイン' : r.locationCategory === 'foodcourt' ? 'フードコート' : r.locationCategory === 'freesta' ? 'ロードサイド' : '未特定'}"`,
        `"${checkIsDocCollected(r) ? '調査完了' : checkIsOutOfScope(r) ? '不要(案件完了)' : r.surveyRequirement === 'required' ? '要訪問調査' : r.callStatus || '未確定'}"`,
        `"${r.visitPeriodStart && r.visitPeriodEnd ? `${r.visitPeriodStart}〜${r.visitPeriodEnd}` : r.preferredDate1 || ''}"`,
        `"${r.preferredTimeSlot1 || ''}"`,
        `"${r.preferredTimeSlot2 || ''}"`,
        `"${r.workTiming || ''}"`,
        `"${r.afterHoursTriggered ? '発動' : '未発動'}"`,
        `"${r.keyCustody}"`,
        `"${(r.lockProcedure || '').replace(/"/g, '""')}"`,
        `"${r.operatorName}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`,
      ];
    });

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

        {/* 5 Dashboard Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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
              一部未LED・調査待ち店舗
            </div>
          </button>

          {/* Card 3: 調査完了 */}
          <button
            type="button"
            onClick={() => setFilterRequirement('completed')}
            className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
              filterRequirement === 'completed'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                : 'bg-emerald-50/70 hover:bg-emerald-100/80 text-slate-800 border-emerald-200 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold ${filterRequirement === 'completed' ? 'text-emerald-100' : 'text-emerald-900'}`}>
                調査完了
              </span>
              <CheckCircle2 className={`w-4 h-4 ${filterRequirement === 'completed' ? 'text-emerald-200' : 'text-emerald-600'}`} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black font-mono tracking-tight ${filterRequirement === 'completed' ? 'text-white' : 'text-emerald-950'}`}>
                {completedCount}
              </span>
              <span className={`text-xs ${filterRequirement === 'completed' ? 'text-emerald-100' : 'text-emerald-700'}`}>件</span>
              <span className={`text-xs font-black ml-auto font-mono px-1.5 py-0.5 rounded ${
                filterRequirement === 'completed' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900'
              }`}>
                {completedPct}%
              </span>
            </div>
            <div className={`mt-2 text-[11px] leading-tight truncate ${
              filterRequirement === 'completed' ? 'text-emerald-100' : 'text-emerald-800'
            }`}>
              P列:回収済・現地調査完了
            </div>
          </button>

          {/* Card 4: 再連絡 */}
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

          {/* Card 5: 案件終了・調査不要 */}
          <button
            type="button"
            onClick={() => setFilterRequirement('not_required')}
            className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
              filterRequirement === 'not_required'
                ? 'bg-slate-700 text-white border-slate-700 shadow-md ring-2 ring-slate-700/20'
                : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-800 border-slate-300 hover:border-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold ${filterRequirement === 'not_required' ? 'text-slate-200' : 'text-slate-700'}`}>
                案件終了・不要
              </span>
              <CheckCircle2 className={`w-4 h-4 ${filterRequirement === 'not_required' ? 'text-slate-300' : 'text-slate-600'}`} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black font-mono tracking-tight ${filterRequirement === 'not_required' ? 'text-white' : 'text-slate-900'}`}>
                {notRequiredCount}
              </span>
              <span className={`text-xs ${filterRequirement === 'not_required' ? 'text-slate-300' : 'text-slate-600'}`}>件</span>
              <span className={`text-xs font-black ml-auto font-mono px-1.5 py-0.5 rounded ${
                filterRequirement === 'not_required' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                {notRequiredPct}%
              </span>
            </div>
            <div className={`mt-2 text-[11px] font-bold leading-tight truncate flex items-center gap-1 ${
              filterRequirement === 'not_required' ? 'text-slate-200' : 'text-slate-600'
            }`}>
              <span>全灯LED済・P列対象外</span>
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
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block"></span>
                <span>調査完了: <strong>{completedPct}%</strong> ({completedCount}件)</span>
              </span>
              <span className="flex items-center gap-1 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block"></span>
                <span>再連絡: <strong>{recontactPct}%</strong> ({recontactCount}件)</span>
              </span>
              <span className="flex items-center gap-1 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-500 inline-block"></span>
                <span>案件終了: <strong>{notRequiredPct}%</strong> ({notRequiredCount}件)</span>
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
            {completedNum > 0 && (
              <div
                style={{ width: `${completedNum}%` }}
                className="bg-emerald-500 h-full transition-all duration-300"
                title={`調査完了: ${completedCount}件 (${completedPct}%)`}
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
                className="bg-slate-500 h-full transition-all duration-300"
                title={`案件終了・不要: ${notRequiredCount}件 (${notRequiredPct}%)`}
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
            onClick={() => setFilterRequirement('completed')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              filterRequirement === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            調査完了 ({completedCount})
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
                ? 'bg-slate-700 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            案件終了・調査不要 ({notRequiredCount})
          </button>
        </div>

        {/* Search & Bulk Action & Exclude Completed Checkbox */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* 要望: 完了・対象外を除外チェックボックス */}
          <label
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors border select-none ${
              excludeCompleted
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="調査完了および案件終了（対象外）の店舗を記録カルテから除外して表示"
          >
            <input
              type="checkbox"
              checked={excludeCompleted}
              onChange={(e) => setExcludeCompleted(e.target.checked)}
              className="w-3.5 h-3.5 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300 cursor-pointer"
            />
            <span>完了・対象外を除外</span>
          </label>

          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="店舗名・担当者・県/住所（例: 神奈川）で検索..."
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

          {/* Quick Bulk Print Button in Toolbar */}
          <button
            type="button"
            onClick={() => handleOpenMultiPrint()}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
              selectedRecordIds.length > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
            title="選択したカルテを一括印刷（A4 1枚に2件掲載・例:6件なら3枚）"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>
              {selectedRecordIds.length > 0
                ? `選択印刷 (${selectedRecordIds.length}件 / ${Math.ceil(selectedRecordIds.length / 2)}枚)`
                : `複数印刷 (${filteredRecords.length}件)`}
            </span>
          </button>
        </div>
      </div>

      {/* Multi-Selection Banner */}
      {selectedRecordIds.length > 0 && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl p-3 px-4 shadow-md flex flex-wrap items-center justify-between gap-3 border border-blue-800 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500/30 text-blue-200 font-bold text-xs shrink-0">
              ✓
            </div>
            <div>
              <div className="font-bold text-sm flex items-center gap-2 flex-wrap">
                <span>{selectedRecordIds.length} 件選択中</span>
                <span className="text-xs font-normal text-blue-200 bg-blue-800/80 px-2 py-0.5 rounded-full border border-blue-700">
                  A4印刷: {Math.ceil(selectedRecordIds.length / 2)} 枚（1枚に2件）
                </span>
              </div>
              <div className="text-[11px] text-blue-200 mt-0.5 hidden sm:block">
                複数印刷時は1枚に2件ずつ掲載されます（例: 6件選択 → 印刷は3枚）。
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenMultiPrint()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-blue-900 bg-white hover:bg-blue-50 rounded-lg shadow-sm transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <Printer className="w-3.5 h-3.5 text-blue-700" />
              <FileText className="w-3.5 h-3.5 text-blue-700" />
              <span>選択した{selectedRecordIds.length}件をまとめて印刷・PDF出力</span>
            </button>

            <button
              type="button"
              onClick={handleClearSelection}
              className="px-3 py-2 text-xs text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              選択解除
            </button>
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredRecords.length > 0 && filteredRecords.every((r) => selectedRecordIds.includes(r.id))}
                    ref={(input) => {
                      if (input) {
                        const someSelected = filteredRecords.some((r) => selectedRecordIds.includes(r.id));
                        const allSelected = filteredRecords.length > 0 && filteredRecords.every((r) => selectedRecordIds.includes(r.id));
                        input.indeterminate = someSelected && !allSelected;
                      }
                    }}
                    onChange={handleSelectAllFiltered}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer align-middle"
                    title={
                      filteredRecords.length > 0 && filteredRecords.every((r) => selectedRecordIds.includes(r.id))
                        ? '全選択を解除'
                        : '表示中のカルテをすべて選択'
                    }
                  />
                </th>
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
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    条件に一致するヒアリング記録がありません。
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isCollected = checkIsDocCollected(r);
                  const isOut = checkIsOutOfScope(r);
                  const isSelected = selectedRecordIds.includes(r.id);
                  const matched = getMatchedStore(r);
                  return (
                    <tr
                      key={r.id}
                      className={`transition-colors divide-x divide-slate-200/60 ${
                        isSelected
                          ? 'bg-blue-50/70 hover:bg-blue-100/60'
                          : isOut
                          ? 'bg-slate-200/90 text-slate-700 hover:bg-slate-200'
                          : isCollected
                          ? 'bg-emerald-50/40 text-slate-800 hover:bg-emerald-100/30'
                          : 'bg-white hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(r.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer align-middle"
                          title="印刷対象として選択"
                        />
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderTimestamp(r.timestamp)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className={`font-bold ${isOut ? 'text-slate-800' : isCollected ? 'text-emerald-950 font-black' : 'text-slate-900'}`}>{r.storeName}</div>
                          {isCollected ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1 py-0.5 rounded font-bold whitespace-nowrap">
                              調査完了
                            </span>
                          ) : isOut ? (
                            <span className="text-[10px] bg-slate-400/40 text-slate-800 px-1 py-0.5 rounded font-bold whitespace-nowrap">
                              完了
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          {r.storeId && (
                            <span className={`text-[11px] font-mono ${isOut ? 'text-slate-500 font-semibold' : 'text-slate-400'}`}>{r.storeId}</span>
                          )}
                          {(() => {
                            const addr = getRecordAddress(r, stores);
                            if (!addr.shortAddress) return null;
                            return (
                              <span
                                className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-help ${
                                  isOut ? 'text-slate-700 bg-slate-300/60 border-slate-300' : 'text-slate-600 bg-slate-100 hover:bg-slate-200 border-slate-200'
                                }`}
                                title={addr.fullAddress || addr.shortAddress}
                              >
                                <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                <span>{addr.shortAddress}</span>
                              </span>
                            );
                          })()}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className={`font-medium ${isOut ? 'text-slate-800' : 'text-slate-800'}`}>{r.contactPerson} 様</div>
                        <div className={`text-[11px] ${isOut ? 'text-slate-500' : 'text-slate-400'}`}>{r.contactRole || '店長'}</div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {r.ledStatus === 'all_led' ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300/60">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>全灯LED済</span>
                            </span>
                            {(r.autoCompletedByDocScope || (r.notes && r.notes.includes('P列'))) && (
                              <span className="text-[10px] text-slate-600 block font-normal">
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
                        {isCollected ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>調査完了</span>
                            </span>
                            <span className="text-[10px] text-emerald-700 block font-medium">
                              P列:回収済連動
                            </span>
                          </div>
                        ) : isOut ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-300 text-slate-800 border border-slate-400/50">
                              <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                              <span>調査不要・案件終了</span>
                            </span>
                            <span className="text-[10px] text-slate-600 block">
                              {matched?.surveyDocCollection === '対象外' || r.autoCompletedByDocScope ? 'P列:対象外連動' : '全灯LED済'}
                            </span>
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
                        {isCollected ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>
                                {matched?.surveyConfirmedDate || matched?.surveyDate
                                  ? `調査完了日: ${matched.surveyConfirmedDate || matched.surveyDate}`
                                  : r.preferredDate1
                                  ? `調査日: ${r.preferredDate1}`
                                  : '現地調査完了'}
                              </span>
                            </div>
                            <div className="text-[11px] text-emerald-600 font-medium">
                              資料回収済 (P列連動)
                            </div>
                          </div>
                        ) : isOut ? (
                          <span className="text-slate-600 font-medium">訪問なし（案件終了）</span>
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
                            onClick={() => {
                              if (selectedRecordIds.length > 1 && selectedRecordIds.includes(r.id)) {
                                handleOpenMultiPrint();
                              } else {
                                handleOpenMultiPrint([r]);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="蛍光灯→LED切替 事前調査 電話ヒアリング結果シートを印刷・プレビュー"
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

      {/* Printable Sheet View Modal (Supports single record or multi-record 1枚2件) */}
      {recordsForPrint.length > 0 && (
        <PrintSheetModal
          records={recordsForPrint}
          record={recordsForPrint[0] || null}
          allAvailableRecords={records}
          stores={stores}
          onClose={() => setRecordsForPrint([])}
          onEditRecord={onEditRecord}
        />
      )}

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
