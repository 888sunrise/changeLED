/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  Table,
  PhoneCall,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  Truck,
  Wrench,
  Check,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Save,
  MessageSquare,
  Building,
  Key,
  CalendarClock,
  Filter,
  CheckSquare,
  FileText,
  BadgeAlert,
  HelpCircle,
  ListFilter,
  SlidersHorizontal,
} from 'lucide-react';
import { StoreRecord, HearingRecord } from '../types/hearing';

interface PostVisitCallNavigatorProps {
  stores: StoreRecord[];
  records?: HearingRecord[];
  onUpdateStore: (updated: StoreRecord) => void;
  onUpdateStoreField: (storeNo: number, field: keyof StoreRecord, value: any) => void;
  onGoToLedger?: () => void;
  onSelectStoreForHearing?: (store: StoreRecord) => void;
  onRequestTestClear?: (store: StoreRecord) => void;
  initialStoreNo?: number | null;
}

type FilterStage =
  | 'all'
  | 'survey_scheduled'     // 要訪問調査・訪問予定
  | 'doc_pending'          // 調査済・書類回収待ち
  | 'material_started'     // 書類回収済・資料作成開始
  | 'replacement_pending'  // 置き換え依頼待ち/依頼済
  | 'schedule_coordination'// 商品手配・工事日程連絡中
  | 'completed';           // 工事完了

export const PostVisitCallNavigator: React.FC<PostVisitCallNavigatorProps> = ({
  stores = [],
  records = [],
  onUpdateStore,
  onUpdateStoreField,
  onGoToLedger,
  onSelectStoreForHearing,
  onRequestTestClear,
  initialStoreNo = null,
}) => {
  // View mode: 'list' (台帳クイック入力) or 'guided' (通話ナビ2・対話ガイダンス)
  const [viewMode, setViewMode] = useState<'list' | 'guided'>('list');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<FilterStage>('all');

  // Success toast notice
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Helper to show temporary toast
  const showToast = (msg: string) => {
    setSaveNotice(msg);
    setTimeout(() => {
      setSaveNotice(null);
    }, 2800);
  };

  // Find matched hearing record for a store
  const getHearingRecord = (store: StoreRecord): HearingRecord | undefined => {
    return records.find(
      (r) =>
        (r.storeId && store.storeCode && r.storeId.trim().toLowerCase() === store.storeCode.trim().toLowerCase()) ||
        (r.storeName && store.storeName && r.storeName.trim() === store.storeName.trim())
    );
  };

  // Check if store has visit date entered from hearing (通話ナビ) or in surveyDate
  const hasVisitDate = (store: StoreRecord, hr?: HearingRecord): boolean => {
    if (store.surveyDate && store.surveyDate.trim() !== '') return true;
    if (
      hr &&
      ((hr.visitPeriodStart && hr.visitPeriodStart.trim() !== '') ||
        (hr.preferredDate1 && hr.preferredDate1.trim() !== '') ||
        (hr.visitPeriodEnd && hr.visitPeriodEnd.trim() !== '') ||
        (hr.preferredDate2 && hr.preferredDate2.trim() !== ''))
    ) {
      return true;
    }
    return false;
  };

  // Target stores: ONLY stores where visit date was entered in 通話ナビ (ヒアリング)
  const visitDateStores = useMemo(() => {
    // 1. From master stores
    const fromStores = stores
      .filter((s) => {
        const hr = getHearingRecord(s);
        return hasVisitDate(s, hr);
      })
      .map((s) => {
        const hr = getHearingRecord(s);
        const derivedDate =
          s.surveyDate ||
          (hr?.visitPeriodStart && hr?.visitPeriodEnd
            ? `${hr.visitPeriodStart}〜${hr.visitPeriodEnd}`
            : hr?.visitPeriodStart || hr?.preferredDate1 || '');
        if (!s.surveyDate && derivedDate) {
          return { ...s, surveyDate: derivedDate };
        }
        return s;
      });

    // 2. Also check if any standalone HearingRecord in records has a visit date not in stores
    const existingStoreCodes = new Set(stores.map((s) => s.storeCode?.toLowerCase()).filter(Boolean));
    const existingStoreNames = new Set(stores.map((s) => s.storeName).filter(Boolean));

    const extraFromHearings: StoreRecord[] = [];
    records.forEach((hr, idx) => {
      const hasDate = Boolean(
        (hr.visitPeriodStart && hr.visitPeriodStart.trim() !== '') ||
        (hr.preferredDate1 && hr.preferredDate1.trim() !== '')
      );
      if (!hasDate) return;

      const isAlreadyInStores =
        (hr.storeId && existingStoreCodes.has(hr.storeId.toLowerCase())) ||
        (hr.storeName && existingStoreNames.has(hr.storeName));

      if (!isAlreadyInStores) {
        const visitDateStr =
          hr.visitPeriodStart && hr.visitPeriodEnd
            ? `${hr.visitPeriodStart}〜${hr.visitPeriodEnd}`
            : hr.visitPeriodStart || hr.preferredDate1 || '';

        extraFromHearings.push({
          no: 9000 + idx,
          storeCode: hr.storeId || '',
          representativePhone: hr.phoneNumber,
          storeName: hr.storeName,
          address1: '',
          address2: '',
          buildingName: '',
          storeMobile: hr.phoneNumber,
          managementType: '直営',
          remarks1: hr.notes || '要訪問調査',
          category:
            hr.locationCategory === 'builtin'
              ? 'ビルイン'
              : hr.locationCategory === 'foodcourt'
              ? 'フードコート'
              : hr.locationCategory === 'freesta'
              ? 'ロードサイド'
              : '未設定',
          hasDrawing: '',
          phoneContact: hr.contactPerson,
          surveyAssignee: hr.operatorName,
          surveyDate: visitDateStr,
          surveyDocCollection: '未回収',
          replacementRequest: '未依頼',
          itemOrdering: '未手配',
          workAssignee: '',
          scheduleNotice: '連絡済',
          completion: '未完了',
          callStatus: '完了',
          phoneStatus: '完了',
        });
      }
    });

    return [...fromStores, ...extraFromHearings];
  }, [stores, records]);

  // Currently selected store for Guided Mode
  const [selectedStoreNo, setSelectedStoreNo] = useState<number | null>(() => {
    if (initialStoreNo) return initialStoreNo;
    return visitDateStores[0]?.no || null;
  });

  // Keep selectedStoreNo in sync with visitDateStores
  React.useEffect(() => {
    if (selectedStoreNo && visitDateStores.some((s) => s.no === selectedStoreNo)) {
      return;
    }
    if (visitDateStores.length > 0) {
      setSelectedStoreNo(visitDateStores[0].no);
    } else {
      setSelectedStoreNo(null);
    }
  }, [visitDateStores, selectedStoreNo]);

  // Guided mode step (1 to 6)
  const [guidedStep, setGuidedStep] = useState<number>(1);

  // Find selected store
  const selectedStore = useMemo(() => {
    return visitDateStores.find((s) => s.no === selectedStoreNo) || null;
  }, [visitDateStores, selectedStoreNo]);

  const selectedHearing = useMemo(() => {
    if (!selectedStore) return undefined;
    return getHearingRecord(selectedStore);
  }, [selectedStore, records]);

  // Helper date formatted YYYY-MM-DD
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filtered Stores List (strictly from visitDateStores)
  const filteredStores = useMemo(() => {
    return visitDateStores.filter((s) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = s.storeName?.toLowerCase().includes(q);
        const matchCode = s.storeCode?.toLowerCase().includes(q);
        const matchPhone = s.representativePhone?.includes(q) || s.storeMobile?.includes(q);
        const matchContact = s.phoneContact?.toLowerCase().includes(q) || s.surveyAssignee?.toLowerCase().includes(q);
        const matchAddress = s.address1?.toLowerCase().includes(q) || s.address2?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchPhone && !matchContact && !matchAddress) {
          return false;
        }
      }

      // Stage Filter
      if (stageFilter === 'all') return true;

      if (stageFilter === 'survey_scheduled') {
        return s.completion !== '完了';
      }
      if (stageFilter === 'doc_pending') {
        return (
          s.surveyDocCollection !== '回収済' &&
          s.surveyDocCollection !== '対象外' &&
          s.surveyDocCollection !== '不要' &&
          s.completion !== '完了'
        );
      }
      if (stageFilter === 'material_started') {
        return (
          (s.surveyDocCollection === '回収済' || Boolean(s.surveyDocDate)) &&
          s.replacementRequest !== '依頼済' &&
          s.completion !== '完了'
        );
      }
      if (stageFilter === 'replacement_pending') {
        return (
          (s.surveyDocCollection === '回収済' || s.replacementRequest === '依頼済') &&
          s.itemOrdering !== '完了' &&
          s.completion !== '完了'
        );
      }
      if (stageFilter === 'schedule_coordination') {
        return (
          (s.itemOrdering === '手配済' || s.replacementRequest === '依頼済') &&
          s.completion !== '完了'
        );
      }
      if (stageFilter === 'completed') {
        return s.completion === '完了';
      }

      return true;
    });
  }, [visitDateStores, searchQuery, stageFilter]);

  // Metric counts (strictly based on visitDateStores)
  const metrics = useMemo(() => {
    let docPendingCount = 0;
    let docCollectedCount = 0;
    let materialStartedCount = 0;
    let replacementRequestedCount = 0;
    let scheduleNotifiedCount = 0;
    let completedCount = 0;

    visitDateStores.forEach((s) => {
      const isDocCollected = s.surveyDocCollection === '回収済' || Boolean(s.surveyDocDate);
      const isExcluded = s.surveyDocCollection === '対象外' || s.surveyDocCollection === '不要';
      if (!isDocCollected && !isExcluded && s.completion !== '完了') {
        docPendingCount++;
      }
      if (isDocCollected) {
        docCollectedCount++;
      }
      if (isDocCollected && s.replacementRequest !== '依頼済' && s.completion !== '完了') {
        materialStartedCount++;
      }
      if (s.replacementRequest === '依頼済' || Boolean(s.replacementRequestDate)) {
        replacementRequestedCount++;
      }
      if (s.scheduleNotice === '連絡済') {
        scheduleNotifiedCount++;
      }
      if (s.completion === '完了') {
        completedCount++;
      }
    });

    return {
      total: visitDateStores.length,
      docPendingCount,
      docCollectedCount,
      materialStartedCount,
      replacementRequestedCount,
      scheduleNotifiedCount,
      completedCount,
    };
  }, [visitDateStores]);

  // Quick field updater for table
  const handleTableFieldChange = (storeNo: number, field: keyof StoreRecord, value: any) => {
    const store = stores.find((s) => s.no === storeNo);
    if (!store) return;

    const updated = { ...store, [field]: value };

    // Auto-correlations:
    // If surveyDocDate is set, auto-set surveyDocCollection to '回収済'
    if (field === 'surveyDocDate' && value) {
      updated.surveyDocCollection = '回収済';
    }
    // If replacementRequestDate is set, auto-set replacementRequest to '依頼済'
    if (field === 'replacementRequestDate' && value) {
      updated.replacementRequest = '依頼済';
    }
    // If surveyDocCollection is '回収済' and surveyDocDate empty, default today
    if (field === 'surveyDocCollection' && value === '回収済' && !updated.surveyDocDate) {
      updated.surveyDocDate = getTodayString();
    }
    // If replacementRequest is '依頼済' and date empty, default today
    if (field === 'replacementRequest' && value === '依頼済' && !updated.replacementRequestDate) {
      updated.replacementRequestDate = getTodayString();
    }
    // If surveyDocCollection is '対象外', auto-set completion to '完了' (対象外=作業は発生しないので全行程完了扱い)
    if (field === 'surveyDocCollection' && value === '対象外') {
      updated.completion = '完了';
      showToast(`「${store.storeName}」のP列を「対象外」に設定：U列:完了 および 記録カルテ:全灯LED済 に自動連動しました`);
    }

    onUpdateStore(updated);
  };

  // Open store in guided navigation mode
  const handleOpenGuided = (store: StoreRecord, step: number = 1) => {
    setSelectedStoreNo(store.no);
    setGuidedStep(step);
    setViewMode('guided');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Advance to next store in guided mode
  const handleNextStore = () => {
    if (!selectedStore) return;
    const currentIndex = filteredStores.findIndex((s) => s.no === selectedStore.no);
    if (currentIndex >= 0 && currentIndex < filteredStores.length - 1) {
      setSelectedStoreNo(filteredStores[currentIndex + 1].no);
      setGuidedStep(1);
      showToast(`次の店舗「${filteredStores[currentIndex + 1].storeName}」に切り替えました`);
    } else {
      showToast('リスト内の最後の店舗です');
    }
  };

  const handlePrevStore = () => {
    if (!selectedStore) return;
    const currentIndex = filteredStores.findIndex((s) => s.no === selectedStore.no);
    if (currentIndex > 0) {
      setSelectedStoreNo(filteredStores[currentIndex - 1].no);
      setGuidedStep(1);
      showToast(`前の店舗「${filteredStores[currentIndex - 1].storeName}」に切り替えました`);
    }
  };

  // Save current guided store
  const handleSaveGuidedStore = () => {
    if (!selectedStore) return;
    onUpdateStore(selectedStore);
    showToast(`「${selectedStore.storeName}」の進捗を台帳およびFirestoreに保存しました`);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {saveNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveNotice}</span>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold border border-blue-400/30">
              <FileCheck2 className="w-3.5 h-3.5 text-blue-300" />
              <span>フェーズ2: 事前調査終了後〜工事完了CRM</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              通話ナビ2（訪問後進捗管理・書類回収・置き換え依頼）
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              現地訪問調査を終えた店舗の進捗を一元管理します。
              調査書類回収日、調査資料作成開始、器具置き換え依頼、商品手配、工事日程連絡までを一覧台帳および対話ガイダンスでスムーズに入力できます。
            </p>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center gap-2 self-start lg:self-auto bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>一覧クイック入力台帳</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('guided');
                if (!selectedStoreNo && stores.length > 0) {
                  setSelectedStoreNo(stores[0].no);
                }
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'guided'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <PhoneCall className="w-4 h-4" />
              <span>通話ナビ2・対話ガイダンス</span>
            </button>
          </div>
        </div>

        {/* Pipeline KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <span className="text-[11px] text-blue-200 font-medium block">訪問日入力済（通話ナビ）</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black font-mono text-white">{metrics.total}</span>
              <span className="text-[10px] text-slate-400">店舗</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <span className="text-[11px] text-amber-300 font-medium block">書類回収待ち</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black font-mono text-amber-300">{metrics.docPendingCount}</span>
              <span className="text-[10px] text-slate-400">件</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <span className="text-[11px] text-blue-300 font-medium block">書類回収済 (P列)</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black font-mono text-blue-300">{metrics.docCollectedCount}</span>
              <span className="text-[10px] text-slate-400">件</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <span className="text-[11px] text-indigo-300 font-medium block">置き換え依頼済 (Q列)</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black font-mono text-indigo-300">{metrics.replacementRequestedCount}</span>
              <span className="text-[10px] text-slate-400">件</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <span className="text-[11px] text-emerald-300 font-medium block">全工程完了 (U列)</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black font-mono text-emerald-400">{metrics.completedCount}</span>
              <span className="text-[10px] text-slate-400">件</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 font-medium block">現在表示件数</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black font-mono text-cyan-300">{filteredStores.length}</span>
              <span className="text-[10px] text-slate-400">店舗</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Stage Selection Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Stage Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStageFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              stageFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            訪問日入力済 全て ({visitDateStores.length})
          </button>
          <button
            type="button"
            onClick={() => setStageFilter('doc_pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              stageFilter === 'doc_pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            書類回収待ち ({metrics.docPendingCount})
          </button>
          <button
            type="button"
            onClick={() => setStageFilter('material_started')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              stageFilter === 'material_started'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            資料作成/開始 ({metrics.materialStartedCount})
          </button>
          <button
            type="button"
            onClick={() => setStageFilter('replacement_pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              stageFilter === 'replacement_pending'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            置き換え依頼済 ({metrics.replacementRequestedCount})
          </button>
          <button
            type="button"
            onClick={() => setStageFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              stageFilter === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            完了 ({metrics.completedCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="店舗名・店番・電話で絞り込み..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: 一覧クイック入力台帳 (TABLE VIEW) */}
      {viewMode === 'list' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>訪問後進捗一覧（インライン即時入力）</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                  {filteredStores.length}件
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                調査日・調査書類回収日付・調査資料開始・置き換え依頼を一覧に沿って直接編集できます（変更内容は自動保存）。
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>自動同期中</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[750px]">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 sticky top-0 z-20 shadow-xs text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 border-b border-r border-slate-300 w-12 text-center">NO</th>
                  <th className="py-2.5 px-3 border-b border-r border-slate-300 min-w-[170px]">店舗情報（A〜D列）</th>
                  <th className="py-2.5 px-3 border-b border-r border-slate-300 min-w-[130px]">事前調査判定 / 予定</th>
                  <th className="py-2.5 px-3 border-b border-r border-slate-300 min-w-[140px] bg-blue-50/60 text-blue-900">
                    O: 調査日（訪問日）
                  </th>
                  <th className="py-2.5 px-3 border-b border-r border-slate-300 min-w-[110px] bg-blue-50/60 text-blue-900">
                    N: 調査担当
                  </th>
                  <th className="py-2.5 px-3 border-b border-r border-slate-300 min-w-[100px] bg-amber-50/60 text-amber-900">
                    P: 調査資料回収・結果
                  </th>
                  <th className="py-2.5 px-3 border-b border-r border-slate-300 min-w-[140px] bg-amber-50/80 text-amber-950 font-black">
                    ★ 調査書類回収日付
                  </th>
                  <th className="py-2.5 px-3 border-b border-r border-slate-300 min-w-[130px] bg-indigo-50/70 text-indigo-950 font-black">
                    ★ 調査資料作成/開始
                  </th>
                  <th className="py-2.5 px-3 border-b border-r border-slate-300 min-w-[110px] bg-purple-50/60 text-purple-900">
                    Q: 置き換え依頼
                  </th>
                  <th className="py-2.5 px-3 border-b border-r border-slate-300 min-w-[130px] bg-purple-50/70 text-purple-950 font-black">
                    ★ 置き換え依頼日
                  </th>
                  <th className="py-2.5 px-3 border-b border-r border-slate-300 min-w-[100px]">
                    R: 商品手配
                  </th>
                  <th className="py-2.5 px-3 border-b border-r border-slate-300 min-w-[110px]">
                    S: 作業担当
                  </th>
                  <th className="py-2.5 px-3 border-b border-r border-slate-300 min-w-[100px]">
                    T: 日程連絡
                  </th>
                  <th className="py-2.5 px-3 border-b border-r border-slate-300 min-w-[90px]">
                    U: 完了
                  </th>
                  <th className="py-2.5 px-3 border-b border-slate-300 min-w-[110px] text-center sticky right-0 bg-slate-100 z-10 shadow-l">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {visitDateStores.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-14 text-center">
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
                          <CalendarClock className="w-6 h-6" />
                        </div>
                        <div className="text-sm font-bold text-slate-900">
                          通話ナビで訪問予定日・調査日が登録された店舗はまだありません
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          「通話ナビ2（訪問後）」には、<strong>通話ナビ（事前調査ヒアリング）で訪問予定日・期間が入力された店舗のみ</strong>が自動反映されます。<br />
                          まずは「通話ナビ」にて事前ヒアリングを実施し、訪問希望日を合意・登録してください。
                        </p>
                        {onSelectStoreForHearing && (
                          <button
                            type="button"
                            onClick={() => {
                              if (stores.length > 0) onSelectStoreForHearing(stores[0]);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>通話ナビ（ヒアリング）を開始する</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : filteredStores.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-12 text-center text-slate-400">
                      条件に一致する店舗は見つかりませんでした。
                    </td>
                  </tr>
                ) : (
                  filteredStores.map((r) => {
                    const hr = getHearingRecord(r);
                    const isCompleted = r.completion === '完了';
                    const hasSurveyDate = Boolean(r.surveyDate);
                    const isDocCollected = r.surveyDocCollection === '回収済' || Boolean(r.surveyDocDate);
                    const isReplaced = r.replacementRequest === '依頼済';

                    return (
                      <tr
                        key={r.no}
                        className={`transition-colors hover:bg-blue-50/30 ${
                          isCompleted
                            ? 'bg-slate-50/80 text-slate-500'
                            : r.no === selectedStoreNo
                            ? 'bg-blue-50/50'
                            : 'bg-white'
                        }`}
                      >
                        {/* NO */}
                        <td className="py-2 px-2 border-r border-slate-200 text-center font-mono font-bold text-slate-600">
                          {r.no}
                        </td>

                        {/* Store Info */}
                        <td className="py-2 px-3 border-r border-slate-200">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="truncate max-w-[180px]">{r.storeName}</span>
                            {r.storeCode && (
                              <span className="text-[10px] font-mono text-slate-400">
                                #{r.storeCode}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[200px] mt-0.5">
                            {r.address1 || r.representativePhone}
                          </div>
                          {r.phoneContact && (
                            <div className="text-[10px] text-blue-600 mt-0.5 truncate">
                              担当: {r.phoneContact}
                            </div>
                          )}
                        </td>

                        {/* Pre-survey hearing result */}
                        <td className="py-2 px-2 border-r border-slate-200">
                          {hr ? (
                            <div className="space-y-0.5">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  hr.surveyRequirement === 'required'
                                    ? 'bg-blue-100 text-blue-800'
                                    : hr.surveyRequirement === 'not_required'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {hr.surveyRequirement === 'required'
                                  ? '要訪問調査'
                                  : hr.surveyRequirement === 'not_required'
                                  ? '案内終了'
                                  : '確認中'}
                              </span>
                              {(hr.visitPeriodStart || hr.visitPeriodEnd) && (
                                <div className="text-[10px] text-slate-500">
                                  期間: {hr.visitPeriodStart ? hr.visitPeriodStart.slice(5) : ''}〜{hr.visitPeriodEnd ? hr.visitPeriodEnd.slice(5) : ''}
                                </div>
                              )}
                            </div>
                          ) : r.remarks1?.includes('要訪問') ? (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium border border-blue-200">
                              要訪問調査
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">事前記録なし</span>
                          )}
                        </td>

                        {/* O: 調査日 */}
                        <td className="py-1.5 px-2 border-r border-slate-200 bg-blue-50/20">
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              value={r.surveyDate || ''}
                              onChange={(e) => handleTableFieldChange(r.no, 'surveyDate', e.target.value)}
                              className="w-full text-xs px-1.5 py-1 bg-white border border-slate-200 rounded font-medium focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                            />
                            {!r.surveyDate && (
                              <button
                                type="button"
                                title="本日を設定"
                                onClick={() => handleTableFieldChange(r.no, 'surveyDate', getTodayString())}
                                className="px-1 py-1 text-[10px] font-bold bg-blue-100 hover:bg-blue-200 text-blue-800 rounded shrink-0 cursor-pointer"
                              >
                                今日
                              </button>
                            )}
                          </div>
                        </td>

                        {/* N: 調査担当 */}
                        <td className="py-1.5 px-2 border-r border-slate-200 bg-blue-50/20">
                          <input
                            type="text"
                            placeholder="調査員名"
                            value={r.surveyAssignee || ''}
                            onChange={(e) => handleTableFieldChange(r.no, 'surveyAssignee', e.target.value)}
                            className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                          />
                        </td>

                        {/* P: 調査資料回収・結果 */}
                        <td className="py-1.5 px-2 border-r border-slate-200 bg-amber-50/20">
                          <select
                            value={r.surveyDocCollection || '未回収'}
                            onChange={(e) => handleTableFieldChange(r.no, 'surveyDocCollection', e.target.value)}
                            className={`w-full text-xs px-1.5 py-1 rounded border font-medium focus:ring-1 focus:ring-amber-500 focus:outline-hidden ${
                              r.surveyDocCollection === '回収済'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                                : r.surveyDocCollection === '対象外' || r.surveyDocCollection === '不要'
                                ? 'bg-slate-100 text-slate-500 border-slate-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            <option value="未回収">未回収</option>
                            <option value="回収済">回収済</option>
                            <option value="対象外">対象外</option>
                          </select>
                        </td>

                        {/* ★ 調査書類回収日付 */}
                        <td className="py-1.5 px-2 border-r border-slate-200 bg-amber-50/40">
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              value={r.surveyDocDate || ''}
                              onChange={(e) => handleTableFieldChange(r.no, 'surveyDocDate', e.target.value)}
                              className="w-full text-xs px-1.5 py-1 bg-white border border-amber-300 rounded font-medium focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                            />
                            {!r.surveyDocDate && (
                              <button
                                type="button"
                                title="本日回収"
                                onClick={() => handleTableFieldChange(r.no, 'surveyDocDate', getTodayString())}
                                className="px-1.5 py-1 text-[10px] font-black bg-amber-500 hover:bg-amber-600 text-white rounded shrink-0 cursor-pointer shadow-2xs"
                              >
                                本日回収
                              </button>
                            )}
                          </div>
                        </td>

                        {/* ★ 調査資料作成・開始 */}
                        <td className="py-1.5 px-2 border-r border-slate-200 bg-indigo-50/30">
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              value={r.surveyMaterialStartDate || ''}
                              onChange={(e) => handleTableFieldChange(r.no, 'surveyMaterialStartDate', e.target.value)}
                              className="w-full text-xs px-1.5 py-1 bg-white border border-indigo-200 rounded font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                            />
                            {!r.surveyMaterialStartDate && (
                              <button
                                type="button"
                                title="本日作成開始"
                                onClick={() => handleTableFieldChange(r.no, 'surveyMaterialStartDate', getTodayString())}
                                className="px-1 py-1 text-[10px] font-bold bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded shrink-0 cursor-pointer"
                              >
                                開始
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Q: 置き換え依頼 */}
                        <td className="py-1.5 px-2 border-r border-slate-200 bg-purple-50/20">
                          <select
                            value={r.replacementRequest || '未依頼'}
                            onChange={(e) => handleTableFieldChange(r.no, 'replacementRequest', e.target.value)}
                            className={`w-full text-xs px-1.5 py-1 rounded border font-medium focus:ring-1 focus:ring-purple-500 focus:outline-hidden ${
                              r.replacementRequest === '依頼済'
                                ? 'bg-purple-50 text-purple-900 border-purple-300 font-bold'
                                : r.replacementRequest === '対象外'
                                ? 'bg-slate-100 text-slate-500 border-slate-300'
                                : 'bg-white text-slate-700 border-slate-300'
                            }`}
                          >
                            <option value="未依頼">未依頼</option>
                            <option value="依頼済">依頼済</option>
                            <option value="対象外">対象外</option>
                          </select>
                        </td>

                        {/* ★ 置き換え依頼日 */}
                        <td className="py-1.5 px-2 border-r border-slate-200 bg-purple-50/30">
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              value={r.replacementRequestDate || ''}
                              onChange={(e) => handleTableFieldChange(r.no, 'replacementRequestDate', e.target.value)}
                              className="w-full text-xs px-1.5 py-1 bg-white border border-purple-200 rounded font-medium focus:ring-1 focus:ring-purple-500 focus:outline-hidden"
                            />
                            {!r.replacementRequestDate && (
                              <button
                                type="button"
                                title="本日依頼"
                                onClick={() => handleTableFieldChange(r.no, 'replacementRequestDate', getTodayString())}
                                className="px-1 py-1 text-[10px] font-bold bg-purple-100 hover:bg-purple-200 text-purple-800 rounded shrink-0 cursor-pointer"
                              >
                                依頼
                              </button>
                            )}
                          </div>
                        </td>

                        {/* R: 商品手配 */}
                        <td className="py-1.5 px-2 border-r border-slate-200">
                          <select
                            value={r.itemOrdering || '未手配'}
                            onChange={(e) => handleTableFieldChange(r.no, 'itemOrdering', e.target.value)}
                            className="w-full text-xs px-1.5 py-1 bg-white border border-slate-200 rounded font-medium focus:outline-hidden"
                          >
                            <option value="未手配">未手配</option>
                            <option value="手配済">手配済</option>
                            <option value="納品待ち">納品待ち</option>
                            <option value="完了">完了</option>
                          </select>
                        </td>

                        {/* S: 作業担当 */}
                        <td className="py-1.5 px-2 border-r border-slate-200">
                          <input
                            type="text"
                            placeholder="作業員・施工会社"
                            value={r.workAssignee || ''}
                            onChange={(e) => handleTableFieldChange(r.no, 'workAssignee', e.target.value)}
                            className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                          />
                        </td>

                        {/* T: 日程連絡 */}
                        <td className="py-1.5 px-2 border-r border-slate-200">
                          <select
                            value={r.scheduleNotice || '未連絡'}
                            onChange={(e) => handleTableFieldChange(r.no, 'scheduleNotice', e.target.value)}
                            className={`w-full text-xs px-1.5 py-1 rounded border font-medium focus:outline-hidden ${
                              r.scheduleNotice === '連絡済'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                                : 'bg-white text-slate-700 border-slate-300'
                            }`}
                          >
                            <option value="未連絡">未連絡</option>
                            <option value="連絡済">連絡済</option>
                            <option value="日程調整中">日程調整中</option>
                          </select>
                        </td>

                        {/* U: 完了 */}
                        <td className="py-1.5 px-2 border-r border-slate-200">
                          <select
                            value={r.completion || '未完了'}
                            onChange={(e) => handleTableFieldChange(r.no, 'completion', e.target.value)}
                            className={`w-full text-xs px-1.5 py-1 rounded border font-medium focus:outline-hidden ${
                              r.completion === '完了'
                                ? 'bg-emerald-600 text-white font-black'
                                : 'bg-white text-slate-700 border-slate-300'
                            }`}
                          >
                            <option value="未完了">未完了</option>
                            <option value="完了">完了</option>
                          </select>
                        </td>

                        {/* Action Column */}
                        <td className="py-1.5 px-2 text-center sticky right-0 bg-white z-10 shadow-l">
                          <button
                            type="button"
                            onClick={() => handleOpenGuided(r)}
                            className="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <PhoneCall className="w-3 h-3" />
                            <span>通話ナビ2</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: 対話ガイダンス・通話ナビ2 (GUIDED CALL & ACTION NAVIGATOR) */}
      {viewMode === 'guided' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Store Selection & Stage Overview (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ListFilter className="w-4 h-4 text-blue-600" />
                  <span>訪問後 対象店舗一覧 ({filteredStores.length})</span>
                </span>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>台帳に戻る</span>
                </button>
              </div>

              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="店舗を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Stores Scrollable List */}
              <div className="max-h-[620px] overflow-y-auto space-y-2 pr-1">
                {filteredStores.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    {visitDateStores.length === 0
                      ? '訪問日登録済みの店舗はありません'
                      : '条件に一致する店舗はありません'}
                  </div>
                ) : (
                  filteredStores.map((s) => {
                  const isSelected = s.no === selectedStoreNo;
                  const isDone = s.completion === '完了';
                  const hasSurvey = Boolean(s.surveyDate);
                  const hasDoc = s.surveyDocCollection === '回収済' || Boolean(s.surveyDocDate);
                  const hasReplace = s.replacementRequest === '依頼済';

                  return (
                    <button
                      key={s.no}
                      type="button"
                      onClick={() => {
                        setSelectedStoreNo(s.no);
                        setGuidedStep(1);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {s.storeName}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          #{s.storeCode || s.no}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {s.address1 || s.representativePhone}
                      </div>

                      {/* Mini Status Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {isDone ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            工事完了
                          </span>
                        ) : (
                          <>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                hasSurvey ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {hasSurvey ? `調査済 (${s.surveyDate.slice(5)})` : '調査未実施'}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                hasDoc ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {hasDoc ? '書類回収済' : '書類未回収'}
                            </span>
                            {hasReplace && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 font-bold">
                                置き換え依頼済
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </button>
                  );
                }))}
              </div>
            </div>
          </div>

          {/* Right Column: Step-by-Step Interactive Call & Progress Navigator (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {selectedStore ? (
              <>
                {/* Active Store Banner */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-xs">
                          NO.{selectedStore.no}
                        </span>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight">
                          {selectedStore.storeName}
                        </h2>
                        {selectedStore.storeCode && (
                          <span className="text-xs text-slate-400 font-mono">
                            (店番: {selectedStore.storeCode})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                        <span>代表: {selectedStore.representativePhone || '未登録'}</span>
                        {selectedStore.phoneContact && (
                          <span>電話担当: {selectedStore.phoneContact}</span>
                        )}
                        <span>住所: {selectedStore.address1} {selectedStore.address2}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <button
                        type="button"
                        onClick={handlePrevStore}
                        className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                        title="前の店舗"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextStore}
                        className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        title="次の店舗"
                      >
                        <span>次の店舗</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {onRequestTestClear && (
                        <button
                          type="button"
                          onClick={() => onRequestTestClear(selectedStore)}
                          className="px-2.5 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="この店舗のテスト入力情報を確認してクリア"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                          <span>テストクリア</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pre-Survey Context Callout */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <CalendarClock className="w-3.5 h-3.5 text-blue-600" />
                        <span>事前調査での確認内容・希望条件:</span>
                      </span>
                      <div className="text-slate-600 pl-4 space-y-0.5">
                        {selectedHearing ? (
                          <>
                            <div>
                              判定: <strong className="text-blue-700 font-bold">
                                {selectedHearing.surveyRequirement === 'required' ? '要訪問調査' : '案内終了'}
                              </strong>
                              {selectedHearing.visitPeriodStart && (
                                <span className="ml-2">
                                  訪問希望期間: {selectedHearing.visitPeriodStart} 〜 {selectedHearing.visitPeriodEnd || ''}
                                </span>
                              )}
                            </div>
                            {selectedHearing.notes && (
                              <div className="text-slate-500 italic">特記: {selectedHearing.notes}</div>
                            )}
                          </>
                        ) : (
                          <div>{selectedStore.remarks1 || '事前調査備考なし'}</div>
                        )}
                      </div>
                    </div>

                    {onSelectStoreForHearing && (
                      <button
                        type="button"
                        onClick={() => onSelectStoreForHearing(selectedStore)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 underline self-start md:self-auto cursor-pointer"
                      >
                        事前ヒアリング内容を確認
                      </button>
                    )}
                  </div>

                  {/* Step Progress Navigation Tabs */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 pt-1">
                    {[
                      { num: 1, label: '1. 調査完了' },
                      { num: 2, label: '2. 書類回収' },
                      { num: 3, label: '3. 資料開始' },
                      { num: 4, label: '4. 置き換え' },
                      { num: 5, label: '5. 工事案内' },
                      { num: 6, label: '6. 完了保存' },
                    ].map((st) => (
                      <button
                        key={st.num}
                        type="button"
                        onClick={() => setGuidedStep(st.num)}
                        className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          guidedStep === st.num
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* STEP 1: 現地調査の完了確認 */}
                {guidedStep === 1 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 animate-in fade-in duration-200">
                    <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                          1
                        </span>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">
                            STEP 1: 現地調査の実施結果の確認（O列 調査日 / N列 調査担当）
                          </h3>
                          <p className="text-xs text-slate-500">
                            実際に店舗への訪問調査が行われた日付と調査担当者を確認・記録します。
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          O列: 調査実施日
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={selectedStore.surveyDate || ''}
                            onChange={(e) =>
                              handleTableFieldChange(selectedStore.no, 'surveyDate', e.target.value)
                            }
                            className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleTableFieldChange(selectedStore.no, 'surveyDate', getTodayString())
                            }
                            className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                          >
                            本日
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          N列: 調査担当（調査員・調査会社）
                        </label>
                        <input
                          type="text"
                          placeholder="例: 佐藤調査員 / 〇〇電気"
                          value={selectedStore.surveyAssignee || ''}
                          onChange={(e) =>
                            handleTableFieldChange(selectedStore.no, 'surveyAssignee', e.target.value)
                          }
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    {/* Quick status guide */}
                    <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 space-y-1">
                      <span className="font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>ガイダンス:</span>
                      </span>
                      <p className="text-slate-600 pl-5 leading-relaxed">
                        現地調査が完了している場合は調査日を入力してください。
                        調査日が登録されると、次の「STEP 2: 調査書類の回収」へ進んで回収日を記録できます。
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setGuidedStep(2)}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>STEP 2: 調査書類の回収へ進む</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: 調査書類の回収日付 & 回収確認 */}
                {guidedStep === 2 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 animate-in fade-in duration-200">
                    <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-amber-500 text-white text-xs font-black flex items-center justify-center">
                          2
                        </span>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">
                            STEP 2: 調査書類・写真の回収（P列 調査資料回収・結果 & 回収日付）
                          </h3>
                          <p className="text-xs text-slate-500">
                            現地調査員から上がってきた調査票・写真・分電盤図などの回収完了日付を記録します。
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          P列: 調査資料回収・結果ステータス
                        </label>
                        <select
                          value={selectedStore.surveyDocCollection || '未回収'}
                          onChange={(e) =>
                            handleTableFieldChange(selectedStore.no, 'surveyDocCollection', e.target.value)
                          }
                          className={`w-full text-xs px-3 py-2 rounded-xl border font-bold focus:outline-hidden ${
                            selectedStore.surveyDocCollection === '回収済'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : selectedStore.surveyDocCollection === '対象外' || selectedStore.surveyDocCollection === '不要'
                              ? 'bg-slate-100 text-slate-500 border-slate-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          <option value="未回収">未回収（回収待ち）</option>
                          <option value="回収済">回収済（書類確認完了）</option>
                          <option value="対象外">対象外（全行程完了）</option>
                        </select>
                        {selectedStore.surveyDocCollection === '対象外' && (
                          <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 mt-1.5 leading-snug">
                            ★ P列「対象外」連動中：工事等の作業不要のため、U列:完了、および記録カルテのLED化状況「全灯LED済」（ダッシュボード「案件終了・調査不要」）に自動反映されています。
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                          <span>調査書類回収日付</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={selectedStore.surveyDocDate || ''}
                            onChange={(e) =>
                              handleTableFieldChange(selectedStore.no, 'surveyDocDate', e.target.value)
                            }
                            className="flex-1 text-xs px-3 py-2 bg-amber-50/30 border border-amber-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleTableFieldChange(selectedStore.no, 'surveyDocDate', getTodayString());
                              handleTableFieldChange(selectedStore.no, 'surveyDocCollection', '回収済');
                            }}
                            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition-all shadow-2xs cursor-pointer"
                          >
                            本日回収済
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Document Checklist Helper */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                      <span className="text-xs font-bold text-slate-700 block">回収書類・データ確認チェックリスト:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                          <span>現地調査シート・器具灯数カウント表</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                          <span>現況写真（全灯・器具型番銘板・分電盤）</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                          <span>天井仕様・配線方式（直結・バイパス要否）</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                          <span>営業時間・夜間作業制約・鍵受渡条件確認</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setGuidedStep(1)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        前へ
                      </button>
                      <button
                        type="button"
                        onClick={() => setGuidedStep(3)}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>STEP 3: 調査資料の作成開始へ進む</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: 調査資料の開始 & LED選定照合 */}
                {guidedStep === 3 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 animate-in fade-in duration-200">
                    <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                          3
                        </span>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">
                            STEP 3: 調査資料作成・照合開始
                          </h3>
                          <p className="text-xs text-slate-500">
                            回収した現地調査資料をもとに、置き換え適合LED選定書・見積資料の作成を開始した日付を管理します。
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          <span>調査資料作成・開始日付</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={selectedStore.surveyMaterialStartDate || ''}
                            onChange={(e) =>
                              handleTableFieldChange(selectedStore.no, 'surveyMaterialStartDate', e.target.value)
                            }
                            className="flex-1 text-xs px-3 py-2 bg-indigo-50/30 border border-indigo-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleTableFieldChange(selectedStore.no, 'surveyMaterialStartDate', getTodayString());
                              handleTableFieldChange(selectedStore.no, 'surveyMaterialStatus', '作成中');
                            }}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
                          >
                            本日開始
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          資料作成ステータス
                        </label>
                        <select
                          value={selectedStore.surveyMaterialStatus || '未作成'}
                          onChange={(e) =>
                            handleTableFieldChange(selectedStore.no, 'surveyMaterialStatus', e.target.value)
                          }
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden"
                        >
                          <option value="未作成">未作成</option>
                          <option value="作成中">作成中（LED型番照合中）</option>
                          <option value="照合完了">照合完了（置き換え依頼準備完了）</option>
                        </select>
                      </div>
                    </div>

                    {/* Matching Guide */}
                    <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-3.5 text-xs text-indigo-900 space-y-1">
                      <span className="font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>選定照合の要点:</span>
                      </span>
                      <p className="text-slate-600 pl-5 leading-relaxed">
                        既存蛍光灯（FLR40W、FHF32W、コンパクト蛍光灯等）に対し、省エネ基準を満たすLED器具の適合選定を行います。
                        資料作成が完了次第、STEP 4の「置き換え依頼」を発行します。
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setGuidedStep(2)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        前へ
                      </button>
                      <button
                        type="button"
                        onClick={() => setGuidedStep(4)}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>STEP 4: 置き換え依頼へ進む</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: LED置き換え依頼 */}
                {guidedStep === 4 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 animate-in fade-in duration-200">
                    <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-purple-600 text-white text-xs font-black flex items-center justify-center">
                          4
                        </span>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">
                            STEP 4: LED置き換え依頼（Q列 置き換え依頼 & 依頼日）
                          </h3>
                          <p className="text-xs text-slate-500">
                            工事施工会社および商社へ向けたLED器具置き換え・交換手配の依頼ステータスを管理します。
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Q列: 置き換え依頼ステータス
                        </label>
                        <select
                          value={selectedStore.replacementRequest || '未依頼'}
                          onChange={(e) =>
                            handleTableFieldChange(selectedStore.no, 'replacementRequest', e.target.value)
                          }
                          className={`w-full text-xs px-3 py-2 rounded-xl border font-bold focus:outline-hidden ${
                            selectedStore.replacementRequest === '依頼済'
                              ? 'bg-purple-50 text-purple-900 border-purple-300'
                              : selectedStore.replacementRequest === '対象外'
                              ? 'bg-slate-100 text-slate-500 border-slate-300'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          <option value="未依頼">未依頼</option>
                          <option value="依頼済">依頼済（置き換え発注済）</option>
                          <option value="対象外">対象外</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                          <span>置き換え依頼日</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={selectedStore.replacementRequestDate || ''}
                            onChange={(e) =>
                              handleTableFieldChange(selectedStore.no, 'replacementRequestDate', e.target.value)
                            }
                            className="flex-1 text-xs px-3 py-2 bg-purple-50/30 border border-purple-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleTableFieldChange(selectedStore.no, 'replacementRequestDate', getTodayString());
                              handleTableFieldChange(selectedStore.no, 'replacementRequest', '依頼済');
                            }}
                            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
                          >
                            本日依頼済
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setGuidedStep(3)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        前へ
                      </button>
                      <button
                        type="button"
                        onClick={() => setGuidedStep(5)}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>STEP 5: 工事連絡 & アフター架電へ進む</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 5: 商品手配・作業担当・工事日程の店舗連絡（通話スクリプト付き） */}
                {guidedStep === 5 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 animate-in fade-in duration-200">
                    <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
                          5
                        </span>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">
                            STEP 5: 商品手配・作業担当・工事日程の店舗連絡（R・S・T列）
                          </h3>
                          <p className="text-xs text-slate-500">
                            納品器具の手配状況を確認し、店舗へ工事日程の連絡（電話連絡）を行います。
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          R列: 商品手配ステータス
                        </label>
                        <select
                          value={selectedStore.itemOrdering || '未手配'}
                          onChange={(e) =>
                            handleTableFieldChange(selectedStore.no, 'itemOrdering', e.target.value)
                          }
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden"
                        >
                          <option value="未手配">未手配</option>
                          <option value="手配済">手配済（器具発注済）</option>
                          <option value="納品待ち">納品待ち</option>
                          <option value="完了">完了（納品確認済）</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          S列: 作業担当（施工会社・職人）
                        </label>
                        <input
                          type="text"
                          placeholder="例: 山田電設 / 工事担当"
                          value={selectedStore.workAssignee || ''}
                          onChange={(e) =>
                            handleTableFieldChange(selectedStore.no, 'workAssignee', e.target.value)
                          }
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          T列: 日程連絡ステータス
                        </label>
                        <select
                          value={selectedStore.scheduleNotice || '未連絡'}
                          onChange={(e) =>
                            handleTableFieldChange(selectedStore.no, 'scheduleNotice', e.target.value)
                          }
                          className={`w-full text-xs px-3 py-2 rounded-xl border font-bold focus:outline-hidden ${
                            selectedStore.scheduleNotice === '連絡済'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          <option value="未連絡">未連絡</option>
                          <option value="連絡済">連絡済（店舗承諾済）</option>
                          <option value="日程調整中">日程調整中</option>
                        </select>
                      </div>
                    </div>

                    {/* Post-Visit Phone Dialogue Script */}
                    <div className="bg-slate-900 text-slate-100 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-blue-300 border-b border-slate-800 pb-2">
                        <span className="flex items-center gap-1.5">
                          <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
                          <span>訪問後・工事日程ご案内トークスクリプト</span>
                        </span>
                        <span className="text-[11px] text-slate-400">
                          架電先: {selectedStore.representativePhone}
                        </span>
                      </div>
                      <div className="text-xs space-y-2 leading-relaxed text-slate-200">
                        <p className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                          <strong className="text-blue-300">「お世話になっております。本部LED切替プロジェクト事務局でございます。先日は現地調査にご協力いただき誠にありがとうございました。」</strong>
                        </p>
                        <p className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                          <strong className="text-blue-300">「調査結果をもとに器具の置き換え手配が整いましたので、実際のLED交換工事の日程についてご案内のお電話を差し上げました。」</strong>
                        </p>
                        <p className="text-[11px] text-slate-400 pl-1">
                          ※事前調査で合意した時間帯（{selectedHearing?.preferredTimeSlot1 || 'アイドルタイム等'}）および鍵預かり条件に沿って工事日を決定し、T列を「連絡済」に更新します。
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setGuidedStep(4)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        前へ
                      </button>
                      <button
                        type="button"
                        onClick={() => setGuidedStep(6)}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>STEP 6: 完了判定・保存へ進む</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 6: 完了判定・保存 & 次の店舗へ */}
                {guidedStep === 6 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 animate-in fade-in duration-200">
                    <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-slate-900 text-white text-xs font-black flex items-center justify-center">
                          6
                        </span>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">
                            STEP 6: 完了判定 & 台帳反映
                          </h3>
                          <p className="text-xs text-slate-500">
                            全ステップの入力内容を確認し、完了ステータスを確定して台帳・Firestoreへ反映します。
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Progress Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                      <div>
                        <span className="text-slate-500 text-[11px] block">O: 調査実施日</span>
                        <span className="font-bold text-slate-800">
                          {selectedStore.surveyDate || '未実施'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">P: 調査書類回収日</span>
                        <span className="font-bold text-amber-700">
                          {selectedStore.surveyDocDate || selectedStore.surveyDocCollection}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Q: 置き換え依頼日</span>
                        <span className="font-bold text-purple-700">
                          {selectedStore.replacementRequestDate || selectedStore.replacementRequest}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">T: 日程連絡</span>
                        <span className="font-bold text-emerald-700">
                          {selectedStore.scheduleNotice || '未連絡'}
                        </span>
                      </div>
                    </div>

                    {/* Completion Status & Notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          U列: 案件完了ステータス
                        </label>
                        <select
                          value={selectedStore.completion || '未完了'}
                          onChange={(e) =>
                            handleTableFieldChange(selectedStore.no, 'completion', e.target.value)
                          }
                          className={`w-full text-xs px-3 py-2 rounded-xl border font-bold focus:outline-hidden ${
                            selectedStore.completion === '完了'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white text-slate-800 border-slate-300'
                          }`}
                        >
                          <option value="未完了">未完了（進行中）</option>
                          <option value="完了">完了（全行程完了）</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          訪問後進捗メモ（特記事項）
                        </label>
                        <input
                          type="text"
                          placeholder="例: 器具納品完了、10/24夜間工事予定"
                          value={selectedStore.postVisitNotes || ''}
                          onChange={(e) =>
                            handleTableFieldChange(selectedStore.no, 'postVisitNotes', e.target.value)
                          }
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setGuidedStep(5)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        前へ
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSaveGuidedStore}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          <span>台帳・クラウドへ保存</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleNextStore}
                          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>次の店舗へ進む</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
                {visitDateStores.length === 0
                  ? '通話ナビ（ヒアリング）で訪問予定日・調査日が登録された店舗はまだありません。'
                  : '左側の一覧から対象店舗を選択してください。'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
