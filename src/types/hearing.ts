/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LedStatus = 'all_led' | 'partial_led' | 'not_started';

export type LocationCategory = 'builtin' | 'foodcourt' | 'freesta' | 'unspecified';

export type TimeSlot = 'any' | 'morning' | 'afternoon' | 'idle_time' | 'after_hours' | 'custom';

export type KeyCustodyStatus = 'possible' | 'not_possible' | 'requires_staff' | 'not_applicable';

export type SurveyRequirement = 'not_required' | 'required' | 'pending';

export interface HearingRecord {
  id: string;
  timestamp: string;
  operatorName: string;
  storeName: string;
  storeId?: string;
  contactPerson: string;
  contactRole?: string;
  phoneNumber: string;

  // 1. LED化状況
  ledStatus: LedStatus;
  partialAreas?: string; // 未LED箇所 (例: バックヤード、厨房、看板等)

  // 2. 設置場所区分
  locationCategory: LocationCategory;
  locationDetails?: {
    isTenantInBuilding: boolean;
    isCounterOnly: boolean;
    hasDedicatedParkingLights: boolean;
  };

  // 判定結果
  surveyRequirement: SurveyRequirement; // 全灯済みなら不要、一部未・未着手なら要

  // 3. 訪問希望日程 (一部未LEDの場合)
  preferredDate1?: string;
  preferredTimeSlot1?: TimeSlot;
  preferredDate2?: string;
  preferredTimeSlot2?: TimeSlot;
  workTiming?: 'during_hours' | 'idle_time' | 'after_hours';

  // 4. 戸締り・鍵預かり確認 (営業終了後の場合のみ発動)
  afterHoursTriggered: boolean;
  keyCustody: KeyCustodyStatus;
  lockProcedure?: string; // 施錠・返却の流れ (例: キーボックス、翌朝手渡し、警備会社)
  emergencyContact?: string;

  // メモ・特記事項
  notes?: string;
  status: 'completed' | 'draft' | 'follow_up_needed';
}

export interface ScriptDialogue {
  id: string;
  speaker: 'operator' | 'customer' | 'system';
  text: string;
  kanaPronunciation?: string;
  tips?: string[];
  keyPoints?: string[];
}

export interface ScriptSection {
  id: string;
  title: string;
  shortDesc: string;
  badgeText?: string;
  category: 'opening' | 'led_status' | 'location' | 'scheduling' | 'lock_procedure' | 'closing' | 'faq';
  dialogues: ScriptDialogue[];
  conditionNotice?: string;
}
