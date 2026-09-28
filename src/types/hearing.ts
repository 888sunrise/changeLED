/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// A〜T列定義に合わせたStoreRecordインターフェース
// A〜I列: 入力禁止（マスタ情報）
// J〜T列: 入力および選択方式（ヒアリング・業務進捗入力）

export type LocationCategory = 'ビルイン' | 'フードコート' | 'ロードサイド' | 'フリスタ' | '未設定' | string;

export type PhoneStatus = '未架電' | '通話中' | '不在/再架電' | '完了' | '担当不在' | '着信拒否' | string;

export type SurveyDocStatus = '未回収' | '回収済' | '不要' | string;

export type ReplaceRequestStatus = '未依頼' | '依頼済' | '対象外' | string;

export type ItemOrderStatus = '未手配' | '手配済' | '納品待ち' | '完了' | string;

export type ScheduleNoticeStatus = '未連絡' | '連絡済' | '日程調整中' | string;

export type CompletionStatus = '未完了' | '完了' | '保留' | '対象外' | string;

export interface StoreRecord {
  // A〜I列（入力禁止・基本マスタ情報）
  no: number;                       // A: NO
  storeCode: string;                // B: 店番
  representativePhone: string;      // C: 代表番号
  storeName: string;                // D: 店名
  address1: string;                 // E: 店舗住所1（漢字）
  address2: string;                 // F: 店舗住所2（漢字）
  buildingName: string;             // G: 店舗建物名
  storeMobile: string;              // H: 店舗携帯番号
  managementType: string;           // I: 運営（直営 / 社員FC / FC 等）

  // J〜T列（入力および選択方式）
  remarks1: string;                 // J: 備考欄1 (例: "LED,キッチン不明", "LED済み" 等)
  category: LocationCategory;       // K: カテゴリ（ビルイン / フードコート / ロードサイド）
  phoneStatus: PhoneStatus;         // L: 電話（未架電 / 完了 / 不在 / 通話中 等）
  surveyAssignee: string;           // M: 調査担当
  surveyDate: string;               // N: 調査日（YYYY-MM-DD 等）
  surveyDocCollection: SurveyDocStatus; // O: 調査資料回収（未回収 / 回収済 / 不要）
  replacementRequest: ReplaceRequestStatus; // P: 置き換え依頼（未依頼 / 依頼済 / 対象外）
  itemOrdering: ItemOrderStatus;    // Q: 商品手配（未手配 / 手配済 / 完了）
  workAssignee: string;             // R: 作業担当
  scheduleNotice: ScheduleNoticeStatus; // S: 日程連絡（未連絡 / 連絡済）
  completion: CompletionStatus;     // T: 完了（未完了 / 完了 / 保留）

  // システム用管理フィールド
  updatedAt?: string;
  updatedBy?: string;
}

export type SimulatorLocationCategory = 'builtin' | 'foodcourt' | 'freesta' | 'unspecified';

export interface HearingRecord {
  id: string;
  timestamp: string;
  operatorName: string;
  storeName: string;
  storeId?: string;
  contactPerson: string;
  contactRole?: string;
  phoneNumber: string;
  ledStatus: LedStatus;
  partialAreas?: string;
  locationCategory: SimulatorLocationCategory;
  locationDetails?: {
    isTenantInBuilding: boolean;
    isCounterOnly: boolean;
    hasDedicatedParkingLights: boolean;
  };
  surveyRequirement: 'not_required' | 'required' | 'pending';
  visitPeriodStart?: string;        // 訪問予定期間（開始日：何日から）
  visitPeriodEnd?: string;          // 訪問予定期間（終了日：何日まで）
  preferredDate1?: string;          // 互換性保持（期間開始日）
  preferredTimeSlot1?: TimeSlot;
  preferredDate2?: string;          // 互換性保持（期間終了日）
  preferredTimeSlot2?: TimeSlot;
  workTiming?: 'during_hours' | 'idle_time' | 'after_hours';
  afterHoursTriggered: boolean;
  keyCustody: KeyCustodyStatus;
  lockProcedure?: string;
  emergencyContact?: string;
  notes?: string;
  status: 'completed' | 'draft' | 'follow_up_needed';
}

// 互換性およびスクリプト用の定義
export type LedStatus = 'all_led' | 'partial_led' | 'not_started';
export type TimeSlot = 'any' | 'morning' | 'afternoon' | 'idle_time' | 'after_hours' | 'custom';
export type KeyCustodyStatus = 'possible' | 'not_possible' | 'requires_staff' | 'not_applicable';

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
