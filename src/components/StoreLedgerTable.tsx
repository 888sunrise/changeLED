/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Table,
  Lock,
  Edit3,
  PhoneCall,
  Search,
  Download,
  Upload,
  FileText,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Save,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  Building,
  Store,
  Car,
  ArrowLeftRight,
  Sliders,
  Check,
} from 'lucide-react';
import { StoreRecord } from '../types/hearing';
import { CsvDiffImportModal, DiffReportSummary } from './CsvDiffImportModal';
import { AdminDataManagementModal } from './AdminDataManagementModal';

interface StoreLedgerTableProps {
  records: StoreRecord[];
  onUpdateRecord: (updated: StoreRecord) => void;
  onBulkUpdateStores?: (updatedStores: StoreRecord[]) => Promise<void>;
  onSelectStoreForCall: (store: StoreRecord) => void;
  onResetDefaults?: () => void;
  onClearStores?: () => void;
}

export const StoreLedgerTable: React.FC<StoreLedgerTableProps> = ({
  records,
  onUpdateRecord,
  onBulkUpdateStores,
  onSelectStoreForCall,
  onResetDefaults,
  onClearStores,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterHasDrawing, setFilterHasDrawing] = useState<string>('all');
  const [filterPhoneStatus, setFilterPhoneStatus] = useState<string>('all');
  const [filterCompletion, setFilterCompletion] = useState<string>('all');
  const [editingStoreNo, setEditingStoreNo] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<StoreRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Admin Data Management Modal (Hidden/Protected Feature)
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // CSV Diff Import Modal & Report
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [lastImportReport, setLastImportReport] = useState<DiffReportSummary | null>(() => {
    try {
      const saved = localStorage.getItem('led_last_diff_import_report');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Column Freeze Option (A〜D列固定 or A〜E列固定 as requested in item ②)
  type FreezeColumnOption = 'D' | 'E' | 'none' | 'A' | 'B' | 'I';
  const [freezeCol, setFreezeCol] = useState<FreezeColumnOption>(() => {
    try {
      const saved = localStorage.getItem('led_freeze_column_opt');
      return (saved as FreezeColumnOption) || 'D';
    } catch {
      return 'D';
    }
  });

  const handleSetFreezeCol = (opt: FreezeColumnOption) => {
    setFreezeCol(opt);
    try {
      localStorage.setItem('led_freeze_column_opt', opt);
    } catch {}
  };

  // Filter logic
  const filteredRecords = records.filter((r) => {
    if (filterCategory !== 'all' && r.category !== filterCategory) return false;
    if (filterHasDrawing !== 'all') {
      if (filterHasDrawing === '○' && r.hasDrawing !== '○') return false;
      if (filterHasDrawing === 'none' && r.hasDrawing === '○') return false;
    }
    if (filterPhoneStatus !== 'all') {
      const curCallStatus = r.callStatus || r.phoneStatus || '未架電';
      if (filterPhoneStatus === 'recontact') {
        const isRecontact = ['出ず', '電話するも出ず', '留守電', '折返待ち', '再連絡待ち', '担当不在', '不在/再架電'].includes(curCallStatus);
        if (!isRecontact) return false;
      } else if (filterPhoneStatus === '出ず') {
        if (curCallStatus !== '出ず' && curCallStatus !== '電話するも出ず') return false;
      } else if (curCallStatus !== filterPhoneStatus) {
        return false;
      }
    }
    if (filterCompletion !== 'all' && r.completion !== filterCompletion) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.storeName.toLowerCase().includes(q) ||
      r.storeCode.toLowerCase().includes(q) ||
      r.representativePhone.toLowerCase().includes(q) ||
      r.address1.toLowerCase().includes(q) ||
      r.address2.toLowerCase().includes(q) ||
      r.storeMobile.toLowerCase().includes(q) ||
      (r.phoneContact || '').toLowerCase().includes(q) ||
      (r.callStatus || '').toLowerCase().includes(q) ||
      r.remarks1.toLowerCase().includes(q) ||
      r.surveyAssignee.toLowerCase().includes(q) ||
      r.workAssignee.toLowerCase().includes(q)
    );
  });

  // Top Seekbar & Synchronized Scroll (Item ③)
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(2400);
  const [scrollProgress, setScrollProgress] = useState(0);
  const isSyncingTop = useRef(false);
  const isSyncingTable = useRef(false);

  useEffect(() => {
    const updateDimensions = () => {
      if (tableContainerRef.current) {
        setTableScrollWidth(tableContainerRef.current.scrollWidth);
        const max = tableContainerRef.current.scrollWidth - tableContainerRef.current.clientWidth;
        if (max > 0) {
          setScrollProgress(tableContainerRef.current.scrollLeft / max);
        }
      }
    };
    updateDimensions();
    const timer = setTimeout(updateDimensions, 100);
    window.addEventListener('resize', updateDimensions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateDimensions);
    };
  }, [records, filteredRecords]);

  const handleTopScroll = () => {
    if (isSyncingTable.current) return;
    if (!topScrollRef.current || !tableContainerRef.current) return;
    isSyncingTop.current = true;
    tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    const max = tableContainerRef.current.scrollWidth - tableContainerRef.current.clientWidth;
    if (max > 0) {
      setScrollProgress(tableContainerRef.current.scrollLeft / max);
    }
    requestAnimationFrame(() => {
      isSyncingTop.current = false;
    });
  };

  const handleTableScroll = () => {
    if (isSyncingTop.current) return;
    if (!topScrollRef.current || !tableContainerRef.current) return;
    isSyncingTable.current = true;
    topScrollRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    const max = tableContainerRef.current.scrollWidth - tableContainerRef.current.clientWidth;
    if (max > 0) {
      setScrollProgress(tableContainerRef.current.scrollLeft / max);
    }
    requestAnimationFrame(() => {
      isSyncingTable.current = false;
    });
  };

  const handleSeekRange = (percentage: number) => {
    if (!tableContainerRef.current) return;
    const max = tableContainerRef.current.scrollWidth - tableContainerRef.current.clientWidth;
    const targetLeft = (percentage / 100) * max;
    tableContainerRef.current.scrollLeft = targetLeft;
    if (topScrollRef.current) {
      topScrollRef.current.scrollLeft = targetLeft;
    }
    setScrollProgress(percentage / 100);
  };

  const scrollToColumnOffset = (offset: number) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ left: offset, behavior: 'smooth' });
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApplyDiff = async (updatedStores: StoreRecord[]) => {
    if (onBulkUpdateStores) {
      await onBulkUpdateStores(updatedStores);
    } else {
      for (const s of updatedStores) {
        onUpdateRecord(s);
      }
    }
    showToast(`${updatedStores.length}店舗の差分データを正常に上書き同期しました`);
  };

  const handleSaveReport = (report: DiffReportSummary) => {
    setLastImportReport(report);
    try {
      localStorage.setItem('led_last_diff_import_report', JSON.stringify(report));
    } catch {}
  };

  // Inline Quick Change for J〜T columns
  const handleQuickChange = (storeNo: number, field: keyof StoreRecord, value: any) => {
    const target = records.find((r) => r.no === storeNo);
    if (!target) return;
    const updated = { ...target, [field]: value };
    onUpdateRecord(updated);
    showToast(`NO.${storeNo} ${target.storeName} の「${fieldLabel(field)}」を更新しました`);
  };

  // Open modal/panel edit
  const handleStartEdit = (record: StoreRecord) => {
    setEditingStoreNo(record.no);
    setEditFormData({ ...record });
  };

  const handleSaveModal = () => {
    if (!editFormData) return;
    onUpdateRecord(editFormData);
    showToast(`NO.${editFormData.no} ${editFormData.storeName} の内容を保存しました`);
    setEditingStoreNo(null);
    setEditFormData(null);
  };

  // Export CSV exactly in format A〜V
  const handleExportCSV = () => {
    const headers = [
      'NO',
      '店番',
      '代表番号',
      '店名',
      '店舗住所1（漢字）',
      '店舗住所2（漢字）',
      '店舗建物名',
      '店舗携帯番号',
      '運営',
      '備考欄1',
      'カテゴリ',
      '図面有無',
      '電話口担当',
      '調査担当',
      '調査日',
      '調査資料回収',
      '置き換え依頼',
      '商品手配',
      '作業担当',
      '日程連絡',
      '完了',
      '電話状況',
    ];

    const rows = filteredRecords.map((r) => [
      r.no,
      `"${r.storeCode}"`,
      `"${r.representativePhone}"`,
      `"${r.storeName}"`,
      `"${r.address1}"`,
      `"${r.address2}"`,
      `"${r.buildingName}"`,
      `"${r.storeMobile}"`,
      `"${r.managementType}"`,
      `"${(r.remarks1 || '').replace(/"/g, '""')}"`,
      `"${r.category}"`,
      `"${r.hasDrawing || ''}"`,
      `"${(r.phoneContact || '').replace(/"/g, '""')}"`,
      `"${r.surveyAssignee}"`,
      `"${r.surveyDate}"`,
      `"${r.surveyDocCollection}"`,
      `"${r.replacementRequest}"`,
      `"${r.itemOrdering}"`,
      `"${r.workAssignee}"`,
      `"${r.scheduleNotice}"`,
      `"${r.completion}"`,
      `"${r.callStatus || r.phoneStatus || '未架電'}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LED切替調査台帳_A-V列_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fieldLabel = (f: keyof StoreRecord): string => {
    const map: Record<string, string> = {
      remarks1: '備考欄1 (J)',
      category: 'カテゴリ (K)',
      hasDrawing: '図面有無 (L)',
      phoneContact: '電話口担当 (M)',
      surveyAssignee: '調査担当 (N)',
      surveyDate: '調査日 (O)',
      surveyDocCollection: '調査資料回収 (P)',
      replacementRequest: '置き換え依頼 (Q)',
      itemOrdering: '商品手配 (R)',
      workAssignee: '作業担当 (S)',
      scheduleNotice: '日程連絡 (T)',
      completion: '完了 (U)',
      callStatus: '電話状況 (V)',
      phoneStatus: '電話状況 (V)',
    };
    return map[f] || String(f);
  };

  // Quick stats
  const totalStores = records.length;
  const completedCount = records.filter((r) => r.completion === '完了').length;
  const phonedCount = records.filter((r) => (r.callStatus || r.phoneStatus) === '完了').length;
  const recontactCount = records.filter((r) =>
    ['出ず', '電話するも出ず', '留守電', '折返待ち', '再連絡待ち', '担当不在', '不在/再架電'].includes(r.callStatus || r.phoneStatus || '')
  ).length;
  const drawingCount = records.filter((r) => r.hasDrawing === '○').length;

  return (
    <div className="space-y-5 pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner / Summary KPIs */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900">
                店舗調査・進捗管理台帳（A〜V列 統合CRM）
              </span>
              <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                173店舗マスタ連動
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              <strong>A〜I列（薄グレー背景）</strong>はマスタ情報のため<span className="text-rose-600 font-semibold">入力禁止（閲覧・架電専用）</span>、
              <strong>J〜V列（白背景）</strong>はヒアリング後の<span className="text-blue-700 font-semibold">インライン編集・選択入力</span>が可能です。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-slate-500">全体:</span>
              <span className="font-bold text-slate-900">{totalStores}店舗</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">図面あり(L):</span>
              <span className="font-bold text-indigo-600">{drawingCount}件</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">架電完了(V):</span>
              <span className="font-bold text-blue-600">{phonedCount}件</span>
              {recontactCount > 0 && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="text-amber-600 font-medium">要再架電/折返:</span>
                  <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">{recontactCount}件</span>
                </>
              )}
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">全工程完了(U):</span>
              <span className="font-bold text-emerald-600">{completedCount}件</span>
            </div>

            <button
              onClick={() => setIsDiffModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>CSV差分インポート</span>
            </button>

            {lastImportReport && (
              <button
                onClick={() => setIsDiffModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 shadow-2xs whitespace-nowrap"
                title={`直近更新: ${lastImportReport.timestamp}`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>差分レポート ({lastImportReport.changedCount}件)</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 shadow-xs whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>A〜U列 CSV出力</span>
            </button>

            {/* Hidden / Protected Admin Console Button */}
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 shadow-2xs whitespace-nowrap"
              title="管理者専用（データ初期化・保守・リストア）"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">管理者制御</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500">カテゴリ(K):</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
            >
              <option value="all">すべて</option>
              <option value="ビルイン">ビルイン</option>
              <option value="フードコート">フードコート</option>
              <option value="ロードサイド">ロードサイド</option>
              <option value="未設定">未設定</option>
            </select>
          </div>

          {/* Drawing Availability Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500">図面有無(L):</span>
            <select
              value={filterHasDrawing}
              onChange={(e) => setFilterHasDrawing(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden font-medium"
            >
              <option value="all">すべて</option>
              <option value="○">○ (図面あり)</option>
              <option value="none">- (未登録/なし)</option>
            </select>
          </div>

          {/* Phone Status Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500">電話状況(V):</span>
            <select
              value={filterPhoneStatus}
              onChange={(e) => setFilterPhoneStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
            >
              <option value="all">すべて</option>
              <option value="recontact">★ 要再架電・出ず・折返待ち全体</option>
              <option value="未架電">未架電</option>
              <option value="完了">完了</option>
              <option value="出ず">出ず（電話するも出ず）</option>
              <option value="留守電">留守電</option>
              <option value="折返待ち">折返待ち</option>
              <option value="再連絡待ち">再連絡待ち</option>
              <option value="担当不在">担当不在</option>
              <option value="通話中">通話中</option>
              <option value="不在/再架電">不在/再架電</option>
              <option value="着信拒否">着信拒否</option>
            </select>
          </div>

          {/* Completion Status Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500">完了(U):</span>
            <select
              value={filterCompletion}
              onChange={(e) => setFilterCompletion(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
            >
              <option value="all">すべて</option>
              <option value="未完了">未完了</option>
              <option value="完了">完了</option>
              <option value="保留">保留</option>
            </select>
          </div>
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="店番、店名、住所、電話、担当者等で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all"
          />
        </div>
      </div>

      {/* Main Table: Full Column Matrix A〜U */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Top Horizontal Seekbar & Quick Jump Bar (Item ③) */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: Quick Jump Navigation */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 font-bold flex items-center gap-1 mr-1">
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
              <span>列ジャンプ:</span>
            </span>
            <button
              type="button"
              onClick={() => scrollToColumnOffset(0)}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 font-semibold shadow-2xs transition-colors"
              title="先頭 A〜D列（基本マスタ）へジャンプ"
            >
              ◀ A〜D列 (固定)
            </button>
            <button
              type="button"
              onClick={() => scrollToColumnOffset(360)}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 font-semibold shadow-2xs transition-colors"
              title="E〜I列（詳細マスタ）へジャンプ"
            >
              E〜I 住所・携帯
            </button>
            <button
              type="button"
              onClick={() => scrollToColumnOffset(750)}
              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md text-blue-800 font-bold shadow-2xs transition-colors"
              title="J〜L列（備考・図面）へジャンプ"
            >
              J〜L 備考・図面
            </button>
            <button
              type="button"
              onClick={() => scrollToColumnOffset(1250)}
              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md text-blue-800 font-bold shadow-2xs transition-colors"
              title="M〜Q列（電話・調査・手配）へジャンプ"
            >
              M〜Q 電話・調査
            </button>
            <button
              type="button"
              onClick={() => scrollToColumnOffset(2200)}
              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md text-blue-800 font-bold shadow-2xs transition-colors"
              title="R〜U列（作業・完了）へジャンプ"
            >
              R〜U 作業・完了 ▶
            </button>
          </div>

          {/* Right: Seekbar Slider & Column Freeze Selector (Item ② & ③) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-slate-500 font-medium whitespace-nowrap">シーク:</span>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(scrollProgress * 100)}
                onChange={(e) => handleSeekRange(Number(e.target.value))}
                className="w-24 sm:w-40 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                title="横スクロール位置を調整"
              />
              <span className="font-mono text-[11px] text-slate-500 w-8 text-right">
                {Math.round(scrollProgress * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-slate-500 font-medium whitespace-nowrap">画面固定:</span>
              <select
                value={freezeCol}
                onChange={(e) => handleSetFreezeCol(e.target.value as any)}
                className="text-xs bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer"
              >
                <option value="D">A〜D列 固定（店名まで）★標準</option>
                <option value="E">A〜E列 固定（店舗住所1まで）</option>
                <option value="none">固定なし</option>
                <option value="A">A列のみ（NO）</option>
                <option value="B">A〜B列（店番まで）</option>
                <option value="I">A〜I列（マスタ全列）</option>
              </select>
            </div>
          </div>
        </div>

        {/* Synchronized Top Horizontal Scrollbar (Item ③) */}
        <div
          ref={topScrollRef}
          onScroll={handleTopScroll}
          className="overflow-x-auto overflow-y-hidden border-b border-slate-200 bg-slate-100/90 cursor-ew-resize"
          style={{ height: '14px' }}
          title="上部横スクロールバー（ドラッグで左右にスクロールできます）"
        >
          <div style={{ width: `${tableScrollWidth}px`, height: '1px' }} />
        </div>

        <div
          ref={tableContainerRef}
          onScroll={handleTableScroll}
          className="overflow-x-auto max-h-[640px]"
        >
          <table className="w-full text-left text-xs border-collapse">
            {/* Table Header: Divided into A-I (Locked) and J-U (Editable) */}
            <thead className="sticky top-0 z-20 shadow-xs">
              {/* Group Super Header */}
              <tr className="text-[11px] font-bold border-b border-slate-200 text-slate-700">
                {freezeCol === 'D' ? (
                  <>
                    <th colSpan={4} className="bg-slate-200/95 py-2 px-3 border-r-2 border-slate-300 sticky left-0 z-30 shadow-xs">
                      <div className="flex items-center gap-1.5 text-slate-800">
                        <Lock className="w-3.5 h-3.5 text-slate-600" />
                        <span>【A〜D列：基本マスタ（画面固定）】</span>
                      </div>
                    </th>
                    <th colSpan={6} className="bg-slate-100/95 py-2 px-3 border-r-2 border-slate-300">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <span>【E〜I列：マスタ詳細（閲覧専用）】</span>
                      </div>
                    </th>
                  </>
                ) : freezeCol === 'E' ? (
                  <>
                    <th colSpan={5} className="bg-slate-200/95 py-2 px-3 border-r-2 border-slate-300 sticky left-0 z-30 shadow-xs">
                      <div className="flex items-center gap-1.5 text-slate-800">
                        <Lock className="w-3.5 h-3.5 text-slate-600" />
                        <span>【A〜E列：マスタ（画面固定）】</span>
                      </div>
                    </th>
                    <th colSpan={5} className="bg-slate-100/95 py-2 px-3 border-r-2 border-slate-300">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <span>【F〜I列：詳細（閲覧専用）】</span>
                      </div>
                    </th>
                  </>
                ) : (
                  <th colSpan={10} className="bg-slate-100/95 py-2 px-3 border-r-2 border-slate-300">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>【A〜I列：マスタ情報（入力禁止・閲覧専用）】</span>
                    </div>
                  </th>
                )}
                <th colSpan={13} className="bg-blue-50/95 py-2 px-3">
                  <div className="flex items-center gap-1.5 text-blue-800">
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    <span>【J〜V列：ヒアリング・調査進捗入力（入力および選択方式）】</span>
                  </div>
                </th>
              </tr>

              {/* Column Individual Headers */}
              <tr className="border-b border-slate-200 divide-x divide-slate-200">
                {/* A: NO */}
                <th
                  className={`py-2.5 px-3 bg-slate-100 font-bold text-slate-700 whitespace-nowrap text-center ${
                    freezeCol !== 'none' ? 'sticky left-0 z-30' : ''
                  }`}
                  style={{ width: '52px', minWidth: '52px', maxWidth: '52px' }}
                >
                  A: NO
                </th>

                {/* B: 店番 */}
                <th
                  className={`py-2.5 px-3 bg-slate-100 font-bold text-slate-700 whitespace-nowrap ${
                    freezeCol === 'B' || freezeCol === 'D' || freezeCol === 'E' || freezeCol === 'I' ? 'sticky left-[52px] z-30' : ''
                  }`}
                  style={{ width: '76px', minWidth: '76px', maxWidth: '76px' }}
                >
                  B: 店番
                </th>

                {/* C: 代表番号 */}
                <th
                  className={`py-2.5 px-3 bg-slate-100 font-bold text-slate-700 whitespace-nowrap ${
                    freezeCol === 'D' || freezeCol === 'E' || freezeCol === 'I' ? 'sticky left-[128px] z-30' : ''
                  }`}
                  style={{ width: '76px', minWidth: '76px', maxWidth: '76px' }}
                >
                  C: 代表番号
                </th>

                {/* D: 店名 */}
                <th
                  className={`py-2.5 px-3 bg-slate-100 font-bold text-slate-800 whitespace-nowrap ${
                    freezeCol === 'D' || freezeCol === 'E' || freezeCol === 'I'
                      ? `sticky left-[204px] z-30 ${freezeCol === 'D' ? 'border-r-2 border-slate-300 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.12)]' : ''}`
                      : ''
                  }`}
                  style={{ width: '150px', minWidth: '150px', maxWidth: '170px' }}
                >
                  D: 店名
                </th>

                {/* E: 店舗住所1 */}
                <th
                  className={`py-2.5 px-3 bg-slate-100 font-semibold text-slate-600 whitespace-nowrap ${
                    freezeCol === 'E' || freezeCol === 'I'
                      ? `sticky left-[354px] z-30 ${freezeCol === 'E' ? 'border-r-2 border-slate-300 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.12)]' : ''}`
                      : ''
                  }`}
                  style={{ width: '130px', minWidth: '130px', maxWidth: '140px' }}
                >
                  E: 店舗住所1
                </th>
                <th className="py-2.5 px-3 bg-slate-100 font-semibold text-slate-600 whitespace-nowrap min-w-36">
                  F: 店舗住所2
                </th>
                <th className="py-2.5 px-3 bg-slate-100 font-semibold text-slate-600 whitespace-nowrap min-w-36">
                  G: 店舗建物名
                </th>
                <th className="py-2.5 px-3 bg-slate-100 font-bold text-slate-700 whitespace-nowrap min-w-32">
                  H: 店舗携帯番号
                </th>
                <th className="py-2.5 px-3 bg-slate-100 font-semibold text-slate-600 whitespace-nowrap text-center w-20">
                  I: 運営
                </th>
                <th className="py-2.5 px-2 bg-slate-200 font-bold text-slate-700 whitespace-nowrap text-center w-16">
                  架電
                </th>

                {/* J to U */}
                <th className="py-2.5 px-3 bg-blue-50 font-bold text-blue-900 whitespace-nowrap min-w-40">
                  J: 備考欄1
                </th>
                <th className="py-2.5 px-3 bg-blue-50 font-bold text-blue-900 whitespace-nowrap w-32">
                  K: カテゴリ
                </th>
                <th className="py-2.5 px-3 bg-blue-50 font-bold text-blue-900 whitespace-nowrap w-24 text-center">
                  L: 図面有無
                </th>
                <th className="py-2.5 px-3 bg-blue-50 font-bold text-blue-900 whitespace-nowrap w-28">
                  M: 電話口担当
                </th>
                <th className="py-2.5 px-3 bg-blue-50 font-bold text-blue-900 whitespace-nowrap w-28">
                  N: 調査担当
                </th>
                <th className="py-2.5 px-3 bg-blue-50 font-bold text-blue-900 whitespace-nowrap w-32">
                  O: 調査日
                </th>
                <th className="py-2.5 px-3 bg-blue-50 font-bold text-blue-900 whitespace-nowrap w-28">
                  P: 調査資料回収
                </th>
                <th className="py-2.5 px-3 bg-blue-50 font-bold text-blue-900 whitespace-nowrap w-28">
                  Q: 置き換え依頼
                </th>
                <th className="py-2.5 px-3 bg-blue-50 font-bold text-blue-900 whitespace-nowrap w-28">
                  R: 商品手配
                </th>
                <th className="py-2.5 px-3 bg-blue-50 font-bold text-blue-900 whitespace-nowrap w-28">
                  S: 作業担当
                </th>
                <th className="py-2.5 px-3 bg-blue-50 font-bold text-blue-900 whitespace-nowrap w-28">
                  T: 日程連絡
                </th>
                <th className="py-2.5 px-3 bg-blue-50 font-bold text-blue-900 whitespace-nowrap w-28 text-center">
                  U: 完了
                </th>
                <th className="py-2.5 px-3 bg-blue-50 font-bold text-blue-900 whitespace-nowrap w-32 text-center">
                  V: 電話状況
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={23} className="py-16 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                        <Table className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm">
                        現在、台帳データは未登録です（データクリア状態）
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Cloud Firestore上の台帳データは初期化され0件となっています。<br />
                        エクセル管理中の全173店舗CSVをインポートして最新台帳を構築するか、管理者メニューから初期マスタを投入してください。
                      </p>
                      <div className="pt-2 flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIsDiffModalOpen(true)}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          <span>CSV差分・全店舗インポートを開く</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAdminModalOpen(true)}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
                        >
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                          <span>管理者メニュー（初期化・マスタ投入）</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={23} className="py-12 text-center text-slate-400">
                    条件に一致する店舗データがありません。
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isDone = r.completion === '完了';

                  const isFrozen = (col: 'A' | 'B' | 'C' | 'D' | 'E') => {
                    if (freezeCol === 'none') return false;
                    if (freezeCol === 'A') return col === 'A';
                    if (freezeCol === 'B') return col === 'A' || col === 'B';
                    if (freezeCol === 'D') return col === 'A' || col === 'B' || col === 'C' || col === 'D';
                    if (freezeCol === 'E') return col === 'A' || col === 'B' || col === 'C' || col === 'D' || col === 'E';
                    if (freezeCol === 'I') return true;
                    return false;
                  };

                  return (
                    <tr
                      key={r.no}
                      className={`divide-x divide-slate-200 transition-colors ${
                        isDone
                          ? 'bg-slate-200/90 text-slate-700 hover:bg-slate-200'
                          : 'bg-white hover:bg-blue-50/40'
                      }`}
                    >
                      {/* --- A〜I列（入力禁止・マスタ領域） --- */}
                      {/* A: NO */}
                      <td
                        className={`py-2 px-3 text-center font-mono font-bold select-none ${
                          isFrozen('A') ? 'sticky left-0 z-10' : ''
                        } ${isDone ? 'bg-slate-300/90 text-slate-700' : 'bg-slate-50/95 text-slate-500'}`}
                        style={{ width: '52px', minWidth: '52px', maxWidth: '52px' }}
                      >
                        {isDone ? (
                          <span className="flex items-center justify-center gap-0.5 font-bold text-slate-700">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{r.no}</span>
                          </span>
                        ) : (
                          r.no
                        )}
                      </td>

                      {/* B: 店番 */}
                      <td
                        className={`py-2 px-3 font-mono select-none ${
                          isFrozen('B') ? 'sticky left-[52px] z-10' : ''
                        } ${isDone ? 'bg-slate-300/90 text-slate-700' : 'bg-slate-50/95 text-slate-700'}`}
                        style={{ width: '76px', minWidth: '76px', maxWidth: '76px' }}
                      >
                        {r.storeCode}
                      </td>

                      {/* C: 代表番号 */}
                      <td
                        className={`py-2 px-3 font-mono select-none ${
                          isFrozen('C') ? 'sticky left-[128px] z-10' : ''
                        } ${isDone ? 'bg-slate-300/90 text-slate-700' : 'bg-slate-50/95 text-slate-700'}`}
                        style={{ width: '76px', minWidth: '76px', maxWidth: '76px' }}
                      >
                        {r.representativePhone}
                      </td>

                      {/* D: 店名 */}
                      <td
                        className={`py-2 px-3 ${
                          isFrozen('D')
                            ? `sticky left-[204px] z-10 ${freezeCol === 'D' ? 'border-r-2 border-slate-300 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.12)]' : ''}`
                            : ''
                        } ${isDone ? 'bg-slate-300/90 text-slate-800' : 'bg-slate-50/95 text-slate-900'}`}
                        style={{ width: '150px', minWidth: '150px', maxWidth: '170px' }}
                      >
                        <div className="font-bold flex items-center justify-between gap-1">
                          <span className={isDone ? 'text-slate-800' : 'text-slate-900'}>
                            {r.storeName}
                          </span>
                          <div className="flex items-center gap-1">
                            {isDone && (
                              <span className="text-[10px] bg-slate-400/40 text-slate-800 px-1 py-0.5 rounded font-bold whitespace-nowrap">
                                完了
                              </span>
                            )}
                            <button
                              onClick={() => handleStartEdit(r)}
                              className="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-800 p-0.5 rounded transition-opacity"
                              title="詳細フォームを開く"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* E: 店舗住所1 */}
                      <td
                        className={`py-2 px-3 select-none ${
                          isFrozen('E')
                            ? `sticky left-[354px] z-10 ${freezeCol === 'E' ? 'border-r-2 border-slate-300 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.12)]' : ''}`
                            : ''
                        } ${isDone ? 'bg-slate-200/90 text-slate-700' : 'bg-slate-50/70 text-slate-600'}`}
                        style={{ width: '130px', minWidth: '130px', maxWidth: '140px' }}
                      >
                        {r.address1}
                      </td>

                      {/* F: 店舗住所2 */}
                      <td className={`py-2 px-3 select-none ${isDone ? 'bg-slate-200/90 text-slate-600' : 'bg-slate-50/70 text-slate-600'}`}>
                        {r.address2}
                      </td>

                      {/* G: 店舗建物名 */}
                      <td className={`py-2 px-3 text-[11px] select-none ${isDone ? 'bg-slate-200/90 text-slate-500' : 'bg-slate-50/70 text-slate-500'}`}>
                        {r.buildingName || '-'}
                      </td>

                      {/* H: 店舗携帯番号 */}
                      <td className={`py-2 px-3 font-mono whitespace-nowrap ${isDone ? 'bg-slate-200/90 text-slate-700' : 'bg-slate-50/70 text-slate-800'}`}>
                        <a
                          href={`tel:${r.storeMobile.replace(/-/g, '')}`}
                          className="hover:text-blue-600 hover:underline"
                        >
                          {r.storeMobile}
                        </a>
                      </td>

                      {/* I: 運営 */}
                      <td className={`py-2 px-3 text-center select-none ${isDone ? 'bg-slate-200/90' : 'bg-slate-50/70'}`}>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                            isDone
                              ? 'bg-slate-300 text-slate-700 font-bold'
                              : r.managementType === '直営'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.managementType}
                        </span>
                      </td>

                      {/* コール発信アクションボタン */}
                      <td className={`py-1 px-2 text-center select-none ${isDone ? 'bg-slate-200/90' : 'bg-slate-100'}`}>
                        <button
                          onClick={() => onSelectStoreForCall(r)}
                          className={`flex items-center justify-center gap-1 w-full py-1 text-[11px] font-bold rounded shadow-2xs transition-colors ${
                            isDone
                              ? 'bg-slate-400/80 text-white hover:bg-slate-500'
                              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white'
                          }`}
                          title="この店舗で通話ナビを開始"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>架電</span>
                        </button>
                      </td>

                      {/* --- J〜U列（入力および選択方式：完了時はグレー背景） --- */}
                      {/* J: 備考欄1 */}
                      <td className={`py-1 px-2 ${isDone ? 'bg-slate-200/90 text-slate-700' : 'bg-white'}`}>
                        <input
                          type="text"
                          value={r.remarks1}
                          onChange={(e) => handleQuickChange(r.no, 'remarks1', e.target.value)}
                          placeholder="LED状況等入力..."
                          className={`w-full px-2 py-1 text-xs border rounded transition-colors ${
                            isDone
                              ? 'bg-slate-200/90 text-slate-800 border-slate-300 focus:bg-white'
                              : 'border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white'
                          }`}
                        />
                      </td>

                      {/* K: カテゴリ */}
                      <td className={`py-1 px-2 ${isDone ? 'bg-slate-200/90 text-slate-700' : 'bg-white'}`}>
                        <select
                          value={r.category}
                          onChange={(e) => handleQuickChange(r.no, 'category', e.target.value)}
                          className={`w-full px-2 py-1 text-xs rounded border focus:outline-hidden font-medium ${
                            isDone
                              ? 'text-slate-800 bg-slate-200/90 border-slate-300 font-bold'
                              : r.category === 'ビルイン'
                              ? 'text-blue-700 bg-blue-50/50 border-transparent hover:border-slate-300 focus:border-blue-500'
                              : r.category === 'フードコート'
                              ? 'text-amber-700 bg-amber-50/50 border-transparent hover:border-slate-300 focus:border-blue-500'
                              : r.category === 'ロードサイド' || r.category === 'フリスタ'
                              ? 'text-emerald-700 bg-emerald-50/50 border-transparent hover:border-slate-300 focus:border-blue-500'
                              : 'text-slate-400 border-transparent hover:border-slate-300 focus:border-blue-500'
                          }`}
                        >
                          <option value="未設定">未設定</option>
                          <option value="ビルイン">ビルイン</option>
                          <option value="フードコート">フードコート</option>
                          <option value="ロードサイド">ロードサイド</option>
                        </select>
                      </td>

                      {/* L: 図面有無 */}
                      <td className={`py-1 px-2 text-center ${isDone ? 'bg-slate-200/90 text-slate-700' : 'bg-white'}`}>
                        <select
                          value={r.hasDrawing || ''}
                          onChange={(e) => handleQuickChange(r.no, 'hasDrawing', e.target.value)}
                          className={`w-full px-1.5 py-1 text-xs rounded border focus:outline-hidden text-center font-bold ${
                            isDone
                              ? 'text-slate-800 bg-slate-200/90 border-slate-300 font-bold'
                              : r.hasDrawing === '○'
                              ? 'text-indigo-700 bg-indigo-50 font-bold border-transparent hover:border-slate-300 focus:border-blue-500'
                              : 'text-slate-300 border-transparent hover:border-slate-300 focus:border-blue-500'
                          }`}
                        >
                          <option value="">-</option>
                          <option value="○">○</option>
                        </select>
                      </td>

                      {/* M: 電話口担当 */}
                      <td className={`py-1 px-2 ${isDone ? 'bg-slate-200/90 text-slate-700' : 'bg-white'}`}>
                        <input
                          type="text"
                          value={r.phoneContact || ''}
                          onChange={(e) => handleQuickChange(r.no, 'phoneContact', e.target.value)}
                          placeholder="電話口担当者"
                          className={`w-full px-2 py-1 text-xs border rounded transition-colors ${
                            isDone
                              ? 'text-slate-800 bg-slate-200/90 border-slate-300 font-bold'
                              : r.phoneContact
                              ? 'text-slate-900 bg-slate-50 border-slate-300 font-medium'
                              : 'text-slate-400 border-transparent hover:border-slate-300 focus:border-blue-500'
                          }`}
                        />
                      </td>

                      {/* N: 調査担当 */}
                      <td className={`py-1 px-2 ${isDone ? 'bg-slate-200/90 text-slate-700' : 'bg-white'}`}>
                        <input
                          type="text"
                          value={r.surveyAssignee}
                          onChange={(e) => handleQuickChange(r.no, 'surveyAssignee', e.target.value)}
                          placeholder="担当者名"
                          className={`w-full px-2 py-1 text-xs border rounded transition-colors ${
                            isDone
                              ? 'bg-slate-200/90 text-slate-800 border-slate-300 focus:bg-white'
                              : 'border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white'
                          }`}
                        />
                      </td>

                      {/* O: 調査日 */}
                      <td className={`py-1 px-2 ${isDone ? 'bg-slate-200/90 text-slate-700' : 'bg-white'}`}>
                        <input
                          type="date"
                          value={r.surveyDate}
                          onChange={(e) => handleQuickChange(r.no, 'surveyDate', e.target.value)}
                          className={`w-full px-1.5 py-1 text-xs border rounded transition-colors font-mono ${
                            isDone
                              ? 'bg-slate-200/90 text-slate-800 border-slate-300 focus:bg-white'
                              : 'border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white'
                          }`}
                        />
                      </td>

                      {/* P: 調査資料回収 */}
                      <td className={`py-1 px-2 ${isDone ? 'bg-slate-200/90 text-slate-700' : 'bg-white'}`}>
                        <select
                          value={r.surveyDocCollection}
                          onChange={(e) => handleQuickChange(r.no, 'surveyDocCollection', e.target.value)}
                          className={`w-full px-2 py-1 text-xs rounded border focus:outline-hidden font-medium ${
                            isDone
                              ? 'text-slate-800 bg-slate-200/90 border-slate-300 font-bold'
                              : r.surveyDocCollection === '回収済'
                              ? 'text-emerald-700 bg-emerald-50 border-transparent hover:border-slate-300 focus:border-blue-500'
                              : r.surveyDocCollection === '不要'
                              ? 'text-slate-400 border-transparent hover:border-slate-300 focus:border-blue-500'
                              : 'text-amber-700 border-transparent hover:border-slate-300 focus:border-blue-500'
                          }`}
                        >
                          <option value="未回収">未回収</option>
                          <option value="回収済">回収済</option>
                          <option value="不要">不要</option>
                        </select>
                      </td>

                      {/* Q: 置き換え依頼 */}
                      <td className={`py-1 px-2 ${isDone ? 'bg-slate-200/90 text-slate-700' : 'bg-white'}`}>
                        <select
                          value={r.replacementRequest}
                          onChange={(e) => handleQuickChange(r.no, 'replacementRequest', e.target.value)}
                          className={`w-full px-2 py-1 text-xs rounded border focus:outline-hidden font-medium ${
                            isDone
                              ? 'text-slate-800 bg-slate-200/90 border-slate-300 font-bold'
                              : r.replacementRequest === '依頼済'
                              ? 'text-emerald-700 bg-emerald-50 border-transparent hover:border-slate-300 focus:border-blue-500'
                              : r.replacementRequest === '対象外'
                              ? 'text-slate-400 border-transparent hover:border-slate-300 focus:border-blue-500'
                              : 'text-amber-700 border-transparent hover:border-slate-300 focus:border-blue-500'
                          }`}
                        >
                          <option value="未依頼">未依頼</option>
                          <option value="依頼済">依頼済</option>
                          <option value="対象外">対象外</option>
                        </select>
                      </td>

                      {/* R: 商品手配 */}
                      <td className={`py-1 px-2 ${isDone ? 'bg-slate-200/90 text-slate-700' : 'bg-white'}`}>
                        <select
                          value={r.itemOrdering}
                          onChange={(e) => handleQuickChange(r.no, 'itemOrdering', e.target.value)}
                          className={`w-full px-2 py-1 text-xs rounded border focus:outline-hidden font-medium ${
                            isDone
                              ? 'text-slate-800 bg-slate-200/90 border-slate-300 font-bold'
                              : r.itemOrdering === '完了' || r.itemOrdering === '手配済'
                              ? 'text-emerald-700 bg-emerald-50 border-transparent hover:border-slate-300 focus:border-blue-500'
                              : r.itemOrdering === '納品待ち'
                              ? 'text-blue-700 bg-blue-50 border-transparent hover:border-slate-300 focus:border-blue-500'
                              : 'text-slate-500 border-transparent hover:border-slate-300 focus:border-blue-500'
                          }`}
                        >
                          <option value="未手配">未手配</option>
                          <option value="手配済">手配済</option>
                          <option value="納品待ち">納品待ち</option>
                          <option value="完了">完了</option>
                        </select>
                      </td>

                      {/* S: 作業担当 */}
                      <td className={`py-1 px-2 ${isDone ? 'bg-slate-200/90 text-slate-700' : 'bg-white'}`}>
                        <input
                          type="text"
                          value={r.workAssignee}
                          onChange={(e) => handleQuickChange(r.no, 'workAssignee', e.target.value)}
                          placeholder="工事業者/担当"
                          className={`w-full px-2 py-1 text-xs border rounded transition-colors ${
                            isDone
                              ? 'bg-slate-200/90 text-slate-800 border-slate-300 focus:bg-white'
                              : 'border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white'
                          }`}
                        />
                      </td>

                      {/* T: 日程連絡 */}
                      <td className={`py-1 px-2 ${isDone ? 'bg-slate-200/90 text-slate-700' : 'bg-white'}`}>
                        <select
                          value={r.scheduleNotice}
                          onChange={(e) => handleQuickChange(r.no, 'scheduleNotice', e.target.value)}
                          className={`w-full px-2 py-1 text-xs rounded border focus:outline-hidden font-medium ${
                            isDone
                              ? 'text-slate-800 bg-slate-200/90 border-slate-300 font-bold'
                              : r.scheduleNotice === '連絡済'
                              ? 'text-emerald-700 bg-emerald-50 border-transparent hover:border-slate-300 focus:border-blue-500'
                              : 'text-amber-700 border-transparent hover:border-slate-300 focus:border-blue-500'
                          }`}
                        >
                          <option value="未連絡">未連絡</option>
                          <option value="連絡済">連絡済</option>
                          <option value="日程調整中">日程調整中</option>
                        </select>
                      </td>

                      {/* U: 完了 */}
                      <td className={`py-1 px-2 text-center ${isDone ? 'bg-slate-200/90' : 'bg-white'}`}>
                        <select
                          value={r.completion}
                          onChange={(e) => handleQuickChange(r.no, 'completion', e.target.value)}
                          className={`px-2 py-1 text-xs rounded border focus:outline-hidden font-bold ${
                            r.completion === '完了'
                              ? 'text-slate-900 bg-slate-300 border-slate-400 shadow-2xs font-extrabold ring-1 ring-slate-400'
                              : r.completion === '保留'
                              ? 'text-rose-800 bg-rose-100 border-transparent hover:border-slate-300'
                              : 'text-slate-600 bg-slate-100 border-transparent hover:border-slate-300'
                          }`}
                        >
                          <option value="未完了">未完了</option>
                          <option value="完了">完了</option>
                          <option value="保留">保留</option>
                          <option value="対象外">対象外</option>
                        </select>
                      </td>

                      {/* V: 電話状況 */}
                      <td className={`py-1 px-2 ${isDone ? 'bg-slate-200/90 text-slate-700' : 'bg-white'}`}>
                        <select
                          value={r.callStatus || r.phoneStatus || '未架電'}
                          onChange={(e) => {
                            handleQuickChange(r.no, 'callStatus', e.target.value);
                            handleQuickChange(r.no, 'phoneStatus', e.target.value);
                          }}
                          className={`w-full px-2 py-1 text-xs rounded border focus:outline-hidden font-bold ${
                            isDone
                              ? 'text-slate-800 bg-slate-200/90 border-slate-300 font-bold'
                              : (r.callStatus || r.phoneStatus) === '完了'
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200 font-bold'
                              : (r.callStatus || r.phoneStatus) === '出ず' || (r.callStatus || r.phoneStatus) === '電話するも出ず'
                              ? 'text-rose-700 bg-rose-50 border-rose-200 font-bold'
                              : (r.callStatus || r.phoneStatus) === '留守電'
                              ? 'text-amber-700 bg-amber-50 border-amber-200 font-bold'
                              : (r.callStatus || r.phoneStatus) === '折返待ち'
                              ? 'text-purple-700 bg-purple-50 border-purple-200 font-bold'
                              : (r.callStatus || r.phoneStatus) === '再連絡待ち'
                              ? 'text-cyan-700 bg-cyan-50 border-cyan-200 font-bold'
                              : (r.callStatus || r.phoneStatus) === '担当不在'
                              ? 'text-orange-700 bg-orange-50 border-orange-200 font-bold'
                              : (r.callStatus || r.phoneStatus) === '通話中'
                              ? 'text-blue-700 bg-blue-50 border-blue-200 font-bold'
                              : (r.callStatus || r.phoneStatus) === '不在/再架電'
                              ? 'text-amber-700 bg-amber-50 border-amber-200 font-bold'
                              : 'text-slate-500 border-transparent hover:border-slate-300 focus:border-blue-500'
                          }`}
                        >
                          <option value="未架電">未架電</option>
                          <option value="完了">完了</option>
                          <option value="出ず">出ず</option>
                          <option value="留守電">留守電</option>
                          <option value="折返待ち">折返待ち</option>
                          <option value="再連絡待ち">再連絡待ち</option>
                          <option value="担当不在">担当不在</option>
                          <option value="通話中">通話中</option>
                          <option value="不在/再架電">不在/再架電</option>
                          <option value="着信拒否">着信拒否</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Edit Modal if requested */}
      {editFormData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-base text-slate-900">
                  店舗詳細編集（NO.{editFormData.no} {editFormData.storeName}）
                </span>
                <span className="ml-2 text-xs text-slate-500 font-mono">店番: {editFormData.storeCode}</span>
              </div>
              <button
                onClick={() => setEditFormData(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Locked Notice */}
              <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  <strong>A〜I列のマスタ情報:</strong> {editFormData.address1} {editFormData.address2} {editFormData.buildingName} / TEL: {editFormData.storeMobile} ({editFormData.managementType})
                </span>
              </div>

              {/* J〜T Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    J: 備考欄1 (LED化状況・ヒアリング詳細)
                  </label>
                  <input
                    type="text"
                    value={editFormData.remarks1}
                    onChange={(e) => setEditFormData({ ...editFormData, remarks1: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                    placeholder="例: 全灯LED済み、一部未LED（厨房内蛍光灯残）など"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    K: カテゴリ（設置場所区分）
                  </label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                  >
                    <option value="未設定">未設定</option>
                    <option value="ビルイン">ビルイン（ビルテナント）</option>
                    <option value="フードコート">フードコート（カウンター/厨房のみ）</option>
                    <option value="ロードサイド">ロードサイド（独立路面・駐車場灯有）</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    L: 図面有無
                  </label>
                  <select
                    value={editFormData.hasDrawing || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, hasDrawing: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden font-bold"
                  >
                    <option value="">-（未確認 / なし）</option>
                    <option value="○">○（図面あり）</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">M: 電話口担当</label>
                  <input
                    type="text"
                    value={editFormData.phoneContact || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, phoneContact: e.target.value })}
                    placeholder="対応者氏名・役職"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">N: 調査担当</label>
                  <input
                    type="text"
                    value={editFormData.surveyAssignee}
                    onChange={(e) => setEditFormData({ ...editFormData, surveyAssignee: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">O: 調査日</label>
                  <input
                    type="date"
                    value={editFormData.surveyDate}
                    onChange={(e) => setEditFormData({ ...editFormData, surveyDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">P: 調査資料回収</label>
                  <select
                    value={editFormData.surveyDocCollection}
                    onChange={(e) => setEditFormData({ ...editFormData, surveyDocCollection: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                  >
                    <option value="未回収">未回収</option>
                    <option value="回収済">回収済</option>
                    <option value="不要">不要</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Q: 置き換え依頼</label>
                  <select
                    value={editFormData.replacementRequest}
                    onChange={(e) => setEditFormData({ ...editFormData, replacementRequest: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                  >
                    <option value="未依頼">未依頼</option>
                    <option value="依頼済">依頼済</option>
                    <option value="対象外">対象外</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">R: 商品手配</label>
                  <select
                    value={editFormData.itemOrdering}
                    onChange={(e) => setEditFormData({ ...editFormData, itemOrdering: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                  >
                    <option value="未手配">未手配</option>
                    <option value="手配済">手配済</option>
                    <option value="納品待ち">納品待ち</option>
                    <option value="完了">完了</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">S: 作業担当</label>
                  <input
                    type="text"
                    value={editFormData.workAssignee}
                    onChange={(e) => setEditFormData({ ...editFormData, workAssignee: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">T: 日程連絡</label>
                  <select
                    value={editFormData.scheduleNotice}
                    onChange={(e) => setEditFormData({ ...editFormData, scheduleNotice: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                  >
                    <option value="未連絡">未連絡</option>
                    <option value="連絡済">連絡済</option>
                    <option value="日程調整中">日程調整中</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">U: 完了</label>
                  <select
                    value={editFormData.completion}
                    onChange={(e) => setEditFormData({ ...editFormData, completion: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden font-bold"
                  >
                    <option value="未完了">未完了</option>
                    <option value="完了">完了</option>
                    <option value="保留">保留</option>
                    <option value="対象外">対象外</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">V: 電話状況</label>
                  <select
                    value={editFormData.callStatus || editFormData.phoneStatus || '未架電'}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        callStatus: e.target.value,
                        phoneStatus: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden font-bold"
                  >
                    <option value="未架電">未架電</option>
                    <option value="完了">完了</option>
                    <option value="出ず">出ず</option>
                    <option value="留守電">留守電</option>
                    <option value="折返待ち">折返待ち</option>
                    <option value="再連絡待ち">再連絡待ち</option>
                    <option value="担当不在">担当不在</option>
                    <option value="通話中">通話中</option>
                    <option value="不在/再架電">不在/再架電</option>
                    <option value="着信拒否">着信拒否</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  onSelectStoreForCall(editFormData);
                  setEditFormData(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
              >
                <PhoneCall className="w-4 h-4" />
                <span>この店舗で通話ナビを開く</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditFormData(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveModal}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>保存する</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Diff Import & Audit Modal */}
      <CsvDiffImportModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        currentStores={records}
        onApplyDiff={handleApplyDiff}
        existingReport={lastImportReport}
        onSaveReport={handleSaveReport}
      />

      {/* Admin Data Management & Initialization Modal (Protected Hidden Feature) */}
      <AdminDataManagementModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        currentCount={records.length}
        onClearComplete={() => {
          if (onClearStores) onClearStores();
          showToast('Cloud Firestore上の全店舗データを初期化（0件）しました');
        }}
        onSeedComplete={() => {
          showToast('初期173店舗データをCloud Firestoreに投入しました');
        }}
        onOpenCsvImport={() => {
          setIsDiffModalOpen(true);
        }}
      />
    </div>
  );
};
