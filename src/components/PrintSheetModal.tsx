/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Printer, CheckCircle2, AlertTriangle, Key, Edit3 } from 'lucide-react';
import { HearingRecord } from '../types/hearing';

interface PrintSheetModalProps {
  record: HearingRecord | null;
  onClose: () => void;
  onEditRecord?: (record: HearingRecord) => void;
}

export const PrintSheetModal: React.FC<PrintSheetModalProps> = ({ record, onClose, onEditRecord }) => {
  if (!record) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden modal-overlay-print">
      <style>{`
        @media print {
          .modal-overlay-print {
            position: static !important;
            background: none !important;
            padding: 0 !important;
            overflow: visible !important;
            display: block !important;
          }
          .modal-card-print {
            max-height: none !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .modal-scroll-print {
            overflow: visible !important;
            max-height: none !important;
            padding: 0 !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden modal-card-print animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Controls Top Bar (Sticky, Always visible, never cut off) */}
        <div className="sticky top-0 z-30 shrink-0 px-4 sm:px-6 py-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shadow-xs print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900">印刷プレビュー・帳票出力</span>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              【{record.storeName}】
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onEditRecord && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditRecord(record);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                title="通話ナビに戻って修正・上書き保存"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>通話ナビで修正</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer"
              title="帳票を印刷またはPDFとして保存"
            >
              <Printer className="w-4 h-4" />
              <span>印刷する / PDF保存</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              title="閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet Content (Internal Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 text-slate-900 bg-white modal-scroll-print" id="printable-area">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                蛍光灯→LED切替 事前調査 電話ヒアリング結果シート
              </h1>
              <div className="text-xs text-slate-500 mt-1">
                LED照明更新プロジェクト・現場調査手配用カルテ
              </div>
            </div>
            <div className="text-right text-xs font-mono">
              <div>記録ID: {record.id}</div>
              <div>
                <span>受付日時: {record.timestamp.split(' (')[0]}</span>
                {record.timestamp.includes('(') && (
                  <span className="block text-[11px] text-slate-500 font-sans">
                    {record.timestamp.match(/\((.*?)\)/)?.[1] || ''}
                  </span>
                )}
              </div>
              <div>担当者: {record.operatorName}</div>
            </div>
          </div>

          {/* Section 1: Store Info */}
          <div>
            <div className="text-xs font-bold bg-slate-100 text-slate-800 px-3 py-1.5 border-l-4 border-slate-900 mb-2">
              1. 対象店舗・対応者情報
            </div>
            <table className="w-full text-xs border border-slate-300 border-collapse">
              <tbody>
                <tr className="border-b border-slate-200">
                  <th className="w-28 p-2 bg-slate-50 text-left font-semibold text-slate-600">店舗名</th>
                  <td className="p-2 font-bold">{record.storeName}</td>
                  <th className="w-24 p-2 bg-slate-50 text-left font-semibold text-slate-600">店舗ID</th>
                  <td className="p-2 font-mono">{record.storeId || '-'}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <th className="p-2 bg-slate-50 text-left font-semibold text-slate-600">対応者氏名</th>
                  <td className="p-2">
                    {record.contactPerson} 様（{record.contactRole || '店長'}）
                  </td>
                  <th className="p-2 bg-slate-50 text-left font-semibold text-slate-600">電話番号</th>
                  <td className="p-2 font-mono">{record.phoneNumber || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: LED Status & Verdict */}
          <div>
            <div className="text-xs font-bold bg-slate-100 text-slate-800 px-3 py-1.5 border-l-4 border-slate-900 mb-2">
              2. LED化状況確認 & 訪問調査要否判定
            </div>
            <div className="border border-slate-300 p-4 space-y-3">
              <div className="flex items-center gap-6 text-xs">
                <span className="font-semibold text-slate-700">店舗内LED化状況:</span>
                <span
                  className={`font-bold px-2.5 py-1 rounded text-xs ${
                    record.ledStatus === 'all_led'
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-blue-100 text-blue-900'
                  }`}
                >
                  {record.ledStatus === 'all_led'
                    ? '全灯LED化済み'
                    : record.ledStatus === 'partial_led'
                    ? '一部未LED（蛍光灯残存）'
                    : '未着手（すべて蛍光灯）'}
                </span>
                {record.partialAreas && (
                  <span className="text-slate-600">（残存エリア: {record.partialAreas}）</span>
                )}
              </div>

              {/* Requirement Result */}
              <div
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  record.surveyRequirement === 'not_required'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-blue-50 border-blue-300 text-blue-950'
                }`}
              >
                <div className="flex items-center gap-2">
                  {record.surveyRequirement === 'not_required' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-blue-600" />
                  )}
                  <span className="text-sm font-bold">
                    判定結果：
                    {record.surveyRequirement === 'not_required'
                      ? '【訪問調査 不要（案件終了）】'
                      : '【訪問調査 必要（技術員派遣）】'}
                  </span>
                </div>
                <span className="text-xs font-semibold">
                  {record.surveyRequirement === 'not_required'
                    ? '※全灯LED確認済・調査免除'
                    : '※器具規格・本数現地調査'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3 & 4 (Only if Survey Required) */}
          {record.surveyRequirement !== 'not_required' && (
            <>
              <div>
                <div className="text-xs font-bold bg-slate-100 text-slate-800 px-3 py-1.5 border-l-4 border-slate-900 mb-2">
                  3. 設置場所区分 & 訪問日程調整
                </div>
                <table className="w-full text-xs border border-slate-300 border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <th className="w-32 p-2 bg-slate-50 text-left font-semibold text-slate-600">
                        設置場所区分
                      </th>
                      <td colSpan={3} className="p-2 font-bold text-sm">
                        {record.locationCategory === 'builtin'
                          ? 'ビルトイン（ビルテナント / 専用客席あり）'
                          : record.locationCategory === 'foodcourt'
                          ? 'フードコート（カウンター・厨房のみ）'
                          : record.locationCategory === 'freesta'
                          ? 'ロードサイド（独立路面店舗 / 駐車場照明あり）'
                          : '未特定'}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <th className="p-2 bg-slate-50 text-left font-semibold text-slate-600">訪問予定期間</th>
                      <td className="p-2 font-bold text-blue-900">
                        {record.visitPeriodStart && record.visitPeriodEnd
                          ? `${record.visitPeriodStart} 〜 ${record.visitPeriodEnd}`
                          : record.preferredDate1 && record.preferredDate2
                          ? `${record.preferredDate1} 〜 ${record.preferredDate2}`
                          : record.preferredDate1 || '未定'}
                      </td>
                      <th className="w-28 p-2 bg-slate-50 text-left font-semibold text-slate-600">希望時間帯</th>
                      <td className="p-2">
                        {record.preferredTimeSlot1 === 'idle_time'
                          ? 'アイドルタイム（14:00〜16:00）'
                          : record.preferredTimeSlot1 === 'morning'
                          ? '午前中（10:00〜12:00）'
                          : record.preferredTimeSlot1 === 'afternoon'
                          ? '午後（13:00〜17:00）'
                          : record.preferredTimeSlot1 === 'after_hours'
                          ? '営業終了後・夜間作業'
                          : record.preferredTimeSlot1 || '時間指定なし'}
                      </td>
                    </tr>
                    <tr>
                      <th className="p-2 bg-slate-50 text-left font-semibold text-slate-600">希望作業時間帯</th>
                      <td colSpan={3} className="p-2">
                        {record.workTiming === 'after_hours'
                          ? '営業終了後・夜間作業（閉店後）'
                          : '営業時間内・アイドルタイム（14:00〜16:00等）'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Conditional Section 5: Lock & Key */}
              {record.afterHoursTriggered && (
                <div>
                  <div className="text-xs font-bold bg-amber-100 text-amber-900 px-3 py-1.5 border-l-4 border-amber-600 mb-2 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-700" />
                    <span>4. 【条件発動】営業終了後作業の戸締り・鍵預かり手順</span>
                  </div>
                  <table className="w-full text-xs border border-amber-300 border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <th className="w-32 p-2 bg-amber-50 text-left font-semibold text-amber-950">
                          鍵預かり可否
                        </th>
                        <td className="p-2 font-bold">
                          {record.keyCustody === 'possible'
                            ? '預かり可能（キーボックス等の預託）'
                            : record.keyCustody === 'not_possible'
                            ? '預かり不可（スタッフ様立ち会い必須）'
                            : 'その他・警備会社対応'}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <th className="p-2 bg-amber-50 text-left font-semibold text-amber-950">
                          施錠・返却手順
                        </th>
                        <td className="p-2 leading-relaxed">
                          {record.lockProcedure || '特記事項なし'}
                        </td>
                      </tr>
                      <tr>
                        <th className="p-2 bg-amber-50 text-left font-semibold text-amber-950">
                          緊急連絡先
                        </th>
                        <td className="p-2 font-mono">
                          {record.emergencyContact || '通常電話番号と同じ'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Section: Notes */}
          <div>
            <div className="text-xs font-bold bg-slate-100 text-slate-800 px-3 py-1.5 border-l-4 border-slate-900 mb-2">
              特記事項・引継ぎ連絡メモ
            </div>
            <div className="border border-slate-300 p-3 min-h-16 text-xs text-slate-700 whitespace-pre-wrap">
              {record.notes || '特になし'}
            </div>
          </div>

          {/* Footer Signatures */}
          <div className="pt-6 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-xs">
            <div className="border border-slate-200 p-2 rounded">
              <div className="text-slate-500 mb-6">受付オペレーター印</div>
              <div className="font-bold">{record.operatorName}</div>
            </div>
            <div className="border border-slate-200 p-2 rounded">
              <div className="text-slate-500 mb-6">調査員アサイン確認</div>
              <div className="text-slate-300">承認印</div>
            </div>
            <div className="border border-slate-200 p-2 rounded">
              <div className="text-slate-500 mb-6">本部管理簿記入</div>
              <div className="text-slate-300">完了印</div>
            </div>
          </div>
        </div>

        {/* Modal Controls Bottom Bar (Sticky at bottom, hidden on print) */}
        <div className="sticky bottom-0 z-30 shrink-0 px-4 sm:px-6 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shadow-xs print:hidden">
          <div className="text-xs text-slate-500 font-medium">
            <span>A4縦印刷・PDF保存に最適化されています</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>印刷する / PDF保存</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
