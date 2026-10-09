/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Search,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  Clock,
  Building,
  Filter,
  List,
  LayoutGrid,
} from 'lucide-react';
import { StoreRecord, HearingRecord } from '../types/hearing';

export type CalendarType = 'survey' | 'work';

interface ScheduleCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: CalendarType;
  stores: StoreRecord[];
  records?: HearingRecord[];
  onSelectStore: (storeNo: number, step?: number) => void;
}

interface CalendarEventItem {
  id: string;
  storeNo: number;
  storeCode: string;
  storeName: string;
  dateStr: string; // YYYY-MM-DD
  rawDate: string;
  timeStr?: string; // 10:00〜20:00 等
  assignee: string;
  phone: string;
  address: string;
  category: string;
  status: string;
  isCompleted: boolean;
  type: CalendarType;
  details?: string;
}

// Helper to normalize any date string to YYYY-MM-DD
function normalizeDate(raw: string | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Range pattern like 2026-10-02〜2026-10-06 -> take first date
  const rangeMatch = trimmed.match(/^(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/);
  const target = rangeMatch ? rangeMatch[1] : trimmed;

  const ymdMatch = target.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = String(Number(ymdMatch[2])).padStart(2, '0');
    const d = String(Number(ymdMatch[3])).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

export const ScheduleCalendarModal: React.FC<ScheduleCalendarModalProps> = ({
  isOpen,
  onClose,
  initialType = 'survey',
  stores,
  records = [],
  onSelectStore,
}) => {
  const [activeType, setActiveType] = useState<CalendarType>(initialType);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected date cell for popup detail on grid
  const [selectedCellDate, setSelectedCellDate] = useState<string | null>(null);

  // Sync activeType when initialType changes
  React.useEffect(() => {
    if (isOpen) {
      setActiveType(initialType);
      setSelectedCellDate(null);
    }
  }, [isOpen, initialType]);

  // Find matched hearing record for a store
  const getHearingRecord = (store: StoreRecord): HearingRecord | undefined => {
    return records.find(
      (r) =>
        (r.storeId && store.storeCode && r.storeId.trim().toLowerCase() === store.storeCode.trim().toLowerCase()) ||
        (r.storeName && store.storeName && r.storeName.trim() === store.storeName.trim())
    );
  };

  // 1. Gather Survey Events (事前調査確定用カレンダー: STEP 1で確定された店舗のみを反映)
  const surveyEvents = useMemo<CalendarEventItem[]>(() => {
    const items: CalendarEventItem[] = [];

    stores.forEach((s) => {
      const hr = getHearingRecord(s);

      // カレンダー反映トリガー条件:
      // 実際に調査担当が行く日が確定した店舗のみ
      // (s.surveyConfirmed === true, または s.surveyConfirmedDate が設定されている,
      //  または s.surveyDate が単一日付で入力されており 〜 などの未確定期間ではない場合)
      const isConfirmed =
        s.surveyConfirmed === true ||
        Boolean(s.surveyConfirmedDate) ||
        (Boolean(s.surveyDate) &&
          !s.surveyDate.includes('〜') &&
          !s.surveyDate.includes('～') &&
          !s.surveyDate.includes('~') &&
          s.surveyDate.trim() !== '');

      if (!isConfirmed) return;

      const confirmedDate = s.surveyConfirmedDate || s.surveyDate;
      const normalized = normalizeDate(confirmedDate);
      if (!normalized) return;

      const timeStr = s.surveyConfirmedTime || hr?.preferredTimeSlot1 || '';

      const isCompleted = s.completion === '完了';
      const status =
        isCompleted
          ? '全工程完了'
          : s.surveyDocCollection === '回収済'
          ? '書類回収済'
          : s.surveyDocCollection === '対象外'
          ? '対象外(案件完了)'
          : '事前調査確定済';

      items.push({
        id: `survey-${s.no}-${normalized}`,
        storeNo: s.no,
        storeCode: s.storeCode || '',
        storeName: s.storeName,
        dateStr: normalized,
        rawDate: confirmedDate,
        timeStr,
        assignee: s.surveyAssignee || '調査員未割当',
        phone: s.representativePhone || s.storeMobile || '',
        address: `${s.address1 || ''} ${s.address2 || ''}`.trim(),
        category: s.category || '',
        status,
        isCompleted,
        type: 'survey',
        details: timeStr ? `確定時間: ${timeStr}` : undefined,
      });
    });

    return items.sort((a, b) => {
      const dateCmp = a.dateStr.localeCompare(b.dateStr);
      if (dateCmp !== 0) return dateCmp;
      return (a.timeStr || '').localeCompare(b.timeStr || '');
    });
  }, [stores, records]);

  // 2. Gather Work Events (T: 作業日程確定 & 作業確定日)
  const workEvents = useMemo<CalendarEventItem[]>(() => {
    const items: CalendarEventItem[] = [];

    stores.forEach((s) => {
      // Must be confirmed schedule
      const isConfirmed =
        s.scheduleNotice === '作業日程確定' ||
        s.scheduleNotice === '連絡済';

      // Has work schedule date or fallback to date field
      const rawDate = s.workScheduleDate || '';
      const normalized = normalizeDate(rawDate);

      // Only include if either confirmed or has work date
      if (!isConfirmed && !normalized) return;
      if (!normalized) return;

      const timeStr = s.workScheduleTime || '';

      const isCompleted = s.completion === '完了';
      const status =
        isCompleted
          ? '工事完了'
          : s.itemOrdering === '完了'
          ? '商品手配完了・工事待ち'
          : '作業日程確定済';

      items.push({
        id: `work-${s.no}-${normalized}`,
        storeNo: s.no,
        storeCode: s.storeCode || '',
        storeName: s.storeName,
        dateStr: normalized,
        rawDate,
        timeStr,
        assignee: s.workAssignee || '施工会社未定',
        phone: s.representativePhone || s.storeMobile || '',
        address: `${s.address1 || ''} ${s.address2 || ''}`.trim(),
        category: s.category || '',
        status,
        isCompleted,
        type: 'work',
        details: timeStr ? `確定時間: ${timeStr}` : s.itemOrdering ? `商品手配: ${s.itemOrdering}` : undefined,
      });
    });

    return items.sort((a, b) => {
      const dateCmp = a.dateStr.localeCompare(b.dateStr);
      if (dateCmp !== 0) return dateCmp;
      return (a.timeStr || '').localeCompare(b.timeStr || '');
    });
  }, [stores]);

  // Current active events based on tab
  const activeEvents = activeType === 'survey' ? surveyEvents : workEvents;

  // Filtered by search query
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return activeEvents;
    const q = searchQuery.toLowerCase().trim();
    return activeEvents.filter(
      (ev) =>
        ev.storeName.toLowerCase().includes(q) ||
        ev.storeCode.toLowerCase().includes(q) ||
        ev.assignee.toLowerCase().includes(q) ||
        ev.address.toLowerCase().includes(q) ||
        ev.phone.includes(q) ||
        ev.dateStr.includes(q)
    );
  }, [activeEvents, searchQuery]);

  // Calculate default display year/month
  const [currentYearMonth, setCurrentYearMonth] = useState<{ year: number; month: number }>(() => {
    // If there are events, pick month of first upcoming event or current date
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() + 1 };
  });

  // Jump to month of earliest event if user changes tabs and current month has no events
  React.useEffect(() => {
    if (activeEvents.length > 0) {
      const hasInCurrent = activeEvents.some((e) => {
        const [y, m] = e.dateStr.split('-').map(Number);
        return y === currentYearMonth.year && m === currentYearMonth.month;
      });
      if (!hasInCurrent) {
        const [firstY, firstM] = activeEvents[0].dateStr.split('-').map(Number);
        if (firstY && firstM) {
          setCurrentYearMonth({ year: firstY, month: firstM });
        }
      }
    }
  }, [activeType]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentYearMonth((prev) => {
      if (prev.month === 1) return { year: prev.year - 1, month: 12 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setCurrentYearMonth((prev) => {
      if (prev.month === 12) return { year: prev.year + 1, month: 1 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleTodayMonth = () => {
    const today = new Date();
    setCurrentYearMonth({ year: today.getFullYear(), month: today.getMonth() + 1 });
  };

  // Calendar Grid builder
  const calendarGrid = useMemo(() => {
    const { year, month } = currentYearMonth;
    // First day of month (0 = Sun, 1 = Mon, ..., 6 = Sat)
    const firstDay = new Date(year, month - 1, 1).getDay();
    // Days in current month
    const daysInMonth = new Date(year, month, 0).getDate();
    // Days in previous month
    const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

    const cells: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: CalendarEventItem[];
    }[] = [];

    const todayStr = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();

    // Index events by YYYY-MM-DD
    const eventMap = new Map<string, CalendarEventItem[]>();
    filteredEvents.forEach((ev) => {
      const list = eventMap.get(ev.dateStr) || [];
      list.push(ev);
      eventMap.set(ev.dateStr, list);
    });

    // 1. Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        events: eventMap.get(dateStr) || [],
      });
    }

    // 2. Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        events: eventMap.get(dateStr) || [],
      });
    }

    // 3. Next month leading days (fill up to 35 or 42 cells)
    const totalCells = cells.length > 35 ? 42 : 35;
    const remaining = totalCells - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        events: eventMap.get(dateStr) || [],
      });
    }

    return cells;
  }, [currentYearMonth, filteredEvents]);

  // Click store event link -> close modal and select store in parent
  const handleEventClick = (storeNo: number, type: CalendarType) => {
    // For survey, navigate to STEP 1; for work, navigate to STEP 5
    const step = type === 'survey' ? 1 : 5;
    onSelectStore(storeNo, step);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-6xl w-full max-h-[94vh] flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-7 py-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <CalendarIcon className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                通話ナビ2 進捗スケジュールカレンダー
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              各店舗の「事前調査確定日時（O列）」および「作業確定日（T列）」をカレンダー上に可視化。店名クリックで該当店舗へ直通ジャンプできます。
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="月間グリッド表示"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>月間表示</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="予定一覧リスト表示"
              >
                <List className="w-3.5 h-3.5" />
                <span>リスト一覧</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 sm:px-7 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Main 2 Calendar Tabs */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveType('survey');
                setSelectedCellDate(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeType === 'survey'
                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/30'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>① 事前調査確定用カレンダー</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                  activeType === 'survey' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
                }`}
              >
                {surveyEvents.length}件
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveType('work');
                setSelectedCellDate(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeType === 'work'
                  ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/30'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <CalendarClock className="w-4 h-4" />
              <span>② 作業日程用カレンダー</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                  activeType === 'work' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {workEvents.length}件
              </span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="店名・店番・担当者・日付で絞込..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Active Tab Notice Banner */}
          <div
            className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
              activeType === 'survey'
                ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            }`}
          >
            <div className="flex items-center gap-2">
              {activeType === 'survey' ? (
                <CalendarIcon className="w-4 h-4 text-blue-600 shrink-0" />
              ) : (
                <CalendarClock className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <div>
                <span className="font-bold">
                  {activeType === 'survey'
                    ? '【事前調査確定用カレンダー】'
                    : '【作業日程用カレンダー】'}
                </span>
                <span className="text-slate-600 ml-1">
                  {activeType === 'survey'
                    ? 'STEP 1で調査確定日時が確定された店舗のみを自動反映しています。'
                    : 'STEP 5で作業日程連絡ステータスが「作業日程確定」となり作業確定日が入力された店舗のみを自動反映しています。'}
                </span>
              </div>
            </div>

            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap hidden sm:inline">
              店名クリックで該当店舗へ直行 ↗
            </span>
          </div>

          {/* Month Navigation Header (Visible in Grid View) */}
          {viewMode === 'grid' && (
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                  title="前月"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="text-base sm:text-lg font-black font-mono text-slate-900 tracking-tight px-2">
                  {currentYearMonth.year}年 {currentYearMonth.month}月
                </h3>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                  title="次月"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleTodayMonth}
                  className="ml-2 px-2.5 py-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  今月へ
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      activeType === 'survey' ? 'bg-blue-500' : 'bg-emerald-500'
                    }`}
                  ></span>
                  <span>
                    今月内の予定: <strong>
                      {
                        filteredEvents.filter((e) => {
                          const [y, m] = e.dateStr.split('-').map(Number);
                          return y === currentYearMonth.year && m === currentYearMonth.month;
                        }).length
                      }
                    </strong> 件
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* GRID VIEW */}
          {viewMode === 'grid' && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              {/* Day of week headers */}
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-black py-2.5">
                <div className="text-rose-600">日</div>
                <div className="text-slate-700">月</div>
                <div className="text-slate-700">火</div>
                <div className="text-slate-700">水</div>
                <div className="text-slate-700">木</div>
                <div className="text-slate-700">金</div>
                <div className="text-blue-600">土</div>
              </div>

              {/* Monthly Cells */}
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
                {calendarGrid.map((cell, idx) => {
                  const dayOfWeek = idx % 7;
                  const isSun = dayOfWeek === 0;
                  const isSat = dayOfWeek === 6;
                  const isSelected = selectedCellDate === cell.dateStr;

                  return (
                    <div
                      key={cell.dateStr + '-' + idx}
                      onClick={() => {
                        if (cell.events.length > 0) {
                          setSelectedCellDate(isSelected ? null : cell.dateStr);
                        }
                      }}
                      className={`min-h-[105px] p-1.5 sm:p-2 transition-colors flex flex-col justify-between ${
                        !cell.isCurrentMonth
                          ? 'bg-slate-50/50 text-slate-400'
                          : cell.isToday
                          ? 'bg-blue-50/20'
                          : 'bg-white'
                      } ${cell.events.length > 0 ? 'hover:bg-slate-50/80 cursor-pointer' : ''} ${
                        isSelected ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/40' : ''
                      }`}
                    >
                      {/* Cell Header: Date Number & Badge */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                            cell.isToday
                              ? 'bg-blue-600 text-white shadow-2xs font-black'
                              : !cell.isCurrentMonth
                              ? 'text-slate-400'
                              : isSun
                              ? 'text-rose-600'
                              : isSat
                              ? 'text-blue-600'
                              : 'text-slate-800'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {cell.events.length > 0 && (
                          <span
                            className={`text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full ${
                              activeType === 'survey'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {cell.events.length}件
                          </span>
                        )}
                      </div>

                      {/* Event Pills inside Day Cell */}
                      <div className="space-y-1 flex-1 overflow-hidden">
                        {cell.events.slice(0, 3).map((ev) => (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventClick(ev.storeNo, ev.type);
                            }}
                            className={`w-full text-left p-1 rounded-md text-[11px] font-bold border transition-all truncate flex items-center gap-1 group shadow-2xs cursor-pointer ${
                              ev.type === 'survey'
                                ? 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200 hover:border-blue-300'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border-emerald-200 hover:border-emerald-300'
                            }`}
                            title={`クリックして「${ev.storeName}」を開く\n担当: ${ev.assignee}\n住所: ${ev.address}`}
                          >
                            <span className="truncate flex-1 font-bold flex items-center gap-1">
                              {ev.timeStr && (
                                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/10 shrink-0 font-bold">
                                  {ev.timeStr}
                                </span>
                              )}
                              <span className="truncate">
                                {ev.storeCode ? `#${ev.storeCode} ` : ''}
                                {ev.storeName}
                              </span>
                            </span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 shrink-0" />
                          </button>
                        ))}

                        {cell.events.length > 3 && (
                          <div className="text-[10px] font-bold text-slate-500 pl-1">
                            他 +{cell.events.length - 3}件...
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Drawer for selected cell details */}
          {viewMode === 'grid' && selectedCellDate && (
            <div className="bg-slate-50 border border-slate-300 rounded-2xl p-4 shadow-sm space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-sm text-slate-900 font-mono">
                    {selectedCellDate} のスケジュール一覧
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCellDate(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 p-1 rounded cursor-pointer"
                >
                  閉じる
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredEvents
                  .filter((ev) => ev.dateStr === selectedCellDate)
                  .map((ev) => (
                    <div
                      key={ev.id}
                      className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[10px] text-slate-400 font-mono">NO.{ev.storeNo} #{ev.storeCode}</div>
                          <h5 className="font-black text-slate-900 text-sm">{ev.storeName}</h5>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            ev.isCompleted
                              ? 'bg-slate-100 text-slate-600'
                              : ev.type === 'survey'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {ev.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1">
                        {ev.timeStr && (
                          <div className="flex items-center gap-1.5 font-bold text-blue-700 bg-blue-50/70 p-1.5 rounded-lg border border-blue-100">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>確定時間: {ev.timeStr}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>担当: {ev.assignee}</span>
                        </div>
                        {ev.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>TEL: {ev.phone}</span>
                          </div>
                        )}
                        {ev.address && (
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{ev.address}</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleEventClick(ev.storeNo, ev.type)}
                        className="w-full mt-2 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <span>この店舗を開く（通話ナビ2へ）</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* LIST VIEW */}
          {viewMode === 'list' && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-700">
                <span>登録スケジュール一覧 ({filteredEvents.length}件)</span>
                <span>日付順</span>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="py-14 text-center text-slate-500 space-y-2">
                  <CalendarClock className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">該当するスケジュールはありません</p>
                  <p className="text-xs text-slate-400">
                    {activeType === 'survey'
                      ? 'STEP 1で「確定」ボタンを押して調査確定日時が登録されると自動表示されます。'
                      : 'STEP 5で作業日程連絡ステータスを「作業日程確定」にし、作業確定日を入力すると自動表示されます。'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <div
                          className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-mono shrink-0 border ${
                            ev.type === 'survey'
                              ? 'bg-blue-50 text-blue-900 border-blue-200'
                              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          }`}
                        >
                          <span className="text-[10px] font-bold">
                            {ev.dateStr.slice(5, 7)}月
                          </span>
                          <span className="text-base font-black">
                            {ev.dateStr.slice(8, 10)}日
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-slate-400 font-bold">
                              NO.{ev.storeNo} #{ev.storeCode}
                            </span>
                            <h4 className="font-bold text-slate-900 text-sm">
                              {ev.storeName}
                            </h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                ev.isCompleted
                                  ? 'bg-slate-100 text-slate-600'
                                  : ev.type === 'survey'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {ev.status}
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                            {ev.timeStr && (
                              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{ev.timeStr}</span>
                              </span>
                            )}
                            <span>担当: <strong className="text-slate-700">{ev.assignee}</strong></span>
                            {ev.phone && <span>TEL: {ev.phone}</span>}
                            {ev.address && <span className="truncate max-w-xs">{ev.address}</span>}
                            {ev.rawDate && ev.rawDate !== ev.dateStr && (
                              <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 text-[10px]">
                                原本表記: {ev.rawDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleEventClick(ev.storeNo, ev.type)}
                        className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 self-start sm:self-center shrink-0 cursor-pointer shadow-2xs"
                      >
                        <span>店舗を開く</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 sm:px-7 py-3 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3 font-medium">
            <span>
              事前調査確定: <strong className="text-blue-700 font-mono">{surveyEvents.length}</strong> 件
            </span>
            <span>•</span>
            <span>
              作業日程確定: <strong className="text-emerald-700 font-mono">{workEvents.length}</strong> 件
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
