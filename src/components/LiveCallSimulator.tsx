/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  PhoneCall,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building,
  Store,
  Car,
  Key,
  Calendar,
  Clock,
  ClipboardCopy,
  Check,
  ChevronRight,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Save,
  PhoneMissed,
  Voicemail,
  PhoneForwarded,
  CalendarClock,
  UserX,
  MessageSquare,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { HearingRecord, LedStatus, SimulatorLocationCategory, TimeSlot, KeyCustodyStatus, StoreRecord } from '../types/hearing';

export type CallStatusOption =
  | 'connected'        // つながり・ヒアリング承諾（STEP 2へ）
  | 'no_answer'        // 電話するも出ず（呼出音のみ・話中）
  | 'voicemail'        // 留守電（メッセージ録音）
  | 'callback_waiting' // 折返待ち（スタッフ伝言預け）
  | 'reschedule'       // 再連絡日時を指定（再架電予約）
  | 'staff_away';      // 担当不在

interface LiveCallSimulatorProps {
  onSaveRecord: (record: HearingRecord) => void;
  onGoToChecksheet: () => void;
  stores?: StoreRecord[];
  initialStore?: StoreRecord | null;
  onUpdateStoreField?: (storeNo: number, field: keyof StoreRecord, value: any) => void;
  onSelectStore?: (store: StoreRecord) => void;
  onBackToLedger?: () => void;
}

export const LiveCallSimulator: React.FC<LiveCallSimulatorProps> = ({
  onSaveRecord,
  onGoToChecksheet,
  stores = [],
  initialStore = null,
  onUpdateStoreField,
  onSelectStore,
  onBackToLedger,
}) => {
  // Selected Store from master
  const [selectedStoreNo, setSelectedStoreNo] = useState<number | null>(initialStore ? initialStore.no : null);

  // Call Outcome State (電話ステータス: 承諾・出ず・留守電・折返・再連絡・不在)
  const [callOutcome, setCallOutcome] = useState<CallStatusOption>('connected');
  const [noAnswerDetail, setNoAnswerDetail] = useState<string>('20秒以上呼出（応答なし）');
  const [voicemailRecorded, setVoicemailRecorded] = useState<boolean>(true);
  const [voicemailNote, setVoicemailNote] = useState<string>('');
  const [callbackStaffName, setCallbackStaffName] = useState<string>('');
  const [callbackExpectedTime, setCallbackExpectedTime] = useState<string>('');

  // 再連絡日時（再架電予約）
  const [callbackDate, setCallbackDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [callbackTimeSlot, setCallbackTimeSlot] = useState<string>('14:00〜16:00（アイドルタイム）');
  const [callbackExactTime, setCallbackExactTime] = useState<string>('');
  const [callbackCustomNotes, setCallbackCustomNotes] = useState<string>('');
  const [staffAwayReason, setStaffAwayReason] = useState<string>('本日公休・シフト不在');

  // Outcome Saved Modal state
  const [outcomeSavedModal, setOutcomeSavedModal] = useState<{
    statusLabel: string;
    storeName: string;
    scheduledTime?: string;
    notes?: string;
    nextStore?: StoreRecord | null;
  } | null>(null);

  // Form State - Operator Selection ('比嘉', '栗木', '吉原', 'その他')
  const [operatorSelect, setOperatorSelect] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('led_operator_select');
      if (saved && ['比嘉', '栗木', '吉原', 'その他'].includes(saved)) {
        return saved;
      }
    } catch {}
    return '';
  });
  const [customOperator, setCustomOperator] = useState<string>(() => {
    try {
      return localStorage.getItem('led_custom_operator') || '';
    } catch {
      return '';
    }
  });

  const operatorName = operatorSelect === 'その他' ? customOperator.trim() : operatorSelect;

  const [storeName, setStoreName] = useState(initialStore ? initialStore.storeName : '');
  const [storeId, setStoreId] = useState(initialStore ? initialStore.storeCode : '');
  const [contactPerson, setContactPerson] = useState('');
  const [contactRole, setContactRole] = useState('店長');
  const [phoneNumber, setPhoneNumber] = useState(initialStore ? initialStore.storeMobile : '');

  // Keep synced if initialStore changes
  React.useEffect(() => {
    if (initialStore) {
      setSelectedStoreNo(initialStore.no);
      setStoreName(initialStore.storeName);
      setStoreId(initialStore.storeCode);
      setPhoneNumber(initialStore.storeMobile);
      if (initialStore.category === 'ビルイン') setManualCategory('builtin');
      else if (initialStore.category === 'フードコート') setManualCategory('foodcourt');
      else if (initialStore.category === 'ロードサイド' || initialStore.category === 'フリスタ') setManualCategory('freesta');
    }
  }, [initialStore]);

  // Step 2: LED Status
  const [ledStatus, setLedStatus] = useState<LedStatus | null>(null);
  const [partialAreas, setPartialAreas] = useState('');

  // Step 3: Location Determination
  const [isTenantInBuilding, setIsTenantInBuilding] = useState<boolean | null>(null);
  const [isCounterOnly, setIsCounterOnly] = useState<boolean | null>(null);
  const [hasDedicatedParkingLights, setHasDedicatedParkingLights] = useState<boolean | null>(null);
  const [manualCategory, setManualCategory] = useState<SimulatorLocationCategory | null>(null);

  // Step 4: Visit Period & Time Slots (何日〜何日までに伺うか & 希望時間帯)
  const [visitPeriodStart, setVisitPeriodStart] = useState('');
  const [visitPeriodEnd, setVisitPeriodEnd] = useState('');
  const [preferredDate1, setPreferredDate1] = useState('');
  const [timeSlot1, setTimeSlot1] = useState<TimeSlot>('idle_time');
  const [preferredDate2, setPreferredDate2] = useState('');
  const [timeSlot2, setTimeSlot2] = useState<TimeSlot>('idle_time');
  const [dayPreferenceNotes, setDayPreferenceNotes] = useState('');
  const [workTiming, setWorkTiming] = useState<'idle_time' | 'during_hours' | 'after_hours'>('idle_time');

  const formatDateJp = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length < 3) return dateStr;
      return `${parseInt(parts[1], 10)}月${parseInt(parts[2], 10)}日`;
    } catch {
      return dateStr;
    }
  };

  const handleSetVisitStart = (val: string) => {
    setVisitPeriodStart(val);
    setPreferredDate1(val);
  };

  const handleSetVisitEnd = (val: string) => {
    setVisitPeriodEnd(val);
    setPreferredDate2(val);
  };

  const setPresetRangeDays = (days: number) => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + days - 1);

    const toYmd = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const s = toYmd(start);
    const e = toYmd(end);
    handleSetVisitStart(s);
    handleSetVisitEnd(e);
  };

  const setNextWeekPreset = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sun, 1 is Mon
    const daysUntilNextMon = currentDay === 0 ? 1 : 8 - currentDay;
    const nextMon = new Date(today);
    nextMon.setDate(today.getDate() + daysUntilNextMon);
    const nextFri = new Date(nextMon);
    nextFri.setDate(nextMon.getDate() + 4);

    const toYmd = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const s = toYmd(nextMon);
    const e = toYmd(nextFri);
    handleSetVisitStart(s);
    handleSetVisitEnd(e);
  };

  const setCallbackDatePreset = (preset: 'today' | 'tomorrow' | 'day_after' | 'next_mon') => {
    const d = new Date();
    if (preset === 'today') {
      // today
    } else if (preset === 'tomorrow') {
      d.setDate(d.getDate() + 1);
    } else if (preset === 'day_after') {
      d.setDate(d.getDate() + 2);
    } else if (preset === 'next_mon') {
      const cur = d.getDay();
      const diff = cur === 0 ? 1 : 8 - cur;
      d.setDate(d.getDate() + diff);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setCallbackDate(`${year}-${month}-${day}`);
  };

  const handleSelectStore = (store: StoreRecord) => {
    setSelectedStoreNo(store.no);
    setStoreName(store.storeName);
    setStoreId(store.storeCode);
    setPhoneNumber(store.storeMobile);
    if (store.category === 'ビルイン') setManualCategory('builtin');
    else if (store.category === 'フードコート') setManualCategory('foodcourt');
    else if (store.category === 'ロードサイド' || store.category === 'フリスタ') setManualCategory('freesta');
    setCurrentStep(1);
    setOutcomeSavedModal(null);
    setCallOutcome('connected');
    if (onSelectStore) {
      onSelectStore(store);
    }
  };

  const handleSaveNonConnectedStatus = (chosenStatus: CallStatusOption) => {
    if (!operatorName) {
      alert('架電オペレーターを選択してください（比嘉、栗木、吉原、その他）');
      return;
    }

    let statusLabel = '';
    let phoneStatusVal: string = '未架電';
    let remarkAddition = '';
    let fullNotes = '';

    const nowTime = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    const nowDate = new Date().toLocaleDateString('ja-JP');

    if (chosenStatus === 'no_answer') {
      statusLabel = '電話するも出ず';
      phoneStatusVal = '電話するも出ず';
      remarkAddition = `【出ず】${nowDate} ${nowTime} (${noAnswerDetail})`;
      fullNotes = `電話するも応答なし。状況: ${noAnswerDetail} (架電: ${operatorName})`;
    } else if (chosenStatus === 'voicemail') {
      statusLabel = '留守電';
      phoneStatusVal = '留守電';
      remarkAddition = `【留守電】${nowDate} ${nowTime} メッセージ録音済${voicemailNote ? ' ' + voicemailNote : ''}`;
      fullNotes = `留守番電話に接続。ガイダンスに従い調査趣旨の伝言メッセージを録音。${voicemailNote} (架電: ${operatorName})`;
    } else if (chosenStatus === 'callback_waiting') {
      statusLabel = '折返待ち';
      phoneStatusVal = '折返待ち';
      remarkAddition = `【折返待ち】${nowDate} ${nowTime} 受付: ${callbackStaffName || 'スタッフ'} ${callbackExpectedTime ? ' 目安: ' + callbackExpectedTime : ''}`;
      fullNotes = `店舗スタッフ様（${callbackStaffName || 'スタッフ'}）に用件伝達・折返し依頼済み。戻り予定: ${callbackExpectedTime || '未定'} (架電: ${operatorName})`;
    } else if (chosenStatus === 'reschedule') {
      statusLabel = '再連絡待ち';
      phoneStatusVal = '再連絡待ち';
      const timeDisplay = callbackExactTime ? callbackExactTime : callbackTimeSlot;
      remarkAddition = `【再連絡予定】${formatDateJp(callbackDate)} ${timeDisplay}${callbackCustomNotes ? ' / ' + callbackCustomNotes : ''}`;
      fullNotes = `店舗様より再架電日時の指定あり。再連絡予定日時: ${callbackDate} ${timeDisplay}。特記要望: ${callbackCustomNotes} (架電: ${operatorName})`;
    } else if (chosenStatus === 'staff_away') {
      statusLabel = '担当不在';
      phoneStatusVal = '担当不在';
      remarkAddition = `【担当不在】${nowDate} ${nowTime} (${staffAwayReason})`;
      fullNotes = `店長・設備責任者不在。理由: ${staffAwayReason} (架電: ${operatorName})`;
    }

    // 1. Update master store in Firestore
    if (selectedStoreNo && onUpdateStoreField) {
      onUpdateStoreField(selectedStoreNo, 'phoneStatus', phoneStatusVal);
      onUpdateStoreField(selectedStoreNo, 'surveyAssignee', operatorName);

      const curStore = stores.find((s) => s.no === selectedStoreNo);
      const existingRemark = curStore?.remarks1 || '';
      const newRemark = existingRemark ? `${existingRemark} / ${remarkAddition}` : remarkAddition;
      onUpdateStoreField(selectedStoreNo, 'remarks1', newRemark);
    }

    // 2. Save Hearing Record
    const scheduledTimeStr = chosenStatus === 'reschedule' ? `${callbackDate} ${callbackExactTime || callbackTimeSlot}` : undefined;
    const newHearing: HearingRecord = {
      id: `rec-${Date.now()}`,
      timestamp: new Date().toLocaleString('ja-JP'),
      operatorName,
      storeName: storeName || (selectedStoreNo ? `NO.${selectedStoreNo} 店舗` : '無題店舗'),
      storeId,
      contactPerson: callbackStaffName || contactPerson || '店舗担当者様',
      contactRole: chosenStatus === 'callback_waiting' ? 'スタッフ' : contactRole,
      phoneNumber,
      ledStatus: 'not_started',
      locationCategory: computedCategory || 'unspecified',
      surveyRequirement: 'pending',
      afterHoursTriggered: false,
      keyCustody: 'not_applicable',
      notes: fullNotes,
      status: 'follow_up_needed',
      callStatus: statusLabel,
      callbackScheduledAt: scheduledTimeStr,
      callbackNotes: fullNotes,
    };

    onSaveRecord(newHearing);

    // 3. Find next unphoned store
    const currentIndex = stores.findIndex((s) => s.no === selectedStoreNo);
    let nextUnphoned = stores.find((s, idx) => idx > currentIndex && (s.phoneStatus === '未架電' || !s.phoneStatus));
    if (!nextUnphoned) {
      nextUnphoned = stores.find((s) => (s.phoneStatus === '未架電' || !s.phoneStatus) && s.no !== selectedStoreNo);
    }

    setOutcomeSavedModal({
      statusLabel,
      storeName: storeName || (selectedStoreNo ? `NO.${selectedStoreNo}` : ''),
      scheduledTime: scheduledTimeStr,
      notes: remarkAddition,
      nextStore: nextUnphoned || null,
    });
  };

  // Step 5: Lock & Key Procedure (Conditional on after_hours)
  const [keyCustody, setKeyCustody] = useState<KeyCustodyStatus>('possible');
  const [lockProcedure, setLockProcedure] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Additional Notes
  const [notes, setNotes] = useState('');

  // Active Wizard Step (1: Basic, 2: LED Check, 3: Location, 4: Schedule, 5: Lock/Key, 6: Summary)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Determine computed location category
  const getComputedCategory = (): SimulatorLocationCategory => {
    if (manualCategory) return manualCategory;
    if (isCounterOnly === true) return 'foodcourt';
    if (hasDedicatedParkingLights === true || isTenantInBuilding === false) return 'freesta';
    if (isTenantInBuilding === true && isCounterOnly === false) return 'builtin';
    return 'unspecified';
  };

  const computedCategory = getComputedCategory();

  // Determine survey requirement:
  // If all_led -> not_required (End of case)
  // If partial_led or not_started -> required
  const surveyRequirement = ledStatus === 'all_led' ? 'not_required' : ledStatus ? 'required' : 'pending';

  // Condition check: Is after hours selected?
  const isAfterHours = workTiming === 'after_hours' || timeSlot1 === 'after_hours';

  // Generate CRM Report Text
  const generateCrmSummary = (): string => {
    const categoryLabel =
      computedCategory === 'builtin'
        ? 'ビルトイン（ビルテナント）'
        : computedCategory === 'foodcourt'
        ? 'フードコート（カウンター/キッチンのみ）'
        : computedCategory === 'freesta'
        ? 'ロードサイド（独立店舗・駐車場灯有）'
        : '未特定';

    const ledLabel =
      ledStatus === 'all_led'
        ? '【全灯LED化済み】'
        : ledStatus === 'partial_led'
        ? '【一部未LED（蛍光灯残存あり）】'
        : ledStatus === 'not_started'
        ? '【未着手（全面蛍光灯）】'
        : '未確認';

    const surveyLabel =
      surveyRequirement === 'not_required'
        ? '訪問調査：不要（案件完了）'
        : '訪問調査：必要（技術員手配へ）';

    let summary = `【蛍光灯→LED切替 事前調査 電話ヒアリング結果】\n`;
    summary += `・実施日時: ${new Date().toLocaleString('ja-JP')}\n`;
    summary += `・担当オペレーター: ${operatorName || '未記入'}\n`;
    summary += `・店舗名: ${storeName || '未記入'} (ID: ${storeId || '-'})\n`;
    summary += `・対応者: ${contactPerson || '担当者'} 様 (${contactRole})\n`;
    summary += `・電話番号: ${phoneNumber || '-'}\n`;
    summary += `----------------------------------------\n`;
    summary += `■ LED化状況: ${ledLabel}\n`;
    if (ledStatus !== 'all_led' && partialAreas) {
      summary += `  残存箇所: ${partialAreas}\n`;
    }
    summary += `■ 判定結果: ${surveyLabel}\n`;

    if (surveyRequirement === 'required') {
      summary += `■ 設置場所区分: ${categoryLabel}\n`;
      summary += `■ 訪問予定期間（伺う日程枠）:\n`;
      const periodStr =
        visitPeriodStart && visitPeriodEnd
          ? `${visitPeriodStart} 〜 ${visitPeriodEnd}`
          : visitPeriodStart || preferredDate1 || '未定';
      summary += `  ・訪問予定期間: ${periodStr}\n`;
      summary += `  ・第1希望時間帯: ${timeSlotLabel(timeSlot1)}\n`;
      if (timeSlot2 && timeSlot2 !== timeSlot1) {
        summary += `  ・第2希望時間帯（予備）: ${timeSlotLabel(timeSlot2)}\n`;
      }
      if (dayPreferenceNotes) {
        summary += `  ・曜日/時間帯の店舗要望: ${dayPreferenceNotes}\n`;
      }
      summary += `  ・希望作業帯: ${workTiming === 'after_hours' ? '営業終了後・夜間作業' : '営業時間内/アイドルタイム'}\n`;

      if (isAfterHours) {
        summary += `■ 【条件発動】戸締り・鍵管理確認:\n`;
        summary += `  ・鍵預かり可否: ${keyCustody === 'possible' ? '預かり可能' : keyCustody === 'not_possible' ? '預かり不可（スタッフ立会い）' : '立会い要'}\n`;
        summary += `  ・施錠返却手順: ${lockProcedure || '特記事項なし'}\n`;
        if (emergencyContact) {
          summary += `  ・緊急連絡先: ${emergencyContact}\n`;
        }
      }
    }
    if (notes) {
      summary += `■ 備考・特記事項:\n  ${notes}\n`;
    }

    return summary;
  };

  const timeSlotLabel = (slot: TimeSlot): string => {
    switch (slot) {
      case 'idle_time':
        return 'アイドルタイム（14:00〜16:00等）';
      case 'morning':
        return '午前中（10:00〜12:00 / 開店前）';
      case 'afternoon':
        return '午後（13:00〜17:00）';
      case 'after_hours':
        return '営業終了後・夜間（閉店後）';
      case 'any':
        return '終日可（時間指定なし）';
      default:
        return '指定なし';
    }
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(generateCrmSummary());
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleSave = () => {
    const record: HearingRecord = {
      id: `rec-${Date.now()}`,
      timestamp: new Date().toLocaleString('ja-JP'),
      operatorName,
      storeName: storeName || '無題店舗',
      storeId,
      contactPerson: contactPerson || '店長様',
      contactRole,
      phoneNumber,
      ledStatus: ledStatus || 'not_started',
      partialAreas,
      locationCategory: computedCategory,
      locationDetails: {
        isTenantInBuilding: isTenantInBuilding ?? false,
        isCounterOnly: isCounterOnly ?? false,
        hasDedicatedParkingLights: hasDedicatedParkingLights ?? false,
      },
      surveyRequirement: surveyRequirement === 'not_required' ? 'not_required' : 'required',
      visitPeriodStart: visitPeriodStart || preferredDate1,
      visitPeriodEnd: visitPeriodEnd || preferredDate2,
      preferredDate1: visitPeriodStart || preferredDate1,
      preferredTimeSlot1: timeSlot1,
      preferredDate2: visitPeriodEnd || preferredDate2,
      preferredTimeSlot2: timeSlot2,
      workTiming,
      afterHoursTriggered: isAfterHours,
      keyCustody: isAfterHours ? keyCustody : 'not_applicable',
      lockProcedure,
      emergencyContact,
      notes: notes + (dayPreferenceNotes ? ` [時間帯・曜日要望: ${dayPreferenceNotes}]` : ''),
      status: 'completed',
    };

    onSaveRecord(record);

    // If associated with a master store record, update its fields
    if (selectedStoreNo && onUpdateStoreField) {
      const catJpn =
        computedCategory === 'builtin'
          ? 'ビルイン'
          : computedCategory === 'foodcourt'
          ? 'フードコート'
          : computedCategory === 'freesta'
          ? 'ロードサイド'
          : '未設定';

      onUpdateStoreField(selectedStoreNo, 'category', catJpn);
      onUpdateStoreField(selectedStoreNo, 'phoneStatus', '完了');
      if (ledStatus === 'all_led') {
        onUpdateStoreField(selectedStoreNo, 'remarks1', '全灯LED済み（訪問調査不要）');
        onUpdateStoreField(selectedStoreNo, 'surveyDocCollection', '不要');
        onUpdateStoreField(selectedStoreNo, 'replacementRequest', '対象外');
        onUpdateStoreField(selectedStoreNo, 'itemOrdering', '完了');
        onUpdateStoreField(selectedStoreNo, 'scheduleNotice', '連絡済');
        onUpdateStoreField(selectedStoreNo, 'completion', '完了');
      } else {
        onUpdateStoreField(selectedStoreNo, 'remarks1', partialAreas || '一部未LED(蛍光灯有)');
        const surveyPeriodStr =
          visitPeriodStart && visitPeriodEnd
            ? `${visitPeriodStart}〜${visitPeriodEnd}`
            : visitPeriodStart || preferredDate1 || '';
        if (surveyPeriodStr) {
          onUpdateStoreField(selectedStoreNo, 'surveyDate', surveyPeriodStr);
        }
        onUpdateStoreField(selectedStoreNo, 'surveyAssignee', operatorName);
        onUpdateStoreField(selectedStoreNo, 'scheduleNotice', '連絡済');
        onUpdateStoreField(selectedStoreNo, 'completion', '未完了');
      }
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleReset = () => {
    setStoreName('');
    setStoreId('');
    setContactPerson('');
    setPhoneNumber('');
    setLedStatus(null);
    setPartialAreas('');
    setIsTenantInBuilding(null);
    setIsCounterOnly(null);
    setHasDedicatedParkingLights(null);
    setManualCategory(null);
    setVisitPeriodStart('');
    setVisitPeriodEnd('');
    setPreferredDate1('');
    setPreferredDate2('');
    setTimeSlot1('idle_time');
    setTimeSlot2('idle_time');
    setDayPreferenceNotes('');
    setKeyCustody('possible');
    setLockProcedure('');
    setEmergencyContact('');
    setNotes('');
    setCurrentStep(1);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Top Console Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-xl font-bold text-slate-900">通話ヒアリング ナビゲーション</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            店舗様との通話中に選択肢をクリックするだけで、次のトークスクリプトと調査要否・設置区分を即座に自動判定します。
          </p>
          {selectedStoreNo && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
              <span className="text-slate-500 font-medium">架電先:</span>
              <strong className="text-slate-900">NO.{selectedStoreNo} {storeName}</strong>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500 font-medium">TEL:</span>
              <span className="font-mono font-bold text-blue-700">{phoneNumber || '-'}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500 font-medium">電話ステータス(M):</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                stores.find((s) => s.no === selectedStoreNo)?.phoneStatus === '完了'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : stores.find((s) => s.no === selectedStoreNo)?.phoneStatus === '電話するも出ず'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : stores.find((s) => s.no === selectedStoreNo)?.phoneStatus === '留守電'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : stores.find((s) => s.no === selectedStoreNo)?.phoneStatus === '折返待ち'
                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                  : stores.find((s) => s.no === selectedStoreNo)?.phoneStatus === '再連絡待ち'
                  ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                  : stores.find((s) => s.no === selectedStoreNo)?.phoneStatus === '担当不在'
                  ? 'bg-orange-50 text-orange-800 border-orange-200'
                  : stores.find((s) => s.no === selectedStoreNo)?.phoneStatus === '通話中'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {stores.find((s) => s.no === selectedStoreNo)?.phoneStatus || '未架電'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
          {onBackToLedger && (
            <button
              onClick={onBackToLedger}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>台帳一覧に戻る</span>
            </button>
          )}

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>リセット</span>
          </button>
        </div>
      </div>

      {/* Step Navigator Progress */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between overflow-x-auto gap-2 text-xs">
          {[
            { num: 1, label: '1. 基本情報・導入' },
            { num: 2, label: '2. LED化確認（要否判定）' },
            { num: 3, label: '3. 設置場所区分' },
            { num: 4, label: '4. 訪問日程調整' },
            { num: 5, label: '5. 戸締り・鍵確認', condition: isAfterHours },
            { num: 6, label: '6. 復唱・完了' },
          ].map((s) => {
            const isActive = currentStep === s.num;
            const isDone = currentStep > s.num;
            const isSkipped = s.condition === false;

            return (
              <button
                key={s.num}
                onClick={() => setCurrentStep(s.num)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : isDone
                    ? 'bg-blue-50 text-blue-800'
                    : isSkipped
                    ? 'text-slate-400 bg-slate-50 opacity-60'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                    isActive ? 'bg-white text-blue-600' : isDone ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {isDone ? '✓' : s.num}
                </span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Step Cards */}
      <div className="space-y-6">
        {/* STEP 1: Basic Information & Opening Greeting */}
        {currentStep === 1 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-sm sm:text-base text-slate-900">
                STEP 1: 発信先店舗の確認 & 挨拶・趣旨説明
              </span>
              <span className="text-xs text-slate-500">基本入力 & オープニング</span>
            </div>

            <div className="p-5 space-y-5">
              {/* Master Store Selector if stores prop provided */}
              {stores.length > 0 && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <span>店舗マスタ（A〜I列）から対象店舗を選択：</span>
                    </label>
                    <span className="text-[11px] text-blue-700 font-mono">
                      全{stores.length}店舗登録済み
                    </span>
                  </div>
                  <select
                    value={selectedStoreNo || ''}
                    onChange={(e) => {
                      const no = Number(e.target.value);
                      setSelectedStoreNo(no);
                      const target = stores.find((s) => s.no === no);
                      if (target) {
                        setStoreName(target.storeName);
                        setStoreId(target.storeCode);
                        setPhoneNumber(target.storeMobile);
                        if (target.category === 'ビルイン') setManualCategory('builtin');
                        else if (target.category === 'フードコート') setManualCategory('foodcourt');
                        else if (target.category === 'ロードサイド' || target.category === 'フリスタ') setManualCategory('freesta');
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium text-slate-800"
                  >
                    <option value="">-- 対象店舗を選択してください（店番・店名） --</option>
                    {stores.map((s) => (
                      <option key={s.no} value={s.no}>
                        NO.{s.no} | 店番: {s.storeCode} | {s.storeName} ({s.address1}) [TEL: {s.storeMobile}] [{s.managementType}]{s.hasDrawing === '○' ? ' [図面○]' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Form Input Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    店舗名（D列：入力禁止マスタ連動） <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="例: 和食処 桜坂 渋谷道玄坂店"
                    value={storeName}
                    readOnly={Boolean(selectedStoreNo)}
                    onChange={(e) => setStoreName(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-lg focus:outline-hidden ${
                      selectedStoreNo ? 'bg-slate-100 border border-slate-200 text-slate-700 font-bold' : 'bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    店番（B列）
                  </label>
                  <input
                    type="text"
                    placeholder="例: 112003"
                    value={storeId}
                    readOnly={Boolean(selectedStoreNo)}
                    onChange={(e) => setStoreId(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-lg focus:outline-hidden ${
                      selectedStoreNo ? 'bg-slate-100 border border-slate-200 text-slate-700 font-mono' : 'bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    店舗携帯番号（H列：架電先）
                  </label>
                  <input
                    type="tel"
                    placeholder="例: 080-4601-3074"
                    value={phoneNumber}
                    readOnly={Boolean(selectedStoreNo)}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-lg focus:outline-hidden ${
                      selectedStoreNo ? 'bg-slate-100 border border-slate-200 text-slate-700 font-mono font-bold' : 'bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    対応者氏名 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="例: 佐藤 健一"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">役職</label>
                  <select
                    value={contactRole}
                    onChange={(e) => setContactRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="店長">店長</option>
                    <option value="副店長">副店長</option>
                    <option value="設備責任者">設備責任者</option>
                    <option value="マネージャー">マネージャー</option>
                    <option value="スタッフ">スタッフ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    架電オペレーター <span className="text-rose-500">*</span>
                  </label>
                  <div className="space-y-1.5">
                    <select
                      value={operatorSelect}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOperatorSelect(val);
                        try {
                          localStorage.setItem('led_operator_select', val);
                        } catch {}
                      }}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium text-slate-800"
                    >
                      <option value="">-- オペレーターを選択 --</option>
                      <option value="比嘉">比嘉</option>
                      <option value="栗木">栗木</option>
                      <option value="吉原">吉原</option>
                      <option value="その他">その他（自由入力）</option>
                    </select>

                    {operatorSelect === 'その他' && (
                      <input
                        type="text"
                        placeholder="担当者氏名を入力してください"
                        value={customOperator}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomOperator(val);
                          try {
                            localStorage.setItem('led_custom_operator', val);
                          } catch {}
                        }}
                        className="w-full px-3 py-2 text-xs bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden shadow-2xs"
                        autoFocus
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* 架電結果・ステータス選択（出ず、留守電、折返待ち、再連絡日時、担当不在、承諾） */}
              <div className="bg-gradient-to-r from-blue-50/50 via-slate-50 to-indigo-50/50 border border-blue-200/80 rounded-xl p-4 sm:p-5 space-y-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-blue-100">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                      <PhoneCall className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                        <span>架電結果・電話ステータスを選択</span>
                        <span className="text-[11px] font-normal text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          必須選択
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        電話した結果（出ず・留守電・折返・再連絡等）を選択すると、専用スクリプト表示や台帳（M列）への即時保存が行えます
                      </p>
                    </div>
                  </div>

                  {selectedStoreNo && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 self-start sm:self-auto">
                      <span>現在の台帳状態:</span>
                      <span className="font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {stores.find((s) => s.no === selectedStoreNo)?.phoneStatus || '未架電'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status Segmented Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {/* 1. Connected */}
                  <button
                    type="button"
                    onClick={() => setCallOutcome('connected')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      callOutcome === 'connected'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-700 hover:bg-emerald-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${callOutcome === 'connected' ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-slate-300'}`} />
                      <PhoneCall className={`w-4 h-4 ${callOutcome === 'connected' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm">通話接続・承諾</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">本人が出た・調査へ</div>
                    </div>
                  </button>

                  {/* 2. No Answer */}
                  <button
                    type="button"
                    onClick={() => setCallOutcome('no_answer')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      callOutcome === 'no_answer'
                        ? 'bg-rose-50 border-rose-500 text-rose-950 ring-2 ring-rose-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-rose-300 text-slate-700 hover:bg-rose-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${callOutcome === 'no_answer' ? 'bg-rose-500 ring-2 ring-rose-200' : 'bg-slate-300'}`} />
                      <PhoneMissed className={`w-4 h-4 ${callOutcome === 'no_answer' ? 'text-rose-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm">電話するも出ず</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">呼出音のみ・話中</div>
                    </div>
                  </button>

                  {/* 3. Voicemail */}
                  <button
                    type="button"
                    onClick={() => setCallOutcome('voicemail')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      callOutcome === 'voicemail'
                        ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-amber-300 text-slate-700 hover:bg-amber-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${callOutcome === 'voicemail' ? 'bg-amber-500 ring-2 ring-amber-200' : 'bg-slate-300'}`} />
                      <Voicemail className={`w-4 h-4 ${callOutcome === 'voicemail' ? 'text-amber-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm">留守電</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">メッセージ残し</div>
                    </div>
                  </button>

                  {/* 4. Callback Waiting */}
                  <button
                    type="button"
                    onClick={() => setCallOutcome('callback_waiting')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      callOutcome === 'callback_waiting'
                        ? 'bg-purple-50 border-purple-500 text-purple-950 ring-2 ring-purple-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-purple-300 text-slate-700 hover:bg-purple-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${callOutcome === 'callback_waiting' ? 'bg-purple-500 ring-2 ring-purple-200' : 'bg-slate-300'}`} />
                      <PhoneForwarded className={`w-4 h-4 ${callOutcome === 'callback_waiting' ? 'text-purple-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm">折返待ち</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">他スタッフへ伝言</div>
                    </div>
                  </button>

                  {/* 5. Reschedule */}
                  <button
                    type="button"
                    onClick={() => setCallOutcome('reschedule')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      callOutcome === 'reschedule'
                        ? 'bg-cyan-50 border-cyan-500 text-cyan-950 ring-2 ring-cyan-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-cyan-300 text-slate-700 hover:bg-cyan-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${callOutcome === 'reschedule' ? 'bg-cyan-500 ring-2 ring-cyan-200' : 'bg-slate-300'}`} />
                      <CalendarClock className={`w-4 h-4 ${callOutcome === 'reschedule' ? 'text-cyan-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm">再連絡日時指定</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">再架電日時を予約</div>
                    </div>
                  </button>

                  {/* 6. Staff Away */}
                  <button
                    type="button"
                    onClick={() => setCallOutcome('staff_away')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      callOutcome === 'staff_away'
                        ? 'bg-orange-50 border-orange-500 text-orange-950 ring-2 ring-orange-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-orange-300 text-slate-700 hover:bg-orange-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${callOutcome === 'staff_away' ? 'bg-orange-500 ring-2 ring-orange-200' : 'bg-slate-300'}`} />
                      <UserX className={`w-4 h-4 ${callOutcome === 'staff_away' ? 'text-orange-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm">担当不在</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">公休・外出等</div>
                    </div>
                  </button>
                </div>

                {/* Sub-Panel: Outcome Details & Actions */}
                {callOutcome === 'connected' && (
                  <div className="space-y-4 pt-1 animate-in fade-in">
                    {/* Script Bubble 1: First Contact / Opening */}
                    <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded">
                          発話スクリプト①（受付・担当者呼出）
                        </span>
                        <span className="text-xs text-blue-700 font-medium">委託元の明示</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal bg-white/70 p-3 rounded-lg border border-blue-100 shadow-xs">
                        「お忙しいところ恐れ入ります。<br />
                        私、［{operatorName || '自社名・氏名'}］と申します。<br /><br />
                        貴社本部様より委託を受けまして、店舗様のLED照明に関するご連絡をさせていただきました。<br />
                        店長様、もしくは設備のご担当者様はお手すきでしょうか？」
                      </p>
                    </div>

                    {/* Script Bubble 2: Purpose & Time Consent */}
                    <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold bg-emerald-600 text-white px-2 py-0.5 rounded">
                          発話スクリプト②（趣旨説明・所要時間確認）
                        </span>
                        <span className="text-xs text-emerald-700 font-medium">所要時間: 2〜3分でお電話にて完了</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal bg-white/70 p-3 rounded-lg border border-emerald-100 shadow-xs">
                        「LED照明切替に伴う事前調査について、現在の設置状況を確認させていただきたくお電話いたしました。2〜3分ほどでお電話にて完了いたしますが、今少しだけお時間よろしいでしょうか？」
                      </p>
                    </div>

                    {/* Next Button */}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => {
                          if (selectedStoreNo && onUpdateStoreField) {
                            onUpdateStoreField(selectedStoreNo, 'phoneStatus', '通話中');
                            onUpdateStoreField(selectedStoreNo, 'surveyAssignee', operatorName);
                          }
                          setCurrentStep(2);
                        }}
                        className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                      >
                        <span>承諾を得たため、LED化状況の確認へ進む（STEP 2）</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {callOutcome === 'no_answer' && (
                  <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 sm:p-5 space-y-4 animate-in fade-in">
                    <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                      <PhoneMissed className="w-4 h-4 text-rose-600" />
                      <span>電話するも出ず（呼出音のみ・不通）の記録</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          呼出状況の詳細
                        </label>
                        <select
                          value={noAnswerDetail}
                          onChange={(e) => setNoAnswerDetail(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-rose-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-medium text-slate-800"
                        >
                          <option value="20秒以上呼出（応答なし）">20秒以上呼出（応答なし）</option>
                          <option value="話中音（ビジートーン）">話中音（ビジートーン）</option>
                          <option value="コール数回で切断">コール数回で切断</option>
                          <option value="ガイダンスなし不通">ガイダンスなし不通</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          状況メモ（任意）
                        </label>
                        <input
                          type="text"
                          placeholder="例: ピーク時間帯のため出られない様子。後ほど再コール"
                          value={callbackCustomNotes}
                          onChange={(e) => setCallbackCustomNotes(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => handleSaveNonConnectedStatus('no_answer')}
                        className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>「電話するも出ず」として台帳に記録・保存</span>
                      </button>
                    </div>
                  </div>
                )}

                {callOutcome === 'voicemail' && (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 sm:p-5 space-y-4 animate-in fade-in">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                      <Voicemail className="w-4 h-4 text-amber-600" />
                      <span>留守番電話接続・メッセージ吹き込みスクリプト</span>
                    </div>

                    {/* Voicemail Talk Script */}
                    <div className="bg-white/80 border border-amber-200 rounded-lg p-3.5 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-800">
                        <span>留守電吹き込み用トークスクリプト（このまま読み上げてください）</span>
                        <span className="text-amber-600 font-mono">約25秒</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal">
                        「お忙しいところ恐れ入ります。<br />
                        私、本部様より委託を受けておりますLED照明事前調査担当の［<strong className="text-blue-700">{operatorName || '自社名・氏名'}</strong>］と申します。<br />
                        店舗様の蛍光灯からLED照明への切替に伴う設置確認の件でお電話いたしました。<br />
                        また改めてお電話させていただきますので、どうぞよろしくお願いいたします。失礼いたします。」
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer bg-white px-3 py-2 rounded-lg border border-amber-200">
                        <input
                          type="checkbox"
                          checked={voicemailRecorded}
                          onChange={(e) => setVoicemailRecorded(e.target.checked)}
                          className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                        />
                        <span>上記メッセージを留守電に録音完了</span>
                      </label>

                      <input
                        type="text"
                        placeholder="追記メモ（例: 営業時間外のアナウンスあり）"
                        value={voicemailNote}
                        onChange={(e) => setVoicemailNote(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => handleSaveNonConnectedStatus('voicemail')}
                        className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-xs cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>「留守電」として台帳に記録・保存</span>
                      </button>
                    </div>
                  </div>
                )}

                {callOutcome === 'callback_waiting' && (
                  <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 sm:p-5 space-y-4 animate-in fade-in">
                    <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                      <PhoneForwarded className="w-4 h-4 text-purple-600" />
                      <span>折返待ち（スタッフ伝言預け・店舗からの折返し待ち）</span>
                    </div>

                    {/* Staff Callback Script */}
                    <div className="bg-white/80 border border-purple-200 rounded-lg p-3.5 space-y-1.5 shadow-2xs">
                      <div className="text-[11px] font-bold text-purple-800">
                        店舗スタッフ様への伝言スクリプト
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal">
                        「恐れ入ります。本部様より委託を受けておりますLED照明事前調査の件でお電話いたしました。<br />
                        店長様がお戻りになられましたら、本部様よりLED照明調査の件で連絡があった旨をお伝えいただけますでしょうか。<br />
                        私どもからも後ほど改めてご連絡いたします。ご対応ありがとうございました。」
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          電話に出られた方（受付者名・役職）
                        </label>
                        <input
                          type="text"
                          placeholder="例: スタッフ様（ホール担当）、副店長様"
                          value={callbackStaffName}
                          onChange={(e) => setCallbackStaffName(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          戻り目安・折返し希望時間
                        </label>
                        <input
                          type="text"
                          placeholder="例: 店長は16時頃戻り予定、夕方折返し希望"
                          value={callbackExpectedTime}
                          onChange={(e) => setCallbackExpectedTime(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => handleSaveNonConnectedStatus('callback_waiting')}
                        className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-xs cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>「折返待ち」として台帳に記録・保存</span>
                      </button>
                    </div>
                  </div>
                )}

                {callOutcome === 'reschedule' && (
                  <div className="bg-cyan-50/70 border border-cyan-200 rounded-xl p-4 sm:p-5 space-y-4 animate-in fade-in">
                    <div className="flex items-center gap-2 text-cyan-900 font-bold text-sm">
                      <CalendarClock className="w-4 h-4 text-cyan-600" />
                      <span>再連絡日時を指定（再架電の予約日時を台帳に登録）</span>
                    </div>

                    <div className="space-y-3">
                      {/* Recontact Date */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-cyan-600" />
                            <span>再連絡予定日 <span className="text-rose-500">*</span></span>
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setCallbackDatePreset('today')}
                              className="px-2 py-0.5 text-[11px] bg-white border border-cyan-300 hover:bg-cyan-100 rounded text-cyan-800 transition-colors cursor-pointer"
                            >
                              本日中
                            </button>
                            <button
                              type="button"
                              onClick={() => setCallbackDatePreset('tomorrow')}
                              className="px-2 py-0.5 text-[11px] bg-white border border-cyan-300 hover:bg-cyan-100 rounded text-cyan-800 transition-colors cursor-pointer"
                            >
                              明日
                            </button>
                            <button
                              type="button"
                              onClick={() => setCallbackDatePreset('day_after')}
                              className="px-2 py-0.5 text-[11px] bg-white border border-cyan-300 hover:bg-cyan-100 rounded text-cyan-800 transition-colors cursor-pointer"
                            >
                              明後日
                            </button>
                            <button
                              type="button"
                              onClick={() => setCallbackDatePreset('next_mon')}
                              className="px-2 py-0.5 text-[11px] bg-white border border-cyan-300 hover:bg-cyan-100 rounded text-cyan-800 transition-colors cursor-pointer"
                            >
                              来週月曜
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={callbackDate}
                            onChange={(e) => setCallbackDate(e.target.value)}
                            className="px-3 py-2 text-xs bg-white border border-cyan-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500 font-bold text-slate-800"
                          />
                          <span className="text-xs font-bold text-cyan-800 bg-white px-3 py-2 rounded-lg border border-cyan-200">
                            {formatDateJp(callbackDate)}
                          </span>
                        </div>
                      </div>

                      {/* Recontact Time Slot */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          再連絡希望時間帯 <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                          {[
                            '10:00〜12:00（午前・開店前）',
                            '14:00〜16:00（アイドルタイム）',
                            '16:00〜18:00（夕方前）',
                            '20:00以降（夜間・閉店後）',
                          ].map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => {
                                setCallbackTimeSlot(slot);
                                setCallbackExactTime('');
                              }}
                              className={`px-2.5 py-2 text-xs rounded-lg border text-center transition-all cursor-pointer ${
                                callbackTimeSlot === slot && !callbackExactTime
                                  ? 'bg-cyan-600 text-white font-bold border-cyan-600 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-cyan-50'
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">または時刻をピンポイント指定:</span>
                          <input
                            type="time"
                            value={callbackExactTime}
                            onChange={(e) => setCallbackExactTime(e.target.value)}
                            placeholder="例: 15:30"
                            className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500 font-mono font-bold"
                          />
                          {callbackExactTime && (
                            <button
                              type="button"
                              onClick={() => setCallbackExactTime('')}
                              className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              クリア
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Callback Notes */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          再連絡時の注意事項・担当者要望メモ
                        </label>
                        <input
                          type="text"
                          placeholder="例: 店長様宛。ランチタイム営業後は14時半以降なら電話対応可能とのこと"
                          value={callbackCustomNotes}
                          onChange={(e) => setCallbackCustomNotes(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => handleSaveNonConnectedStatus('reschedule')}
                        className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl transition-colors shadow-xs cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>「再連絡日時（再架電待ち）」を台帳に登録・保存</span>
                      </button>
                    </div>
                  </div>
                )}

                {callOutcome === 'staff_away' && (
                  <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-4 sm:p-5 space-y-4 animate-in fade-in">
                    <div className="flex items-center gap-2 text-orange-900 font-bold text-sm">
                      <UserX className="w-4 h-4 text-orange-600" />
                      <span>担当不在（店長・設備責任者の公休・外出等）</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          不在理由
                        </label>
                        <select
                          value={staffAwayReason}
                          onChange={(e) => setStaffAwayReason(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-orange-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium text-slate-800"
                        >
                          <option value="本日公休・シフト不在">本日公休・シフト不在</option>
                          <option value="外出中・他店応援">外出中・他店応援</option>
                          <option value="会議・研修中">会議・研修中</option>
                          <option value="接客ピーク・取次不可">接客ピーク・取次不可</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          出勤予定・特記事項（任意）
                        </label>
                        <input
                          type="text"
                          placeholder="例: 明日の昼シフトで出勤予定とのこと"
                          value={callbackCustomNotes}
                          onChange={(e) => setCallbackCustomNotes(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => handleSaveNonConnectedStatus('staff_away')}
                        className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition-colors shadow-xs cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>「担当不在」として台帳に記録・保存</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: LED Status Confirmation (Core Decision Fork) */}
        {currentStep === 2 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-sm sm:text-base text-slate-900">
                STEP 2: LED化状況のヒアリング（最重要分岐）
              </span>
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold">
                訪問要否を判定
              </span>
            </div>

            <div className="p-5 space-y-5">
              {/* Script Prompt */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded">
                    発話スクリプト（状況確認の質問）
                  </span>
                  <span className="text-xs text-blue-700 font-medium">客席・厨房・バックヤードまで確認</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal">
                  「ありがとうございます。まず、現在の店舗内の照明についてお伺いいたします。客席や厨房、バックヤードなどで、すでにすべての照明がLEDに切り替わっていますでしょうか？ それとも一部にまだ蛍光灯が残っている状態でしょうか？」
                </p>
              </div>

              {/* Customer Response Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  店舗様の回答を選択してください：
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Option A: All LED */}
                  <div
                    onClick={() => setLedStatus('all_led')}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
                      ledStatus === 'all_led'
                        ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                        : 'border-slate-200 hover:border-emerald-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          ledStatus === 'all_led'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        ✓
                      </div>
                      <span className="font-bold text-sm text-slate-900">① 全灯LED化済み</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      「客席も厨房もバックヤードもすべてLEDに交換済みです」
                    </p>
                    <div className="mt-3 text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2 py-1 rounded inline-block">
                      ★ 訪問調査【不要】・案件終了
                    </div>
                  </div>

                  {/* Option B: Partial LED */}
                  <div
                    onClick={() => setLedStatus('partial_led')}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
                      ledStatus === 'partial_led'
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-slate-200 hover:border-blue-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          ledStatus === 'partial_led'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        !
                      </div>
                      <span className="font-bold text-sm text-slate-900">② 一部未LED（蛍光灯あり）</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      「客席はLEDだが厨房や倉庫、手元灯などが蛍光灯のままです」
                    </p>
                    <div className="mt-3 text-xs font-bold text-blue-700 bg-blue-100/70 px-2 py-1 rounded inline-block">
                      ★ 訪問調査【必要】・日程調整へ
                    </div>
                  </div>

                  {/* Option C: Not Started */}
                  <div
                    onClick={() => setLedStatus('not_started')}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
                      ledStatus === 'not_started'
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-slate-200 hover:border-blue-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          ledStatus === 'not_started'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        !
                      </div>
                      <span className="font-bold text-sm text-slate-900">③ 未着手（全て蛍光灯）</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      「まだどこもLEDには替えていません。全部昔の蛍光灯です」
                    </p>
                    <div className="mt-3 text-xs font-bold text-blue-700 bg-blue-100/70 px-2 py-1 rounded inline-block">
                      ★ 訪問調査【必要】・日程調整へ
                    </div>
                  </div>
                </div>
              </div>

              {/* BRANCH 1: ALL LED (NO SURVEY NEEDED) */}
              {ledStatus === 'all_led' && (
                <div className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/80 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>【分岐結果】全灯LED済みのため、訪問調査は不要（案件完了）です</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-emerald-200 text-xs sm:text-sm text-slate-800 leading-relaxed">
                    <div className="font-bold text-emerald-900 mb-1">お礼・終了トーク：</div>
                    「すべてLEDに切り替え済みとのこと、承知いたしました。店舗様側で迅速にご対応いただき誠にありがとうございます！<br />
                    全灯LED化が完了しておりますので、今回の現地での訪問調査は省略させていただきます。<br />
                    本日の確認結果は本部へ報告し、手続きを完了といたします。お忙しい中ご協力いただき、心より感謝申し上げます。失礼いたします。」
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setCurrentStep(6)}
                      className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-xs"
                    >
                      お礼を伝えて案件終了・復唱画面へ
                    </button>
                  </div>
                </div>
              )}

              {/* BRANCH 2: PARTIAL OR NOT STARTED (SURVEY NEEDED) */}
              {(ledStatus === 'partial_led' || ledStatus === 'not_started') && (
                <div className="p-4 rounded-xl border-2 border-blue-400 bg-blue-50/60 space-y-3">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 text-blue-600" />
                    <span>【分岐結果】未LED箇所があるため、現地での事前調査が必要です</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      蛍光灯が残っている箇所・灯具（店舗様より聞き取れた場合）：
                    </label>
                    <input
                      type="text"
                      placeholder="例: 厨房内の直管4本、バックヤード倉庫の手元灯、駐車場看板など"
                      value={partialAreas}
                      onChange={(e) => setPartialAreas(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-blue-200 text-xs sm:text-sm text-slate-800 leading-relaxed shadow-xs">
                    <span className="font-bold text-blue-900 block mb-1">
                      【一部未LED・未着手の場合のトーク（★訪問調査手配へ進む）】：
                    </span>
                    「状況を教えていただきありがとうございます。まだ一部に蛍光灯が残っていらっしゃる（または未着手の）状態ですね。承知いたしました。<br />
                    正確な灯具の規格や設置本数を確認させていただき、最適なLED器具の選定するため、現地へ事前調査にお伺いさせていただきます。」
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
                    >
                      <span>設置場所区分の判定（STEP 3）へ進む</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Location Category Determination */}
        {currentStep === 3 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-sm sm:text-base text-slate-900">
                STEP 3: 設置場所区分の判定（既に区分が特定済みの場合はスキップ可能）
              </span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
                ビルトイン / フードコート / ロードサイド
              </span>
            </div>

            <div className="p-5 space-y-5">
              {/* If category already determined from Master or selection */}
              {manualCategory && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-emerald-600 text-white px-2 py-0.5 rounded">
                      マスタ特定済み
                    </span>
                    <span className="text-xs font-medium text-emerald-900">
                      設置場所区分は既に【{computedCategory === 'builtin' ? 'ビルトイン' : computedCategory === 'foodcourt' ? 'フードコート' : 'ロードサイド'}】として特定されています。
                    </span>
                  </div>
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs shrink-0"
                  >
                    <span>このままSTEP 4（日程調整）へスキップ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Natural Script Guidance */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded">
                    発話スクリプト（建物形態の確認導入）
                  </span>
                  <span className="text-xs text-blue-700 font-medium">設置場所区分（K列）判定用</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal bg-white/70 p-3 rounded-lg border border-blue-100 shadow-xs">
                  「事前調査の手配にあたり、店舗様の建物の形態について2点ほどお伺いいたします。」
                </p>
              </div>

              {/* 3 Natural Probing Questions */}
              <div className="space-y-4">
                {/* Question 1: Building Tenant */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        質問①：商業ビルやショッピングモール内に入居されているテナントですか？
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        （トーク例：「店舗様はビルや商業施設のフロア内に入居されていますでしょうか？」）
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setIsTenantInBuilding(true);
                          setHasDedicatedParkingLights(false);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          isTenantInBuilding === true
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        はい（ビル・施設内）
                      </button>
                      <button
                        onClick={() => setIsTenantInBuilding(false)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          isTenantInBuilding === false
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        いいえ（独立建物）
                      </button>
                    </div>
                  </div>
                </div>

                {/* Question 2: Counter only / Food Court & Office/Breakroom */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-800">
                        質問②：客席形態（フードコート判定）および 別棟・別室（事務所・休憩室等）の確認
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 bg-white p-2.5 rounded-md border border-slate-200 leading-relaxed font-normal">
                        「客席は店舗専用のフロア席がございますでしょうか？ それとも、モールの共有フードコートのように、カウンターや厨房のみが店舗専有スペースとなっている形式でしょうか？ また別に事務所（休憩室やロッカーなど）はございませんでしょうか？」
                      </p>
                      <p className="text-[11px] text-slate-500">
                        ※カウンター/厨房のみの場合 → 区分は【フードコート】と判定。別室の事務所や休憩室の有無も調査対象・灯具把握に役立ちます。
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pt-1">
                      <button
                        onClick={() => setIsCounterOnly(true)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          isCounterOnly === true
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        カウンター/厨房のみ
                      </button>
                      <button
                        onClick={() => setIsCounterOnly(false)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          isCounterOnly === false
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        専用客席フロアあり
                      </button>
                    </div>
                  </div>
                </div>

                {/* Question 3: Parking lights / Roadside */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        質問③：店舗専用の駐車場や、屋外の駐車場用照明・ポール灯などは敷地内にございますか？
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        （専用駐車場灯あり・独立店舗 → 区分: ロードサイド）
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setHasDedicatedParkingLights(true)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          hasDedicatedParkingLights === true
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        あり（駐車場灯あり）
                      </button>
                      <button
                        onClick={() => setHasDedicatedParkingLights(false)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          hasDedicatedParkingLights === false
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        なし
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Automatic Determination Result Card */}
              <div className="p-4 rounded-xl border-2 border-slate-300 bg-white space-y-3">
                <div className="text-xs font-semibold text-slate-500">自動判定された区分：</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setManualCategory('builtin')}
                    className={`cursor-pointer p-3 rounded-lg border-2 text-center transition-all ${
                      computedCategory === 'builtin'
                        ? 'border-blue-600 bg-blue-50 font-bold text-blue-900 shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:border-blue-300'
                    }`}
                  >
                    <Building className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                    <div className="text-xs font-bold">区分：ビルトイン</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">ビル・商業施設内テナント</div>
                  </div>

                  <div
                    onClick={() => setManualCategory('foodcourt')}
                    className={`cursor-pointer p-3 rounded-lg border-2 text-center transition-all ${
                      computedCategory === 'foodcourt'
                        ? 'border-amber-600 bg-amber-50 font-bold text-amber-900 shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:border-amber-300'
                    }`}
                  >
                    <Store className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                    <div className="text-xs font-bold">区分：フードコート</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">カウンター/厨房のみ</div>
                  </div>

                  <div
                    onClick={() => setManualCategory('freesta')}
                    className={`cursor-pointer p-3 rounded-lg border-2 text-center transition-all ${
                      computedCategory === 'freesta'
                        ? 'border-emerald-600 bg-emerald-50 font-bold text-emerald-900 shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:border-emerald-300'
                    }`}
                  >
                    <Car className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                    <div className="text-xs font-bold">区分：ロードサイド</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">独立路面店・駐車場灯有</div>
                  </div>
                </div>

                {/* Confirmation Script */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-700">受答え・共有トーク</span>
                    <span className="text-[11px] text-blue-600 font-semibold">
                      選択中：{computedCategory === 'builtin' ? 'ビルトイン' : computedCategory === 'foodcourt' ? 'フードコート' : 'ロードサイド'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal bg-white p-2.5 rounded border border-slate-200 shadow-2xs">
                    「ご回答ありがとうございます。店舗様は<strong className="text-blue-700">［{computedCategory === 'builtin' ? 'ビルトイン' : computedCategory === 'foodcourt' ? 'フードコート' : 'ロードサイド'}］</strong>形式の設備構成ですね。調査員に共有させていただきます。」
                  </p>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  前へ戻る
                </button>
                <button
                  onClick={() => setCurrentStep(4)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
                >
                  <span>訪問希望日程のヒアリング（STEP 4）へ進む</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Scheduling & Timing */}
        {currentStep === 4 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-sm sm:text-base text-slate-900">
                STEP 4: 訪問予定期間（何日～何日までに伺うか）及び希望時間帯の合意
              </span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
                所要時間: 30〜45分程度
              </span>
            </div>

            <div className="p-5 space-y-5">
              {/* Script Prompt */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded">
                    発話スクリプト（日程伺い）
                  </span>
                  <span className="text-xs text-blue-700 font-medium">所要時間: 30分〜45分程度</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal bg-white/70 p-3 rounded-lg border border-blue-100 shadow-xs">
                  「それでは、現地の事前調査にお伺いする日程を調整させていただきたく存じます。調査はおよそ30分から45分程度で完了いたします。<br />
                  <strong className="text-blue-700 font-bold">
                    {visitPeriodStart && visitPeriodEnd
                      ? `${formatDateJp(visitPeriodStart)}～${formatDateJp(visitPeriodEnd)}の間`
                      : '〇月〇日～〇月〇日の間'}
                  </strong>
                  で訪問させていただきますので、よろしくお願いいたします。」
                </p>
                {/* Free of charge notice banner / script */}
                <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
                  <span className="text-xs font-bold bg-amber-600 text-white px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                    費用案内・安心トーク
                  </span>
                  <p className="text-xs sm:text-sm text-amber-950 font-medium leading-relaxed">
                    「ご安心ください。今回の事前調査【完全無料】となっております。どうぞご安心ください。」
                  </p>
                </div>
              </div>

              {/* Scheduling Inputs: Visit Period (Left) & Preferred Time Slots (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Card: Visit Period Propose & Fix */}
                <div className="p-4 rounded-xl bg-blue-50/40 border-2 border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-blue-950">訪問予定期間（何日～何日までに伺うか）</span>
                    </div>
                    <span className="text-[11px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded">
                      こちらから提示
                    </span>
                  </div>

                  {/* Preset quick buttons */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      期間クイック選択（通話中のワンクリック入力）:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={setNextWeekPreset}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-blue-300 text-blue-700 hover:bg-blue-100/60 rounded-md transition-colors shadow-2xs"
                      >
                        来週平日（月〜金）
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresetRangeDays(7)}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-blue-300 text-blue-700 hover:bg-blue-100/60 rounded-md transition-colors shadow-2xs"
                      >
                        今後7日間
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresetRangeDays(14)}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-blue-300 text-blue-700 hover:bg-blue-100/60 rounded-md transition-colors shadow-2xs"
                      >
                        今後2週間
                      </button>
                      {(visitPeriodStart || visitPeriodEnd) && (
                        <button
                          type="button"
                          onClick={() => {
                            handleSetVisitStart('');
                            handleSetVisitEnd('');
                          }}
                          className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-colors"
                        >
                          クリア
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Date Pickers for Start and End Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        開始日（何日から）
                      </label>
                      <input
                        type="date"
                        value={visitPeriodStart}
                        onChange={(e) => handleSetVisitStart(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        終了日（何日までに）
                      </label>
                      <input
                        type="date"
                        value={visitPeriodEnd}
                        onChange={(e) => handleSetVisitEnd(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
                      />
                    </div>
                  </div>

                  {/* Agreed Period Banner */}
                  <div className="p-2.5 rounded-lg bg-white border border-blue-200 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">合意・確定予定期間:</span>
                    <span className="font-bold text-blue-900">
                      {visitPeriodStart && visitPeriodEnd
                        ? `${formatDateJp(visitPeriodStart)} 〜 ${formatDateJp(visitPeriodEnd)} までに伺う`
                        : visitPeriodStart
                        ? `${formatDateJp(visitPeriodStart)} 以降`
                        : '（期間を選択・入力してください）'}
                    </span>
                  </div>
                </div>

                {/* Right Card: Preferred Time Slots (希望時間帯は現在のものを残す) */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-700" />
                      <span className="text-xs font-bold text-slate-900">店舗様のご希望時間帯</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      ★所要時間 30〜45分
                    </span>
                  </div>

                  {/* Primary Time Slot */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      第1希望 時間帯
                    </label>
                    <select
                      value={timeSlot1}
                      onChange={(e) => {
                        const val = e.target.value as TimeSlot;
                        setTimeSlot1(val);
                        if (val === 'after_hours') setWorkTiming('after_hours');
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
                    >
                      <option value="idle_time">アイドルタイム（14:00〜16:00）★推奨</option>
                      <option value="morning">午前中・開店前（10:00〜12:00）</option>
                      <option value="afternoon">午後（13:00〜17:00）</option>
                      <option value="after_hours">営業終了後・夜間（閉店後作業）★戸締り確認発動</option>
                      <option value="any">終日・指定なし</option>
                    </select>
                  </div>

                  {/* Secondary Time Slot (Backup) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      第2希望 時間帯（予備時間帯）
                    </label>
                    <select
                      value={timeSlot2}
                      onChange={(e) => {
                        const val = e.target.value as TimeSlot;
                        setTimeSlot2(val);
                        if (val === 'after_hours') setWorkTiming('after_hours');
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
                    >
                      <option value="idle_time">アイドルタイム（14:00〜16:00）★推奨</option>
                      <option value="morning">午前中・開店前（10:00〜12:00）</option>
                      <option value="afternoon">午後（13:00〜17:00）</option>
                      <option value="after_hours">営業終了後・夜間（閉店後作業）★戸締り確認発動</option>
                      <option value="any">終日・指定なし</option>
                    </select>
                  </div>

                  {/* Convenient day notes */}
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">
                      都合の良い曜日・時間帯の備考（任意）
                    </label>
                    <input
                      type="text"
                      value={dayPreferenceNotes}
                      onChange={(e) => setDayPreferenceNotes(e.target.value)}
                      placeholder="例: 水曜定休のため火・木が確実、店長不在日は避ける 等"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Work Timing Radio */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  希望作業帯の種別（店舗様からの指定）：
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => {
                      setWorkTiming('idle_time');
                      if (timeSlot1 === 'after_hours') setTimeSlot1('idle_time');
                    }}
                    className={`cursor-pointer p-3 rounded-lg border-2 transition-all ${
                      workTiming !== 'after_hours'
                        ? 'border-blue-500 bg-blue-50 font-semibold text-blue-900'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">営業時間内 / アイドルタイム</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      通常の立ち会い作業（戸締り確認フローはスキップ）
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setWorkTiming('after_hours');
                      setTimeSlot1('after_hours');
                    }}
                    className={`cursor-pointer p-3 rounded-lg border-2 transition-all ${
                      workTiming === 'after_hours'
                        ? 'border-amber-500 bg-amber-50 font-bold text-amber-950 shadow-xs'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>「営業終了後・閉店後の作業」を指定</span>
                    </div>
                    <div className="text-[11px] text-amber-800 mt-0.5 font-medium">
                      ★【条件発動】戸締り・鍵預かりフローへ進みます
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  前へ戻る
                </button>
                <button
                  onClick={() => {
                    if (isAfterHours) {
                      setCurrentStep(5); // Go to lock confirmation
                    } else {
                      setCurrentStep(6); // Skip lock confirmation, go to review
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
                >
                  <span>
                    {isAfterHours
                      ? '【条件発動】戸締り・鍵確認（STEP 5）へ進む'
                      : '確認・復唱クロージング（STEP 6）へ進む'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Lock & Key Procedure (Conditional on after_hours) */}
        {currentStep === 5 && (
          <div className="bg-white border-2 border-amber-400 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-amber-100/70 px-5 py-3.5 border-b border-amber-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-800" />
                <span className="font-bold text-sm sm:text-base text-amber-950">
                  STEP 5: 【条件発動】戸締り方法・鍵預かりの確認
                </span>
              </div>
              <span className="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold">
                営業終了後作業のみ発動
              </span>
            </div>

            <div className="p-5 space-y-5">
              {/* Trigger Explanation */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 leading-relaxed">
                <strong>【確認趣旨】：</strong>
                店舗様より「閉店後・夜間作業」をご希望いただきましたので、作業終了時の戸締りルールおよび鍵の取り扱いについて合意形成を行います。
              </div>

              {/* Script Prompt */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-2">
                <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded">
                  発話スクリプト（戸締り・鍵の確認）
                </span>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal">
                  「営業終了後の作業ですね。承知いたしました。閉店後であればお客様にご迷惑をおかけせず安全に調査可能です。<br />
                  その際、現場の『戸締りおよび鍵の管理』について確認させていただきたいのですが、弊社の調査員へ合鍵をお預けいただくことは可能でしょうか？ それともスタッフ様が最後まで現地にお立ち会いいただく形式でしょうか？」
                </p>
              </div>

              {/* Key Custody Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  鍵預かりの可否：
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setKeyCustody('possible')}
                    className={`cursor-pointer p-3.5 rounded-xl border-2 transition-all ${
                      keyCustody === 'possible'
                        ? 'border-emerald-500 bg-emerald-50 shadow-xs'
                        : 'border-slate-200 hover:border-emerald-300 bg-white'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">① 鍵預かり可能（預託）</div>
                    <div className="text-[11px] text-slate-600 mt-1">
                      キーボックス等で受渡、調査完了後に施錠返却
                    </div>
                  </div>

                  <div
                    onClick={() => setKeyCustody('not_possible')}
                    className={`cursor-pointer p-3.5 rounded-xl border-2 transition-all ${
                      keyCustody === 'not_possible'
                        ? 'border-blue-500 bg-blue-50 shadow-xs'
                        : 'border-slate-200 hover:border-blue-300 bg-white'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">② 鍵預かり不可（立会い必須）</div>
                    <div className="text-[11px] text-slate-600 mt-1">
                      店舗スタッフ様が作業完了まで同席し施錠
                    </div>
                  </div>

                  <div
                    onClick={() => setKeyCustody('requires_staff')}
                    className={`cursor-pointer p-3.5 rounded-xl border-2 transition-all ${
                      keyCustody === 'requires_staff'
                        ? 'border-purple-500 bg-purple-50 shadow-xs'
                        : 'border-slate-200 hover:border-purple-300 bg-white'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">③ 警備会社・ビル警備対応</div>
                    <div className="text-[11px] text-slate-600 mt-1">
                      施設防災センター等での入退館鍵受渡
                    </div>
                  </div>
                </div>
              </div>

              {/* Procedure Details Script & Input */}
              <div className="space-y-3">
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs text-slate-800">
                  <div className="font-bold text-blue-900 mb-1">施錠・返却手順の質問スクリプト：</div>
                  「調査完了後の施錠方法と、鍵の返却方法（例：店舗専用キーボックスへ投函、翌朝出勤スタッフ様へ手渡し、警備システム連動など）の指定ルールを教えていただけますでしょうか？」
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    施錠・返却の具体的手順メモ <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="例: 店舗裏口のダイヤル式キーボックスに格納。作業終了後に施錠して返却・ダイヤルリセット。セコムセットは調査員にて実施。"
                    value={lockProcedure}
                    onChange={(e) => setLockProcedure(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    夜間緊急連絡先（作業中の万一のトラブル時）：
                  </label>
                  <input
                    type="text"
                    placeholder="例: 店長携帯（090-XXXX-XXXX）または ビル防災センター（03-XXXX-XXXX）"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setCurrentStep(4)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  前へ戻る
                </button>
                <button
                  onClick={() => setCurrentStep(6)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
                >
                  <span>復唱・クロージング（STEP 6）へ進む</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Review, Closing Script, Summary & Save */}
        {currentStep === 6 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-sm sm:text-base text-slate-900">
                STEP 6: ヒアリング結果の復唱 & クロージング
              </span>
              <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                結果確認・保存
              </span>
            </div>

            <div className="p-5 space-y-6">
              {/* Verdict Banner */}
              {surveyRequirement === 'not_required' ? (
                <div className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50 flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-emerald-950">
                      判定結果：【訪問調査 不要（案件終了）】
                    </div>
                    <div className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      全灯LED化済みのため、これ以上の現地調査や工事手配は不要です。本部データベースへの完了報告のみ行います。
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border-2 border-blue-500 bg-blue-50 flex items-start gap-3">
                  <Calendar className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-blue-950">
                      判定結果：【訪問調査 必要（技術員日程手配へ）】
                    </div>
                    <div className="text-xs text-blue-800 mt-1 leading-relaxed">
                      区分「{computedCategory === 'builtin' ? 'ビルトイン' : computedCategory === 'foodcourt' ? 'フードコート' : 'ロードサイド'}」にて、訪問予定期間［{visitPeriodStart && visitPeriodEnd ? `${visitPeriodStart}〜${visitPeriodEnd}` : preferredDate1 || '未定'} ({timeSlotLabel(timeSlot1)})］で調査員をアサインします。
                      {isAfterHours && '（※夜間作業・戸締り確認済み）'}
                    </div>
                  </div>
                </div>
              )}

              {/* Closing Script Bubble */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-2">
                <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded">
                  クロージング発話スクリプト
                </span>
                {surveyRequirement === 'not_required' ? (
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal">
                    「全灯LEDに切り替え済みとのこと、承知いたしました。店舗様側で迅速にご対応いただき誠にありがとうございます！<br />
                    全灯LED化が完了しておりますので、今回の現地での訪問調査は省略させていただきます。<br />
                    本日の確認結果は本部へ報告し、手続きを完了といたします。お忙しい中ご協力いただき、心より感謝申し上げます。失礼いたします。」
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal">
                    「それでは本日お伺いした内容を復唱いたします。<br />
                    ・店舗名：［{storeName || '〇〇店舗'}］様<br />
                    ・LED化状況：一部未LED箇所あり（{partialAreas || '倉庫・厨房等'}）<br />
                    ・設置場所区分：［{computedCategory === 'builtin' ? 'ビルトイン' : computedCategory === 'foodcourt' ? 'フードコート' : 'ロードサイド'}］<br />
                    ・訪問予定期間：［{visitPeriodStart && visitPeriodEnd ? `${formatDateJp(visitPeriodStart)}～${formatDateJp(visitPeriodEnd)}` : (preferredDate1 || '〇月〇日～〇月〇日')}］（希望時間帯：{timeSlotLabel(timeSlot1)}）<br />
                    ・立会者様：{contactPerson || '店長'} 様<br />
                    {isAfterHours && `・戸締り手順：${lockProcedure || 'キーボックス返却'}\n`}
                    日程確定のご案内を、2営業日以内にご連絡差し上げます。本日はお忙しい中、ご丁寧にご対応いただき誠にありがとうございました。失礼いたします。」
                  </p>
                )}
              </div>

              {/* Formatted CRM Export Area */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">社内CRM・日報用 記録テキスト</span>
                  <button
                    onClick={handleCopySummary}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded bg-white border border-slate-200 shadow-xs"
                  >
                    {copiedSummary ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">コピー完了</span>
                      </>
                    ) : (
                      <>
                        <ClipboardCopy className="w-3.5 h-3.5" />
                        <span>クリップボードにコピー</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-xs font-mono bg-white p-3 rounded-lg border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {generateCrmSummary()}
                </pre>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => setCurrentStep(surveyRequirement === 'not_required' ? 2 : isAfterHours ? 5 : 4)}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  前へ戻る
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleSave}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saveSuccess ? '保存完了！' : 'チェックシート履歴へ保存'}</span>
                  </button>

                  <button
                    onClick={onGoToChecksheet}
                    className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                  >
                    一覧を確認
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Outcome Saved Modal / Notification Overlay */}
      {outcomeSavedModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3.5">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1.5 mb-5">
              <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full inline-block border border-emerald-200">
                Cloud Firestore リアルタイム同期完了
              </div>
              <h3 className="text-base font-bold text-slate-900">
                電話ステータスを台帳に保存しました
              </h3>
              <p className="text-xs text-slate-600">
                対象：<strong className="text-slate-900">{outcomeSavedModal.storeName}</strong>
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs mb-5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">電話ステータス（M列）：</span>
                <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {outcomeSavedModal.statusLabel}
                </span>
              </div>
              {outcomeSavedModal.scheduledTime && (
                <div className="flex justify-between items-center text-cyan-800">
                  <span className="font-medium">📅 再連絡予定日時：</span>
                  <span className="font-bold font-mono bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                    {outcomeSavedModal.scheduledTime}
                  </span>
                </div>
              )}
              {outcomeSavedModal.notes && (
                <div className="text-slate-600 pt-1.5 border-t border-slate-200 text-[11px]">
                  <span className="text-slate-400">備考欄(J列)反映:</span> {outcomeSavedModal.notes}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {outcomeSavedModal.nextStore && (
                <button
                  type="button"
                  onClick={() => {
                    if (outcomeSavedModal.nextStore) {
                      handleSelectStore(outcomeSavedModal.nextStore);
                    }
                  }}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>続けて次の未架電店舗へ進む (NO.{outcomeSavedModal.nextStore.no} {outcomeSavedModal.nextStore.storeName})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOutcomeSavedModal(null);
                    if (onBackToLedger) onBackToLedger();
                  }}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  台帳一覧に戻る
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOutcomeSavedModal(null);
                  }}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  画面に留まる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
