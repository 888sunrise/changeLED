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
} from 'lucide-react';
import { HearingRecord, LedStatus, SimulatorLocationCategory, TimeSlot, KeyCustodyStatus, StoreRecord } from '../types/hearing';

interface LiveCallSimulatorProps {
  onSaveRecord: (record: HearingRecord) => void;
  onGoToChecksheet: () => void;
  stores?: StoreRecord[];
  initialStore?: StoreRecord | null;
  onUpdateStoreField?: (storeNo: number, field: keyof StoreRecord, value: any) => void;
}

export const LiveCallSimulator: React.FC<LiveCallSimulatorProps> = ({
  onSaveRecord,
  onGoToChecksheet,
  stores = [],
  initialStore = null,
  onUpdateStoreField,
}) => {
  // Selected Store from master
  const [selectedStoreNo, setSelectedStoreNo] = useState<number | null>(initialStore ? initialStore.no : null);

  // Form State
  const [operatorName, setOperatorName] = useState('山田 太郎');
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
      else if (initialStore.category === 'フリスタ') setManualCategory('freesta');
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

  // Step 4: Scheduling
  const [preferredDate1, setPreferredDate1] = useState('');
  const [timeSlot1, setTimeSlot1] = useState<TimeSlot>('idle_time');
  const [preferredDate2, setPreferredDate2] = useState('');
  const [timeSlot2, setTimeSlot2] = useState<TimeSlot>('idle_time');
  const [workTiming, setWorkTiming] = useState<'idle_time' | 'during_hours' | 'after_hours'>('idle_time');

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
        ? 'フリスタ（独立店舗・駐車場灯有）'
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
      summary += `■ 訪問希望日程:\n`;
      summary += `  ・第1希望: ${preferredDate1 || '未定'} (${timeSlotLabel(timeSlot1)})\n`;
      if (preferredDate2) {
        summary += `  ・第2希望: ${preferredDate2} (${timeSlotLabel(timeSlot2)})\n`;
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
      preferredDate1,
      preferredTimeSlot1: timeSlot1,
      preferredDate2,
      preferredTimeSlot2: timeSlot2,
      workTiming,
      afterHoursTriggered: isAfterHours,
      keyCustody: isAfterHours ? keyCustody : 'not_applicable',
      lockProcedure,
      emergencyContact,
      notes,
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
          ? 'フリスタ'
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
        if (preferredDate1) {
          onUpdateStoreField(selectedStoreNo, 'surveyDate', preferredDate1);
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
    setPreferredDate1('');
    setPreferredDate2('');
    setWorkTiming('idle_time');
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
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
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
                        else if (target.category === 'フリスタ') setManualCategory('freesta');
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium text-slate-800"
                  >
                    <option value="">-- 対象店舗を選択してください（店番・店名） --</option>
                    {stores.map((s) => (
                      <option key={s.no} value={s.no}>
                        NO.{s.no} | 店番: {s.storeCode} | {s.storeName} ({s.address1}) [TEL: {s.storeMobile}] [{s.managementType}]
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
                    架電オペレーター
                  </label>
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Script Bubble 1: First Contact / Opening */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-2">
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
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-2">
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
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
                >
                  <span>承諾を得たため、LED化状況の確認へ進む</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
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
                  「ありがとうございます。まず、現在の店舗内の照明についてお伺いいたします。客席や厨房、バックヤード、看板などを含めまして、すでにすべての照明がLEDに切り替わっていますでしょうか？ それとも一部にまだ従来の蛍光灯が残っている状態でしょうか？」
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

                  <div className="bg-white p-3 rounded-lg border border-blue-200 text-xs text-slate-800 leading-relaxed">
                    <span className="font-bold text-blue-900">調査案内トーク：</span><br />
                    「状況を教えていただきありがとうございます。正確な灯具の規格や設置本数を確認させていただき、最適な器具選定とお見積もりをご案内するため、弊社の専門技術員が現地へ事前調査にお伺いさせていただきます。」
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
                STEP 3: 設置場所区分の判定（自然なヒアリング質問）
              </span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
                ビルトイン / フードコート / フリスタ
              </span>
            </div>

            <div className="p-5 space-y-5">
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

                {/* Question 2: Counter only / Food Court */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        質問②：客席は店舗専用の席ですか？それともカウンター・厨房のみのフードコート形式ですか？
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        （カウンター/厨房のみの場合 → 区分: フードコート）
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
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
                        （専用駐車場灯あり・独立店舗 → 区分: フリスタ）
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
              <div className="p-4 rounded-xl border-2 border-slate-300 bg-white">
                <div className="text-xs font-semibold text-slate-500 mb-2">自動判定された区分：</div>
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
                    <div className="text-xs font-bold">区分：フリスタ</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">独立路面店・駐車場灯有</div>
                  </div>
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
                STEP 4: 訪問希望日程・時間帯のヒアリング
              </span>
              <span className="text-xs text-slate-500">所要時間: 30〜45分程度</span>
            </div>

            <div className="p-5 space-y-5">
              {/* Script Prompt */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-2">
                <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded">
                  発話スクリプト（日程伺い）
                </span>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal">
                  「それでは、現地の事前調査にお伺いする日程を調整させていただきたく存じます。調査はおよそ30分から45分程度で完了いたします。<br />
                  来週以降で、店長様や設備ご担当者様が立ち会っていただけるご都合の良い日時はございますでしょうか？」
                </p>
              </div>

              {/* Scheduling Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-blue-900">第1希望 日時</div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">希望日</label>
                    <input
                      type="date"
                      value={preferredDate1}
                      onChange={(e) => setPreferredDate1(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">希望時間帯</label>
                    <select
                      value={timeSlot1}
                      onChange={(e) => {
                        const val = e.target.value as TimeSlot;
                        setTimeSlot1(val);
                        if (val === 'after_hours') setWorkTiming('after_hours');
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="idle_time">アイドルタイム（14:00〜16:00）★推奨</option>
                      <option value="morning">午前中・開店前（10:00〜12:00）</option>
                      <option value="afternoon">午後（13:00〜17:00）</option>
                      <option value="after_hours">営業終了後・夜間（閉店後作業）★戸締り確認発動</option>
                      <option value="any">終日・指定なし</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-blue-900">第2希望 日時（予備日）</div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">希望日</label>
                    <input
                      type="date"
                      value={preferredDate2}
                      onChange={(e) => setPreferredDate2(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">希望時間帯</label>
                    <select
                      value={timeSlot2}
                      onChange={(e) => {
                        const val = e.target.value as TimeSlot;
                        setTimeSlot2(val);
                        if (val === 'after_hours') setWorkTiming('after_hours');
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="idle_time">アイドルタイム（14:00〜16:00）★推奨</option>
                      <option value="morning">午前中・開店前（10:00〜12:00）</option>
                      <option value="afternoon">午後（13:00〜17:00）</option>
                      <option value="after_hours">営業終了後・夜間（閉店後作業）★戸締り確認発動</option>
                      <option value="any">終日・指定なし</option>
                    </select>
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
                      区分「{computedCategory === 'builtin' ? 'ビルトイン' : computedCategory === 'foodcourt' ? 'フードコート' : 'フリスタ'}」にて、第1希望［{preferredDate1 || '未定'} ({timeSlotLabel(timeSlot1)})］で調査員をアサインします。
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
                    ・設置場所区分：［{computedCategory === 'builtin' ? 'ビルトイン' : computedCategory === 'foodcourt' ? 'フードコート' : 'フリスタ'}］<br />
                    ・訪問希望日程：第1希望［{preferredDate1 || '〇月〇日'} {timeSlotLabel(timeSlot1)}］
                    {preferredDate2 ? `、第2希望［${preferredDate2} ${timeSlotLabel(timeSlot2)}］` : ''}<br />
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
    </div>
  );
};
