/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  RotateCcw,
  X,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Phone,
  FileText,
  Trash2,
  ArrowRight,
  Info,
} from 'lucide-react';
import { StoreRecord, HearingRecord } from '../types/hearing';

interface TestClearModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: StoreRecord | null;
  records?: HearingRecord[];
  onConfirmClear: (storeNo: number) => Promise<void> | void;
}

export const TestClearModal: React.FC<TestClearModalProps> = ({
  isOpen,
  onClose,
  store,
  records = [],
  onConfirmClear,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !store) return null;

  // Find associated hearing record for this store
  const matchedHearings = records.filter((r) => {
    if (store.storeCode && r.storeId && r.storeId.trim().toLowerCase() === store.storeCode.trim().toLowerCase()) {
      return true;
    }
    if (store.storeName && r.storeName && r.storeName.trim() === store.storeName.trim()) {
      return true;
    }
    return false;
  });

  // Calculate which fields actually have data that will be cleared
  const clearableItems: {
    label: string;
    col: string;
    currentValue: string;
    afterValue: string;
    hasData: boolean;
  }[] = [
    {
      label: '電話状況',
      col: 'V列',
      currentValue: store.callStatus || store.phoneStatus || '未架電',
      afterValue: '未架電',
      hasData: Boolean(store.callStatus && store.callStatus !== '未架電'),
    },
    {
      label: '電話口担当（対応者氏名）',
      col: 'M列',
      currentValue: store.phoneContact || '未入力',
      afterValue: '未入力（消去）',
      hasData: Boolean(store.phoneContact && store.phoneContact.trim() !== ''),
    },
    {
      label: '調査日',
      col: 'O列',
      currentValue: store.surveyDate || '未設定',
      afterValue: '未設定（消去）',
      hasData: Boolean(store.surveyDate && store.surveyDate.trim() !== ''),
    },
    {
      label: '調査担当',
      col: 'N列',
      currentValue: store.surveyAssignee || '未設定',
      afterValue: '未設定（消去）',
      hasData: Boolean(store.surveyAssignee && store.surveyAssignee.trim() !== ''),
    },
    {
      label: '備考欄1',
      col: 'J列',
      currentValue: store.remarks1 || '未入力',
      afterValue: '未入力（消去）',
      hasData: Boolean(store.remarks1 && store.remarks1.trim() !== ''),
    },
    {
      label: '調査資料回収',
      col: 'P列',
      currentValue: store.surveyDocCollection || '未回収',
      afterValue: '未回収',
      hasData: Boolean(store.surveyDocCollection && store.surveyDocCollection !== '未回収'),
    },
    {
      label: '調査書類回収日付',
      col: '訪問後',
      currentValue: store.surveyDocDate || '未設定',
      afterValue: '未設定（消去）',
      hasData: Boolean(store.surveyDocDate && store.surveyDocDate.trim() !== ''),
    },
    {
      label: '調査資料作成開始日 / 状況',
      col: '訪問後',
      currentValue: store.surveyMaterialStartDate
        ? `${store.surveyMaterialStartDate} (${store.surveyMaterialStatus || '未着手'})`
        : store.surveyMaterialStatus && store.surveyMaterialStatus !== '未着手'
        ? store.surveyMaterialStatus
        : '未設定',
      afterValue: '未着手（消去）',
      hasData: Boolean(
        (store.surveyMaterialStartDate && store.surveyMaterialStartDate.trim() !== '') ||
        (store.surveyMaterialStatus && store.surveyMaterialStatus !== '未着手')
      ),
    },
    {
      label: '置き換え依頼',
      col: 'Q列',
      currentValue: store.replacementRequest || '未依頼',
      afterValue: '未依頼',
      hasData: Boolean(store.replacementRequest && store.replacementRequest !== '未依頼'),
    },
    {
      label: '商品手配',
      col: 'R列',
      currentValue: store.itemOrdering || '未手配',
      afterValue: '未手配',
      hasData: Boolean(store.itemOrdering && store.itemOrdering !== '未手配'),
    },
    {
      label: '日程連絡',
      col: 'T列',
      currentValue: store.scheduleNotice || '未連絡',
      afterValue: '未連絡',
      hasData: Boolean(store.scheduleNotice && store.scheduleNotice !== '未連絡'),
    },
    {
      label: '完了状況',
      col: 'U列',
      currentValue: store.completion || '未完了',
      afterValue: '未完了',
      hasData: Boolean(store.completion && store.completion !== '未完了'),
    },
  ];

  const hasAnyEnteredData = clearableItems.some((i) => i.hasData) || matchedHearings.length > 0;

  const handleExecute = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await onConfirmClear(store.no);
      onClose();
    } catch (err: any) {
      console.error('Failed to clear test input:', err);
      setErrorMessage(err?.message || 'テストデータのクリアに失敗しました。');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-rose-50 via-amber-50/50 to-white border-b border-rose-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <span>テスト入力情報のクリア確認</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                  対象店舗のみ
                </span>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                本番データ保護のため、選択した店舗のテスト入力フィールドのみを初期状態に戻します
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          {/* Target Store Banner */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-600" />
                <span>クリア対象店舗（顧客）</span>
              </span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold border border-blue-200">
                NO.{store.no}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h4 className="text-sm sm:text-base font-bold text-slate-900">
                {store.storeName}
              </h4>
              <span className="text-xs text-slate-600 font-mono">
                店番: <strong>{store.storeCode}</strong>
              </span>
              <span className="text-xs text-slate-600 font-medium">
                運営: <strong>{store.managementType}</strong>
              </span>
            </div>

            <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
              <span>住所: {store.address1} {store.address2}</span>
              <span>携帯: <span className="font-mono">{store.storeMobile || '-'}</span></span>
              <span>代表TEL: <span className="font-mono">{store.representativePhone || '-'}</span></span>
            </div>
          </div>

          {/* Safety Notice: Master Data & S-column Protection */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-emerald-900 leading-relaxed">
              <strong className="block text-emerald-950 font-bold mb-0.5">
                【安全保護】A〜I列の基本マスタおよび「作業担当（S列）」は初期化されません
              </strong>
              店番、店名、代表電話番号、店舗携帯番号、住所などの基本マスタデータに加え、
              <strong>作業担当（S列: {store.workAssignee ? `「${store.workAssignee}」` : '未設定'}）は初期化対象外</strong>として現在の値がそのまま保持されます。
              消去されるのは、この店舗のテスト架電・進捗入力項目（J〜R列、T〜V列、訪問後進捗）のみです。
            </div>
          </div>

          {/* Detailed Clearance Diff List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>消去・初期化される入力項目一覧（事前確認）</span>
              </span>
              <span className="text-[11px] text-slate-500">
                {hasAnyEnteredData ? (
                  <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    入力ありデータが存在します
                  </span>
                ) : (
                  <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    現在入力データなし（初期値のみ）
                  </span>
                )}
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
              {clearableItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`px-3 py-2 flex items-center justify-between gap-3 text-[11px] transition-colors ${
                    item.hasData ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-100 text-slate-700 shrink-0">
                      {item.col}
                    </span>
                    <span className="font-medium text-slate-800 truncate">
                      {item.label}
                    </span>
                    {item.hasData && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 shrink-0">
                        入力済
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                    <span className={`px-2 py-0.5 rounded ${item.hasData ? 'font-bold text-rose-900 bg-rose-100/70' : 'text-slate-500 bg-slate-50'}`}>
                      {item.currentValue}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {item.afterValue}
                    </span>
                  </div>
                </div>
              ))}

              {/* Preserved S Column (作業担当) */}
              <div className="px-3 py-2 flex items-center justify-between gap-3 text-[11px] bg-emerald-50/60 border-t border-emerald-100">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-100 text-emerald-800 shrink-0">
                    S列
                  </span>
                  <span className="font-medium text-emerald-950">
                    作業担当（初期化対象外）
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 shrink-0">
                    保持
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                  <span className="font-bold text-emerald-900 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200">
                    {store.workAssignee || '未設定'}
                  </span>
                  <span className="text-emerald-700 font-sans text-[10px] font-bold">
                    （値は消去されず維持）
                  </span>
                </div>
              </div>

              {/* Associated Hearing Record info */}
              <div
                className={`px-3 py-2 flex items-center justify-between gap-3 text-[11px] ${
                  matchedHearings.length > 0 ? 'bg-rose-50/50' : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-purple-100 text-purple-800 shrink-0">
                    通話履歴
                  </span>
                  <span className="font-medium text-slate-800">
                    詳細ヒアリング記録・架電結果ログ
                  </span>
                  {matchedHearings.length > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 shrink-0">
                      {matchedHearings.length}件あり
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                  <span className={`px-2 py-0.5 rounded ${matchedHearings.length > 0 ? 'font-bold text-rose-900 bg-rose-100/70' : 'text-slate-500 bg-slate-50'}`}>
                    {matchedHearings.length > 0 ? `${matchedHearings.length}件の記録` : 'なし'}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    削除（0件）
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message if any */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 font-bold text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Confirmation Warning Box */}
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>実行確認:</strong> 上記の内容で［<strong>NO.{store.no} {store.storeName}</strong>］のテスト入力情報を初期化します。
              他の店舗（全173店舗中の他店舗）には一切影響しません。よろしいですか？
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            キャンセル
          </button>

          <button
            type="button"
            onClick={handleExecute}
            disabled={isProcessing}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>クリア処理中...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>確認してテスト入力をクリアする</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
