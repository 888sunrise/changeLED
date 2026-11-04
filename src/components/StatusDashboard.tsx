/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  CheckCircle2,
  Clock,
  PhoneCall,
  FileCheck2,
  Truck,
  Wrench,
  AlertCircle,
  Calendar,
  ArrowRight,
  ChevronRight,
  Filter,
  Search,
  Building2,
  Users,
  TrendingUp,
  Layers,
  Sparkles,
  PhoneForwarded,
  FileText,
  PhoneIncoming,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { StoreRecord, HearingRecord, isSameStore, getStoreKey } from '../types/hearing';

interface StatusDashboardProps {
  stores: StoreRecord[];
  records: HearingRecord[];
  onSelectStoreForCall: (store: StoreRecord) => void;
  onSelectStoreForPostVisit: (store: StoreRecord) => void;
  onGoToLedger: () => void;
  onGoToCall: () => void;
  onGoToPostVisit: () => void;
}

export type DashboardFilterCategory =
  | 'all'
  | 'route_a_all_led'        // ルートA: 全灯LED化済み（電話のみで即完了）
  | 'route_b_completed'      // ルートB: 訪問後・工事完了
  | 'route_b_in_progress'    // ルートB: 訪問後・工事進行中
  | 'call_pending'           // 通話ナビ: 未架電
  | 'call_recontact'         // 通話ナビ: 要再架電・折返待ち
  | 'post_visit_survey'      // 通話ナビ2: 事前調査・日程調整
  | 'post_visit_doc'         // 通話ナビ2: 書類回収待ち
  | 'post_visit_item'        // 通話ナビ2: 器具手配・置き換え中
  | 'post_visit_work';       // 通話ナビ2: 工事日程連絡・工事中

export const StatusDashboard: React.FC<StatusDashboardProps> = ({
  stores = [],
  records = [],
  onSelectStoreForCall,
  onSelectStoreForPostVisit,
  onGoToLedger,
  onGoToCall,
  onGoToPostVisit,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<DashboardFilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');

  // Helper to match hearing record for a store
  const getHearingRecord = (store: StoreRecord): HearingRecord | undefined => {
    return records.find(
      (r) =>
        (r.storeId && store.storeCode && r.storeId.trim().toLowerCase() === store.storeCode.trim().toLowerCase()) ||
        (r.storeName && store.storeName && r.storeName.trim() === store.storeName.trim()) ||
        isSameStore(store, r)
    );
  };

  // 1. Classification & Status Derivation for each store
  const analyzedStores = useMemo(() => {
    return stores.map((s) => {
      const hr = getHearingRecord(s);

      // Check if Route A: All LED Completed (電話にて全灯LED化済み・事前訪問なしで完了)
      const isAllLed =
        hr?.ledStatus === 'all_led' ||
        s.surveyDocCollection === '対象外' ||
        (Boolean(s.remarks1) && (s.remarks1.includes('全灯LED') || s.remarks1.includes('LED済み') || s.remarks1.includes('訪問調査不要')));

      // Call Status
      const rawCallStatus = s.callStatus || s.phoneStatus || hr?.callStatus || '未架電';
      const callStatusNormalized = rawCallStatus === '電話するも出ず' ? '出ず' : rawCallStatus;
      const isCallCompleted = callStatusNormalized === '完了';
      const isRecontactNeeded = ['出ず', '留守電', '折返待ち', '再連絡待ち', '担当不在', '不在/再架電'].includes(callStatusNormalized);
      const isNotCalled = callStatusNormalized === '未架電' || !callStatusNormalized;

      // Completion Status
      const isFullyCompleted = s.completion === '完了';

      // Route A vs Route B
      let route: 'route_a' | 'route_b' | 'undetermined' = 'undetermined';
      if (isAllLed) {
        route = 'route_a';
      } else if (
        hr?.ledStatus === 'partial_led' ||
        hr?.ledStatus === 'not_started' ||
        Boolean(s.surveyDate) ||
        Boolean(hr?.visitPeriodStart) ||
        (Boolean(s.remarks1) && (s.remarks1.includes('未LED') || s.remarks1.includes('要訪問調査') || s.remarks1.includes('調査')))
      ) {
        route = 'route_b';
      }

      // Post-visit Stage (for Route B)
      let postVisitStage:
        | 'survey_scheduled'
        | 'doc_pending'
        | 'doc_collected'
        | 'item_ordering'
        | 'work_scheduled'
        | 'work_completed'
        | 'not_applicable' = 'not_applicable';

      if (route === 'route_b') {
        if (isFullyCompleted) {
          postVisitStage = 'work_completed';
        } else if (s.scheduleNotice === '作業日程確定' || s.scheduleNotice === '連絡済' || Boolean(s.workScheduleDate)) {
          postVisitStage = 'work_scheduled';
        } else if (s.replacementRequest === '依頼済' || s.itemOrdering === '手配済' || s.itemOrdering === '納品待ち') {
          postVisitStage = 'item_ordering';
        } else if (s.surveyDocCollection === '回収済' || Boolean(s.surveyDocDate)) {
          postVisitStage = 'doc_collected';
        } else if (s.surveyDate && s.surveyDate.trim() !== '') {
          postVisitStage = 'doc_pending';
        } else {
          postVisitStage = 'survey_scheduled';
        }
      }

      return {
        store: s,
        hearingRecord: hr,
        isAllLed,
        callStatusNormalized,
        isCallCompleted,
        isRecontactNeeded,
        isNotCalled,
        isFullyCompleted,
        route,
        postVisitStage,
      };
    });
  }, [stores, records]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = analyzedStores.length;

    // Route A: 電話にて全灯LED化確認（訪問不要で即完了）
    const routeAAllLed = analyzedStores.filter((item) => item.route === 'route_a');

    // Route B: 事前調査引き継ぎ分（一部未LED/未着手）
    const routeBAll = analyzedStores.filter((item) => item.route === 'route_b');
    const routeBCompleted = routeBAll.filter((item) => item.isFullyCompleted);
    const routeBInProgress = routeBAll.filter((item) => !item.isFullyCompleted);

    // 全体完了数 = ルートA（全灯LED化即完了）+ ルートB（工事完了）
    const totalCompleted = routeAAllLed.length + routeBCompleted.length;
    const completionRate = total > 0 ? Math.round((totalCompleted / total) * 100) : 0;

    // 通話ナビ（電話ヒアリング）状況
    const callPending = analyzedStores.filter((item) => item.isNotCalled);
    const callRecontact = analyzedStores.filter((item) => item.isRecontactNeeded);
    const callCompleted = analyzedStores.filter((item) => item.isCallCompleted);

    // 通話ナビ2（訪問・工事）ステージ内訳
    const stageSurveyScheduled = routeBAll.filter((item) => item.postVisitStage === 'survey_scheduled');
    const stageDocPending = routeBAll.filter((item) => item.postVisitStage === 'doc_pending');
    const stageDocCollected = routeBAll.filter((item) => item.postVisitStage === 'doc_collected');
    const stageItemOrdering = routeBAll.filter((item) => item.postVisitStage === 'item_ordering');
    const stageWorkScheduled = routeBAll.filter((item) => item.postVisitStage === 'work_scheduled');
    const stageWorkCompleted = routeBAll.filter((item) => item.postVisitStage === 'work_completed');

    // 再連絡リスト（直近で架電必要なもの）
    const urgentCallbacks = analyzedStores.filter(
      (item) => item.isRecontactNeeded && (item.store.remarks1 || item.hearingRecord?.callbackScheduledAt)
    );

    // 担当者一覧
    const operators = Array.from(
      new Set(analyzedStores.map((item) => item.store.surveyAssignee?.trim()).filter(Boolean))
    );

    return {
      total,
      routeAAllLed,
      routeBAll,
      routeBCompleted,
      routeBInProgress,
      totalCompleted,
      completionRate,
      callPending,
      callRecontact,
      callCompleted,
      stageSurveyScheduled,
      stageDocPending,
      stageDocCollected,
      stageItemOrdering,
      stageWorkScheduled,
      stageWorkCompleted,
      urgentCallbacks,
      operators,
    };
  }, [analyzedStores]);

  // Filtered Store List for Drilldown
  const displayedStores = useMemo(() => {
    return analyzedStores.filter((item) => {
      // Operator filter
      if (operatorFilter !== 'all' && item.store.surveyAssignee !== operatorFilter) {
        return false;
      }

      // Category filter
      if (selectedFilter === 'route_a_all_led' && item.route !== 'route_a') return false;
      if (selectedFilter === 'route_b_completed' && (item.route !== 'route_b' || !item.isFullyCompleted)) return false;
      if (selectedFilter === 'route_b_in_progress' && (item.route !== 'route_b' || item.isFullyCompleted)) return false;
      if (selectedFilter === 'call_pending' && !item.isNotCalled) return false;
      if (selectedFilter === 'call_recontact' && !item.isRecontactNeeded) return false;
      if (selectedFilter === 'post_visit_survey' && item.postVisitStage !== 'survey_scheduled') return false;
      if (selectedFilter === 'post_visit_doc' && item.postVisitStage !== 'doc_pending' && item.postVisitStage !== 'doc_collected') return false;
      if (selectedFilter === 'post_visit_item' && item.postVisitStage !== 'item_ordering') return false;
      if (selectedFilter === 'post_visit_work' && item.postVisitStage !== 'work_scheduled') return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const s = item.store;
        const matches =
          s.storeName?.toLowerCase().includes(q) ||
          s.storeCode?.toLowerCase().includes(q) ||
          s.representativePhone?.toLowerCase().includes(q) ||
          s.surveyAssignee?.toLowerCase().includes(q) ||
          s.workAssignee?.toLowerCase().includes(q) ||
          s.remarks1?.toLowerCase().includes(q) ||
          s.address1?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [analyzedStores, selectedFilter, operatorFilter, searchQuery]);

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Header / Page Title Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center shadow-xs">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                蛍光灯→LED切替 全進捗ダッシュボード
              </h1>
              <span className="text-xs bg-pink-100 text-pink-800 font-semibold px-2.5 py-0.5 rounded-full border border-pink-200">
                173店舗リアルタイム集計
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-3xl leading-relaxed">
              「通話ナビ（電話ヒアリング）」および「通話ナビ2（訪問後・事前調査〜器具手配〜工事完了）」の全進捗を統合集計。
              電話ヒアリングで全灯LED化が確認された店舗（<strong>ルートA: 即完了</strong>）と、
              事前調査が必要と判定され工事まで進行する店舗（<strong>ルートB: 訪問〜工事完了</strong>）の各ステータスを一目で把握できます。
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onGoToCall}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
              <span>通話ナビを開く</span>
            </button>
            <button
              onClick={onGoToPostVisit}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-pink-600" />
              <span>通話ナビ2を開く</span>
            </button>
            <button
              onClick={onGoToLedger}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>進捗台帳を開く</span>
            </button>
          </div>
        </div>

        {/* Top KPI Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5 mt-6">
          {/* Card 1: Total Stores */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>全対象店舗</span>
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{metrics.total}</span>
              <span className="text-xs text-slate-500 font-medium">店舗</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">マスタ登録全173店舗</div>
          </div>

          {/* Card 2: Total Completed */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center justify-between text-emerald-800 text-xs font-medium">
              <span>総合完了数</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
                {metrics.totalCompleted}
              </span>
              <span className="text-xs text-emerald-600 font-bold">/ {metrics.total}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-emerald-700 font-semibold">
              <span>進捗率: {metrics.completionRate}%</span>
              <span className="text-[10px] text-emerald-600">
                (A: {metrics.routeAAllLed.length} / B: {metrics.routeBCompleted.length})
              </span>
            </div>
          </div>

          {/* Card 3: Route A (All LED instant completed) */}
          <div
            onClick={() => setSelectedFilter('route_a_all_led')}
            className={`border rounded-xl p-4 cursor-pointer transition-all ${
              selectedFilter === 'route_a_all_led'
                ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-300'
                : 'bg-blue-50/70 border-blue-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between text-blue-800 text-xs font-medium">
              <span>【ルートA】全灯LED済</span>
              <Sparkles className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-blue-700">
                {metrics.routeAAllLed.length}
              </span>
              <span className="text-xs text-blue-600 font-medium">件</span>
            </div>
            <div className="mt-2 text-[11px] text-blue-700">電話確認で即完了（訪問なし）</div>
          </div>

          {/* Card 4: Route B (Post-visit pipeline) */}
          <div
            onClick={() => setSelectedFilter('route_b_in_progress')}
            className={`border rounded-xl p-4 cursor-pointer transition-all ${
              selectedFilter === 'route_b_in_progress'
                ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-300'
                : 'bg-amber-50/70 border-amber-200 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between text-amber-800 text-xs font-medium">
              <span>【ルートB】訪問・工事中</span>
              <Truck className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-700">
                {metrics.routeBInProgress.length}
              </span>
              <span className="text-xs text-amber-600 font-medium">件</span>
            </div>
            <div className="mt-2 text-[11px] text-amber-700">事前調査・手配・工事進行中</div>
          </div>

          {/* Card 5: Call Recontact needed */}
          <div
            onClick={() => setSelectedFilter('call_recontact')}
            className={`border rounded-xl p-4 cursor-pointer transition-all ${
              selectedFilter === 'call_recontact'
                ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-300'
                : 'bg-rose-50/70 border-rose-200 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between text-rose-800 text-xs font-medium">
              <span>要再架電 / 折返待ち</span>
              <PhoneForwarded className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-rose-700">
                {metrics.callRecontact.length}
              </span>
              <span className="text-xs text-rose-600 font-medium">件</span>
            </div>
            <div className="mt-2 text-[11px] text-rose-700">出ず・留守電・再連絡待ち</div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-600 font-medium mb-1.5">
            <span className="flex items-center gap-1.5 font-bold text-slate-900">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              プロジェクト全体進捗率
            </span>
            <span className="font-bold text-slate-900">
              {metrics.totalCompleted} / {metrics.total} 店舗 ({metrics.completionRate}%)
            </span>
          </div>
          <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            {/* Route A (Blue) */}
            <div
              style={{ width: `${(metrics.routeAAllLed.length / (metrics.total || 1)) * 100}%` }}
              className="bg-blue-500 transition-all duration-500 relative group cursor-pointer"
              title={`ルートA (全灯LED即完了): ${metrics.routeAAllLed.length}件`}
            />
            {/* Route B Completed (Emerald) */}
            <div
              style={{ width: `${(metrics.routeBCompleted.length / (metrics.total || 1)) * 100}%` }}
              className="bg-emerald-500 transition-all duration-500 relative group cursor-pointer"
              title={`ルートB (工事完了): ${metrics.routeBCompleted.length}件`}
            />
            {/* Route B In Progress (Amber) */}
            <div
              style={{ width: `${(metrics.routeBInProgress.length / (metrics.total || 1)) * 100}%` }}
              className="bg-amber-400 transition-all duration-500 relative group cursor-pointer"
              title={`ルートB (訪問・手配・工事中): ${metrics.routeBInProgress.length}件`}
            />
            {/* Call in progress / recontact (Rose) */}
            <div
              style={{ width: `${(metrics.callRecontact.length / (metrics.total || 1)) * 100}%` }}
              className="bg-rose-400 transition-all duration-500 relative group cursor-pointer"
              title={`要再架電・折返待ち: ${metrics.callRecontact.length}件`}
            />
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-2 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
              ルートA: 全灯LED即完了 ({metrics.routeAAllLed.length}件)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
              ルートB: 工事完了 ({metrics.routeBCompleted.length}件)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
              ルートB: 訪問・手配・工事中 ({metrics.routeBInProgress.length}件)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-400 inline-block" />
              要再架電/折返 ({metrics.callRecontact.length}件)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 inline-block" />
              未着手/未架電 ({metrics.callPending.length}件)
            </span>
          </div>
        </div>
      </div>

      {/* 2. Visual Pipeline & Completion Definition Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Phase 1 通話ナビ (ヒアリング & 分岐) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">通話ナビ（電話ヒアリングフェーズ）</h3>
                  <p className="text-[11px] text-slate-500">全173店舗への架電・LED化現状の聞き取り</p>
                </div>
              </div>
              <button
                onClick={onGoToCall}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <span>架電画面へ</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Call Status Breakdown */}
            <div className="grid grid-cols-3 gap-2.5 mt-4">
              <div
                onClick={() => setSelectedFilter('call_pending')}
                className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                  selectedFilter === 'call_pending'
                    ? 'bg-slate-100 border-slate-400 font-bold'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs text-slate-500 font-medium">未架電</div>
                <div className="text-xl font-bold text-slate-800 mt-1">{metrics.callPending.length}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">着手待ち</div>
              </div>

              <div
                onClick={() => setSelectedFilter('call_recontact')}
                className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                  selectedFilter === 'call_recontact'
                    ? 'bg-rose-100 border-rose-400 font-bold'
                    : 'bg-rose-50 border-rose-200 hover:bg-rose-100'
                }`}
              >
                <div className="text-xs text-rose-700 font-medium">要再架電・折返</div>
                <div className="text-xl font-bold text-rose-700 mt-1">{metrics.callRecontact.length}</div>
                <div className="text-[10px] text-rose-500 mt-0.5">出ず/留守電/再連絡</div>
              </div>

              <div
                onClick={() => setSelectedFilter('all')}
                className="p-3 rounded-xl border border-blue-200 bg-blue-50/70 text-center cursor-pointer hover:bg-blue-100 transition-all"
              >
                <div className="text-xs text-blue-700 font-medium">通話完了</div>
                <div className="text-xl font-bold text-blue-800 mt-1">{metrics.callCompleted.length}</div>
                <div className="text-[10px] text-blue-600 mt-0.5">ヒアリング成立</div>
              </div>
            </div>

            {/* The Critical Branching Logic Explained */}
            <div className="mt-4 p-4 rounded-xl bg-slate-50/90 border border-slate-200 text-xs space-y-2.5">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>ヒアリング結果による自動分岐・完了判定ルール</span>
              </div>
              <div className="space-y-1.5 text-slate-600">
                <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <span className="font-bold text-emerald-800">① 全灯LED化済みを選択した場合:</span>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      事前訪問や交換作業が不要なため、<strong>この時点で案件即【完了】</strong>として台帳・完了一覧へ自動反映されます。
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <span className="font-bold text-amber-800">② 一部未LED または ③ 未着手を選択した場合:</span>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      事前調査が必要と判定され、訪問希望日等を設定した上で、<strong>「通話ナビ2（訪問後）」へ自動引き継ぎ</strong>されます。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Phase 2 通話ナビ2 (訪問後・事前調査〜器具手配〜工事〜完了) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">通話ナビ2（訪問後・工事進行管理フェーズ）</h3>
                  <p className="text-[11px] text-slate-500">事前調査から交換器具手配、工事完了までステータスを追跡</p>
                </div>
              </div>
              <button
                onClick={onGoToPostVisit}
                className="text-xs font-semibold text-pink-600 hover:text-pink-800 flex items-center gap-1 cursor-pointer"
              >
                <span>通話ナビ2へ</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Pipeline Stage Funnel Cards */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4">
              {/* Step 1: Survey Scheduled */}
              <div
                onClick={() => setSelectedFilter('post_visit_survey')}
                className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all ${
                  selectedFilter === 'post_visit_survey'
                    ? 'bg-amber-100 border-amber-400 font-bold'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="text-[10px] text-slate-500 font-medium">① 訪問予定</div>
                <div className="text-base font-bold text-slate-800 mt-0.5">
                  {metrics.stageSurveyScheduled.length}
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">日程調整中</div>
              </div>

              {/* Step 2: Doc Pending */}
              <div
                onClick={() => setSelectedFilter('post_visit_doc')}
                className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all ${
                  selectedFilter === 'post_visit_doc'
                    ? 'bg-amber-100 border-amber-400 font-bold'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="text-[10px] text-slate-500 font-medium">② 書類回収</div>
                <div className="text-base font-bold text-slate-800 mt-0.5">
                  {metrics.stageDocPending.length}
                </div>
                <div className="text-[9px] text-amber-600 font-medium">回収待ち</div>
              </div>

              {/* Step 3: Doc Collected */}
              <div
                onClick={() => setSelectedFilter('post_visit_doc')}
                className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-center cursor-pointer hover:bg-slate-100 transition-all"
              >
                <div className="text-[10px] text-slate-500 font-medium">③ 資料作成</div>
                <div className="text-base font-bold text-slate-800 mt-0.5">
                  {metrics.stageDocCollected.length}
                </div>
                <div className="text-[9px] text-blue-600 font-medium">回収完了</div>
              </div>

              {/* Step 4: Item Ordering */}
              <div
                onClick={() => setSelectedFilter('post_visit_item')}
                className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all ${
                  selectedFilter === 'post_visit_item'
                    ? 'bg-amber-100 border-amber-400 font-bold'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="text-[10px] text-slate-500 font-medium">④ 器具手配</div>
                <div className="text-base font-bold text-slate-800 mt-0.5">
                  {metrics.stageItemOrdering.length}
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">手配/納品待</div>
              </div>

              {/* Step 5: Work Scheduled */}
              <div
                onClick={() => setSelectedFilter('post_visit_work')}
                className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all ${
                  selectedFilter === 'post_visit_work'
                    ? 'bg-amber-100 border-amber-400 font-bold'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="text-[10px] text-slate-500 font-medium">⑤ 工事連絡</div>
                <div className="text-base font-bold text-slate-800 mt-0.5">
                  {metrics.stageWorkScheduled.length}
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">日程連絡済</div>
              </div>

              {/* Step 6: Work Completed */}
              <div
                onClick={() => setSelectedFilter('route_b_completed')}
                className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all ${
                  selectedFilter === 'route_b_completed'
                    ? 'bg-emerald-100 border-emerald-400 font-bold'
                    : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <div className="text-[10px] text-emerald-700 font-medium">⑥ 工事完了</div>
                <div className="text-base font-bold text-emerald-800 mt-0.5">
                  {metrics.stageWorkCompleted.length}
                </div>
                <div className="text-[9px] text-emerald-600 font-bold">案件完了</div>
              </div>
            </div>

            {/* Post-visit description */}
            <div className="mt-4 p-3 rounded-xl bg-pink-50/60 border border-pink-200/80 text-xs text-slate-700 space-y-1">
              <div className="font-bold text-pink-950 flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-pink-600" />
                <span>通話ナビ2の運用追跡範囲</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                事前調査が必要となった店舗（②一部未LED・③未着手）は、現地調査日程の設定から調査書類（写真・図面・報告書）の回収、
                器具置き換え依頼、商品手配、工事日程連絡を経て、最終的に<strong>【工事完了】</strong>となるまで全工程をワンストップで管理します。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Operator & Recontact Highlights Banner */}
      {metrics.urgentCallbacks.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-300/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PhoneForwarded className="w-4 h-4 text-amber-700 animate-pulse" />
              <h3 className="font-bold text-amber-950 text-sm">
                要再連絡・折返対応が必要な店舗（{metrics.urgentCallbacks.length}件）
              </h3>
            </div>
            <button
              onClick={() => setSelectedFilter('call_recontact')}
              className="text-xs font-semibold text-amber-800 hover:underline cursor-pointer"
            >
              一覧を表示
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {metrics.urgentCallbacks.slice(0, 6).map((item) => (
              <div
                key={item.store.no}
                onClick={() => onSelectStoreForCall(item.store)}
                className="bg-white border border-amber-200 hover:border-amber-400 p-3 rounded-xl cursor-pointer shadow-2xs hover:shadow-xs transition-all flex items-center justify-between"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      NO.{item.store.no} {item.store.storeName}
                    </span>
                    <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded shrink-0">
                      {item.callStatusNormalized}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {item.store.remarks1 || '再連絡予定あり'}
                  </div>
                </div>
                <button className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-2.5 py-1 rounded-md shrink-0 shadow-2xs">
                  架電
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Filterable Store Ledger Drilldown Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Filter & Search Controls */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              絞り込み:
            </span>

            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                selectedFilter === 'all'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              全店舗 ({analyzedStores.length})
            </button>

            <button
              onClick={() => setSelectedFilter('route_a_all_led')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                selectedFilter === 'route_a_all_led'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              【ルートA】全灯LED済即完了 ({metrics.routeAAllLed.length})
            </button>

            <button
              onClick={() => setSelectedFilter('route_b_completed')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                selectedFilter === 'route_b_completed'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              【ルートB】工事完了 ({metrics.routeBCompleted.length})
            </button>

            <button
              onClick={() => setSelectedFilter('route_b_in_progress')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                selectedFilter === 'route_b_in_progress'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              【ルートB】訪問・手配中 ({metrics.routeBInProgress.length})
            </button>

            <button
              onClick={() => setSelectedFilter('call_recontact')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                selectedFilter === 'call_recontact'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              要再架電/折返 ({metrics.callRecontact.length})
            </button>

            <button
              onClick={() => setSelectedFilter('call_pending')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                selectedFilter === 'call_pending'
                  ? 'bg-slate-700 text-white font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              未架電 ({metrics.callPending.length})
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Operator Filter */}
            {metrics.operators.length > 0 && (
              <select
                value={operatorFilter}
                onChange={(e) => setOperatorFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 cursor-pointer"
              >
                <option value="all">全担当者 ({metrics.operators.length}名)</option>
                {metrics.operators.map((op) => (
                  <option key={op} value={op}>
                    担当: {op}
                  </option>
                ))}
              </select>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="店舗名・店番・電話で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 w-44 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Drilldown List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-16">NO</th>
                <th className="py-2.5 px-3 w-20">店番</th>
                <th className="py-2.5 px-3 min-w-[140px]">店名</th>
                <th className="py-2.5 px-3 min-w-[100px]">運営/区分</th>
                <th className="py-2.5 px-3 min-w-[130px]">進行ルート</th>
                <th className="py-2.5 px-3 min-w-[120px]">通話ナビ状況 (V)</th>
                <th className="py-2.5 px-3 min-w-[140px]">通話ナビ2進捗</th>
                <th className="py-2.5 px-3 min-w-[90px]">全完了 (U)</th>
                <th className="py-2.5 px-3 min-w-[100px]">担当者</th>
                <th className="py-2.5 px-3 text-right min-w-[130px]">アクション</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {displayedStores.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    該当する店舗データはありません。
                  </td>
                </tr>
              ) : (
                displayedStores.map((item) => {
                  const s = item.store;
                  const isRouteA = item.route === 'route_a';
                  const isRouteB = item.route === 'route_b';

                  return (
                    <tr key={s.no} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{s.no}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{s.storeCode}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {s.storeName}
                        {s.representativePhone && (
                          <div className="text-[11px] font-normal text-slate-500 font-mono">
                            {s.representativePhone}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        <span className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                          {s.managementType || '直営'} / {s.category || '未設定'}
                        </span>
                      </td>

                      {/* Route Badge */}
                      <td className="py-2.5 px-3">
                        {isRouteA ? (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200">
                            <Sparkles className="w-3 h-3 text-blue-600" />
                            ルートA (即完了)
                          </span>
                        ) : isRouteB ? (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-200">
                            <Truck className="w-3 h-3 text-amber-600" />
                            ルートB (訪問・工事)
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">未判定</span>
                        )}
                      </td>

                      {/* Call Status */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${
                            item.callStatusNormalized === '完了'
                              ? 'bg-blue-100 text-blue-800'
                              : item.isRecontactNeeded
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.callStatusNormalized}
                        </span>
                        {s.remarks1 && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[140px] mt-0.5" title={s.remarks1}>
                            {s.remarks1}
                          </div>
                        )}
                      </td>

                      {/* Post-visit Progress */}
                      <td className="py-2.5 px-3">
                        {isRouteA ? (
                          <span className="text-[11px] text-slate-400">訪問不要（対象外）</span>
                        ) : isRouteB ? (
                          <div>
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${
                                item.postVisitStage === 'work_completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.postVisitStage === 'work_scheduled'
                                  ? 'bg-blue-100 text-blue-800'
                                  : item.postVisitStage === 'item_ordering'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : item.postVisitStage === 'doc_collected'
                                  ? 'bg-cyan-100 text-cyan-800'
                                  : item.postVisitStage === 'doc_pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {item.postVisitStage === 'work_completed' && '⑥ 工事完了'}
                              {item.postVisitStage === 'work_scheduled' && '⑤ 工事日程確定'}
                              {item.postVisitStage === 'item_ordering' && '④ 器具手配中'}
                              {item.postVisitStage === 'doc_collected' && '③ 書類回収済'}
                              {item.postVisitStage === 'doc_pending' && '② 書類回収待ち'}
                              {item.postVisitStage === 'survey_scheduled' && '① 訪問予定'}
                            </span>
                            {s.surveyDate && (
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                調査: {s.surveyDate}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">-</span>
                        )}
                      </td>

                      {/* Fully Completed U column */}
                      <td className="py-2.5 px-3">
                        {item.isFullyCompleted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            完了
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">未完了</span>
                        )}
                      </td>

                      {/* Assignee */}
                      <td className="py-2.5 px-3 text-slate-600">
                        {s.surveyAssignee ? (
                          <span className="font-medium text-slate-800">{s.surveyAssignee}</span>
                        ) : (
                          <span className="text-slate-400">未定</span>
                        )}
                        {s.workAssignee && (
                          <div className="text-[10px] text-slate-500">工: {s.workAssignee}</div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectStoreForCall(s)}
                            className="text-[11px] bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold px-2 py-1 rounded border border-blue-200 transition-colors cursor-pointer"
                            title="通話ナビ（ヒアリング）を開く"
                          >
                            架電
                          </button>
                          <button
                            onClick={() => onSelectStoreForPostVisit(s)}
                            className="text-[11px] bg-pink-50 text-pink-700 hover:bg-pink-100 font-bold px-2 py-1 rounded border border-pink-200 transition-colors cursor-pointer"
                            title="通話ナビ2（訪問後）を開く"
                          >
                            進捗
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

        {/* Table Footer Summary */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>
            表示中: <strong>{displayedStores.length}</strong> 店舗 / 全 {analyzedStores.length} 店舗
          </span>
          <span className="text-[11px] text-slate-400">
            各行の「架電」「進捗」ボタンから個別店舗の作業画面へ直接移動できます
          </span>
        </div>
      </div>
    </div>
  );
};
