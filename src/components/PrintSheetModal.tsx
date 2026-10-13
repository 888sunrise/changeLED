/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Key,
  Edit3,
  FileDown,
  Loader2,
  Info,
  Maximize2,
  Minimize2,
  Scissors,
  Layers,
  Plus,
  Trash2,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { toCanvas, toPng } from 'html-to-image';
import { HearingRecord, StoreRecord } from '../types/hearing';
import { getRecordAddress } from './ChecksheetForm';

interface PrintSheetModalProps {
  record?: HearingRecord | null;
  records?: HearingRecord[];
  allAvailableRecords?: HearingRecord[];
  stores?: StoreRecord[];
  onClose: () => void;
  onEditRecord?: (record: HearingRecord) => void;
}

interface HearingSheetCardProps {
  record: HearingRecord;
  stores?: StoreRecord[];
  compact: boolean;
  slotLabel?: string;
}

/**
 * Individual Hearing Sheet Card
 * Renders either in full size (1 per page) or compact size (2 per page)
 */
const HearingSheetCard: React.FC<HearingSheetCardProps> = ({
  record,
  stores,
  compact,
  slotLabel,
}) => {
  const addrInfo = getRecordAddress(record, stores);

  return (
    <div
      className={`w-full bg-white text-slate-900 border border-slate-300 print:border-slate-400 rounded-xs flex flex-col justify-between ${
        compact
          ? 'p-3 print:p-2.5 print-half-sheet text-[10px] print:text-[7pt]'
          : 'p-5 sm:p-6 print:p-4 text-xs print:text-[8pt]'
      }`}
      style={{
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Sheet Header */}
      <div className={`border-b-2 border-slate-900 ${compact ? 'pb-1' : 'pb-1.5'} flex items-start justify-between`}>
        <div>
          <div className="flex items-center gap-1.5">
            <h1
              className={`font-bold tracking-tight text-slate-900 leading-tight ${
                compact ? 'text-xs sm:text-sm print:text-[10pt]' : 'text-base sm:text-lg print:text-[12pt]'
              }`}
            >
              蛍光灯→LED切替 事前調査 電話ヒアリング結果シート
            </h1>
            {slotLabel && (
              <span className="text-[9px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.2 rounded print:hidden border border-slate-200">
                {slotLabel}
              </span>
            )}
          </div>
          <div className={`${compact ? 'text-[9px] print:text-[6.5pt]' : 'text-[10px] print:text-[7.5pt]'} text-slate-500 mt-0.5`}>
            LED照明更新プロジェクト・現場調査手配用カルテ（{compact ? 'A4 1枚2件掲載' : 'A4縦1枚保管用'}）
          </div>
        </div>

        <div className={`text-right font-mono leading-tight space-y-0.5 ${compact ? 'text-[9.5px] print:text-[6.5pt]' : 'text-[11px] print:text-[7.5pt]'}`}>
          <div>記録ID: {record.id}</div>
          {(() => {
            const match = (record.timestamp || '').match(/^(.*?)\s*\((修正|更新):\s*(.*?)\)$/);
            if (match) {
              return (
                <div className="leading-tight">
                  <div>受付日時: {match[1]}</div>
                  <div className="text-[9px] print:text-[6pt] text-amber-700 font-sans font-semibold">
                    {match[2]}: {match[3]}
                  </div>
                </div>
              );
            }
            return <div>受付日時: {record.timestamp}</div>;
          })()}
          <div>担当者: {record.operatorName}</div>
        </div>
      </div>

      {/* 2. Section 1: Store & Contact Info */}
      <div className={compact ? 'my-1 print:my-0.5' : 'my-1.5 print:my-1'}>
        <div className={`flex items-center gap-1.5 font-bold text-slate-900 ${compact ? 'text-[10px] print:text-[7pt] mb-0.5' : 'text-xs print:text-[8.5pt] mb-0.5'}`}>
          <span className="w-1.5 h-3 bg-slate-900 inline-block rounded-2xs"></span>
          <span>1. 対象店舗・対応者情報</span>
        </div>
        <table className={`w-full border border-slate-300 border-collapse ${compact ? 'text-[10px] print:text-[7pt]' : 'text-xs print:text-[8pt]'}`}>
          <tbody>
            <tr className="border-b border-slate-200">
              <th className={`${compact ? 'w-20' : 'w-24 sm:w-28'} py-0.5 sm:py-1 px-1.5 sm:px-2 bg-slate-50 text-left font-semibold text-slate-600`}>店舗名</th>
              <td className="py-0.5 sm:py-1 px-1.5 sm:px-2 font-bold text-slate-900">{record.storeName}</td>
              <th className={`${compact ? 'w-16' : 'w-20 sm:w-24'} py-0.5 sm:py-1 px-1.5 sm:px-2 bg-slate-50 text-left font-semibold text-slate-600`}>店舗ID</th>
              <td className="py-0.5 sm:py-1 px-1.5 sm:px-2 font-mono text-slate-800">{record.storeId || '-'}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <th className="py-0.5 sm:py-1 px-1.5 sm:px-2 bg-slate-50 text-left font-semibold text-slate-600">住所</th>
              <td colSpan={3} className="py-0.5 sm:py-1 px-1.5 sm:px-2 text-slate-800">
                {addrInfo.fullAddress || '未登録'}
              </td>
            </tr>
            <tr>
              <th className="py-0.5 sm:py-1 px-1.5 sm:px-2 bg-slate-50 text-left font-semibold text-slate-600">対応者氏名</th>
              <td className="py-0.5 sm:py-1 px-1.5 sm:px-2 text-slate-900">
                {record.contactPerson} 様（{record.contactRole || '店長'}）
              </td>
              <th className="py-0.5 sm:py-1 px-1.5 sm:px-2 bg-slate-50 text-left font-semibold text-slate-600">電話番号</th>
              <td className="py-0.5 sm:py-1 px-1.5 sm:px-2 font-mono text-slate-800">{record.phoneNumber || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 3. Section 2: LED Status & Verdict */}
      <div className={compact ? 'my-1 print:my-0.5' : 'my-1.5 print:my-1'}>
        <div className={`flex items-center gap-1.5 font-bold text-slate-900 ${compact ? 'text-[10px] print:text-[7pt] mb-0.5' : 'text-xs print:text-[8.5pt] mb-0.5'}`}>
          <span className="w-1.5 h-3 bg-slate-900 inline-block rounded-2xs"></span>
          <span>2. LED化状況確認 & 訪問調査要否判定</span>
        </div>
        <div className={`border border-slate-300 ${compact ? 'p-1 space-y-0.5' : 'p-1.5 space-y-1'} rounded-2xs`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700">店舗内LED化状況:</span>
            <span
              className={`font-bold px-1.5 py-0.5 rounded ${
                record.ledStatus === 'all_led'
                  ? 'bg-emerald-100 text-emerald-900'
                  : record.ledStatus === 'partial_led'
                  ? 'bg-blue-100 text-blue-900'
                  : 'bg-amber-100 text-amber-900'
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

          {/* Verdict Box */}
          <div
            className={`p-1 rounded border flex items-center justify-between ${
              record.surveyRequirement === 'not_required'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-blue-50 border-blue-300 text-blue-950'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {record.surveyRequirement === 'not_required' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              )}
              <span className="font-bold">
                判定結果：
                {record.surveyRequirement === 'not_required'
                  ? '【訪問調査 不要（案件終了）】'
                  : '【訪問調査 必要（技術員派遣）】'}
              </span>
            </div>
            <span className="text-slate-600 font-semibold text-[9.5px] print:text-[6.5pt]">
              {record.surveyRequirement === 'not_required'
                ? '※全灯LED確認済・調査免除'
                : '※器具規格・本数現地調査'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Section 3: Schedule (if survey required) */}
      {record.surveyRequirement !== 'not_required' && (
        <>
          <div className={compact ? 'my-1 print:my-0.5' : 'my-1.5 print:my-1'}>
            <div className={`flex items-center gap-1.5 font-bold text-slate-900 ${compact ? 'text-[10px] print:text-[7pt] mb-0.5' : 'text-xs print:text-[8.5pt] mb-0.5'}`}>
              <span className="w-1.5 h-3 bg-slate-900 inline-block rounded-2xs"></span>
              <span>3. 設置場所区分 & 訪問日程調整</span>
            </div>
            <table className={`w-full border border-slate-300 border-collapse ${compact ? 'text-[10px] print:text-[7pt]' : 'text-xs print:text-[8pt]'}`}>
              <tbody>
                <tr className="border-b border-slate-200">
                  <th className={`${compact ? 'w-20' : 'w-24 sm:w-28'} py-0.5 sm:py-1 px-1.5 sm:px-2 bg-slate-50 text-left font-semibold text-slate-600`}>
                    設置場所区分
                  </th>
                  <td colSpan={3} className="py-0.5 sm:py-1 px-1.5 sm:px-2 font-bold text-slate-900">
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
                  <th className="py-0.5 sm:py-1 px-1.5 sm:px-2 bg-slate-50 text-left font-semibold text-slate-600">訪問予定期間</th>
                  <td className="py-0.5 sm:py-1 px-1.5 sm:px-2 font-bold text-blue-900">
                    {record.visitPeriodStart && record.visitPeriodEnd
                      ? `${record.visitPeriodStart} 〜 ${record.visitPeriodEnd}`
                      : record.preferredDate1 && record.preferredDate2
                      ? `${record.preferredDate1} 〜 ${record.preferredDate2}`
                      : record.preferredDate1 || '未定'}
                  </td>
                  <th className={`${compact ? 'w-16' : 'w-20 sm:w-24'} py-0.5 sm:py-1 px-1.5 sm:px-2 bg-slate-50 text-left font-semibold text-slate-600`}>希望時間帯</th>
                  <td className="py-0.5 sm:py-1 px-1.5 sm:px-2 text-slate-900">
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
                  <th className="py-0.5 sm:py-1 px-1.5 sm:px-2 bg-slate-50 text-left font-semibold text-slate-600">作業時間帯</th>
                  <td colSpan={3} className="py-0.5 sm:py-1 px-1.5 sm:px-2 text-slate-900">
                    {record.workTiming === 'after_hours'
                      ? '営業終了後・夜間作業（閉店後）'
                      : '営業時間内・アイドルタイム（14:00〜16:00等）'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Conditional Section 4: Lock & Key */}
          {record.afterHoursTriggered && (
            <div className={compact ? 'my-1 print:my-0.5' : 'my-1.5 print:my-1'}>
              <div className={`flex items-center gap-1.5 font-bold text-amber-900 ${compact ? 'text-[10px] print:text-[7pt] mb-0.5' : 'text-xs print:text-[8.5pt] mb-0.5'}`}>
                <span className="w-1.5 h-3 bg-amber-600 inline-block rounded-2xs"></span>
                <Key className="w-3 h-3 text-amber-700" />
                <span>4. 【条件発動】営業終了後作業の戸締り・鍵預かり手順</span>
              </div>
              <table className={`w-full border border-amber-300 border-collapse ${compact ? 'text-[10px] print:text-[7pt]' : 'text-xs print:text-[8pt]'}`}>
                <tbody>
                  <tr className="border-b border-slate-200">
                    <th className={`${compact ? 'w-20' : 'w-24 sm:w-28'} py-0.5 sm:py-1 px-1.5 sm:px-2 bg-amber-50 text-left font-semibold text-amber-950`}>
                      鍵預かり可否
                    </th>
                    <td className="py-0.5 sm:py-1 px-1.5 sm:px-2 font-bold">
                      {record.keyCustody === 'possible'
                        ? '預かり可能（キーボックス等の預託）'
                        : record.keyCustody === 'not_possible'
                        ? '預かり不可（スタッフ様立ち会い必須）'
                        : 'その他・警備会社対応'}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <th className="py-0.5 sm:py-1 px-1.5 sm:px-2 bg-amber-50 text-left font-semibold text-amber-950">
                      施錠・返却手順
                    </th>
                    <td className="py-0.5 sm:py-1 px-1.5 sm:px-2 leading-tight text-slate-800">
                      {record.lockProcedure || '特記事項なし'}
                    </td>
                  </tr>
                  <tr>
                    <th className="py-0.5 sm:py-1 px-1.5 sm:px-2 bg-amber-50 text-left font-semibold text-amber-950">
                      緊急連絡先
                    </th>
                    <td className="py-0.5 sm:py-1 px-1.5 sm:px-2 font-mono text-slate-800">
                      {record.emergencyContact || '通常電話番号と同じ'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* 5. Section: Notes */}
      <div className={compact ? 'my-1 print:my-0.5' : 'my-1.5 print:my-1'}>
        <div className={`flex items-center gap-1.5 font-bold text-slate-900 ${compact ? 'text-[10px] print:text-[7pt] mb-0.5' : 'text-xs print:text-[8.5pt] mb-0.5'}`}>
          <span className="w-1.5 h-3 bg-slate-900 inline-block rounded-2xs"></span>
          <span>特記事項・引継ぎ連絡メモ</span>
        </div>
        <div
          className={`border border-slate-300 text-slate-700 whitespace-pre-wrap leading-tight rounded-2xs ${
            compact ? 'p-1 min-h-[24px] print:min-h-[18px]' : 'p-1.5 min-h-[36px] print:min-h-[28px]'
          }`}
        >
          {record.notes || '特になし'}
        </div>
      </div>

      {/* 6. Footer Stamp Boxes */}
      <div className={`border-t-2 border-slate-300 grid grid-cols-3 gap-2 text-center shrink-0 ${compact ? 'mt-1 pt-1' : 'mt-2 pt-1.5'}`}>
        <div className="border border-slate-300 p-0.5 sm:p-1 rounded bg-slate-50/50">
          <div className={`text-slate-500 ${compact ? 'text-[8.5px] print:text-[6pt]' : 'text-[10px] print:text-[7pt]'}`}>
            受付オペレーター印
          </div>
          <div className={`font-bold text-slate-900 py-0.2 sm:py-0.5 ${compact ? 'text-[10px] print:text-[7pt]' : 'text-xs print:text-[8pt]'}`}>
            {record.operatorName}
          </div>
        </div>
        <div className="border border-slate-300 p-0.5 sm:p-1 rounded bg-slate-50/50">
          <div className={`text-slate-500 ${compact ? 'text-[8.5px] print:text-[6pt]' : 'text-[10px] print:text-[7pt]'}`}>
            調査員アサイン確認
          </div>
          <div className={`text-slate-400 py-0.2 sm:py-0.5 ${compact ? 'text-[10px] print:text-[7pt]' : 'text-xs print:text-[8pt]'}`}>
            承認印
          </div>
        </div>
        <div className="border border-slate-300 p-0.5 sm:p-1 rounded bg-slate-50/50">
          <div className={`text-slate-500 ${compact ? 'text-[8.5px] print:text-[6pt]' : 'text-[10px] print:text-[7pt]'}`}>
            本部管理簿記入
          </div>
          <div className={`text-slate-400 py-0.2 sm:py-0.5 ${compact ? 'text-[10px] print:text-[7pt]' : 'text-xs print:text-[8pt]'}`}>
            完了印
          </div>
        </div>
      </div>
    </div>
  );
};

export const PrintSheetModal: React.FC<PrintSheetModalProps> = ({
  record,
  records,
  allAvailableRecords,
  stores,
  onClose,
  onEditRecord,
}) => {
  // Consolidate initial list of records
  const initialRecords: HearingRecord[] = React.useMemo(() => {
    if (records && records.length > 0) return records;
    if (record) return [record];
    return [];
  }, [records, record]);

  const [activeRecords, setActiveRecords] = useState<HearingRecord[]>(initialRecords);
  const [layoutMode, setLayoutMode] = useState<'two_per_page' | 'one_per_page'>(
    initialRecords.length > 1 ? 'two_per_page' : 'two_per_page'
  );
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<string>('');
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'fit' | 'full'>('full');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Sync state if initialRecords change
  useEffect(() => {
    if (initialRecords.length > 0) {
      setActiveRecords(initialRecords);
      // Default to 1枚に2件 when multiple records, or user preference
      setLayoutMode(initialRecords.length > 1 ? 'two_per_page' : 'one_per_page');
    }
  }, [initialRecords]);

  useEffect(() => {
    document.body.classList.add('print-sheet-modal-open');
    return () => {
      document.body.classList.remove('print-sheet-modal-open');
      if (pdfDownloadUrl) {
        URL.revokeObjectURL(pdfDownloadUrl);
      }
    };
  }, [pdfDownloadUrl]);

  if (activeRecords.length === 0) return null;

  // Chunk records into pages based on layoutMode
  const itemsPerPage = layoutMode === 'two_per_page' ? 2 : 1;
  const pages: HearingRecord[][] = [];
  for (let i = 0; i < activeRecords.length; i += itemsPerPage) {
    pages.push(activeRecords.slice(i, i + itemsPerPage));
  }
  const totalPages = pages.length;

  // Add / remove records within modal
  const handleRemoveRecord = (id: string) => {
    if (activeRecords.length <= 1) {
      onClose();
      return;
    }
    setActiveRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAddRecord = (recordToAdd: HearingRecord) => {
    if (!activeRecords.some((r) => r.id === recordToAdd.id)) {
      setActiveRecords((prev) => [...prev, recordToAdd]);
    }
    setShowAddMenu(false);
  };

  // Robust Multi-page PDF Generation using html-to-image & jsPDF
  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    setIsGeneratingPdf(true);
    setNoticeMessage(null);
    setPdfProgress('PDF出力を開始中...');

    try {
      const pageNodes = printAreaRef.current.querySelectorAll<HTMLElement>('.print-page-block');
      if (!pageNodes || pageNodes.length === 0) {
        throw new Error('印刷対象ページが見つかりません');
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = 297; // A4 height in mm
      const marginX = 6;
      const marginY = 6;
      const availableWidth = pdfWidth - marginX * 2; // 198mm
      const availableHeight = pdfHeight - marginY * 2; // 285mm

      for (let i = 0; i < pageNodes.length; i++) {
        setPdfProgress(`ページ ${i + 1} / ${pageNodes.length} を処理中...`);
        if (i > 0) {
          pdf.addPage();
        }

        const pageEl = pageNodes[i];

        let canvas: HTMLCanvasElement;
        try {
          canvas = await toCanvas(pageEl, {
            backgroundColor: '#ffffff',
            pixelRatio: 2,
            skipFonts: true,
            cacheBust: true,
            filter: (node: HTMLElement) => {
              if (
                node.classList &&
                (node.classList.contains('print:hidden') ||
                  node.classList.contains('pdf-exclude'))
              ) {
                return false;
              }
              return true;
            },
          });
        } catch (canvasErr) {
          console.warn(`toCanvas failed on page ${i + 1}, falling back to toPng:`, canvasErr);
          const dataUrl = await toPng(pageEl, {
            backgroundColor: '#ffffff',
            pixelRatio: 2,
            skipFonts: true,
            cacheBust: true,
            filter: (node: HTMLElement) => {
              if (
                node.classList &&
                (node.classList.contains('print:hidden') ||
                  node.classList.contains('pdf-exclude'))
              ) {
                return false;
              }
              return true;
            },
          });
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = dataUrl;
          });
          const tmpCanvas = document.createElement('canvas');
          tmpCanvas.width = img.width;
          tmpCanvas.height = img.height;
          const ctx = tmpCanvas.getContext('2d');
          if (ctx) ctx.drawImage(img, 0, 0);
          canvas = tmpCanvas;
        }

        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
        const finalWidth = imgWidth * scale;
        const finalHeight = imgHeight * scale;

        const posX = marginX + (availableWidth - finalWidth) / 2;
        const posY = marginY;

        pdf.addImage(
          canvas.toDataURL('image/jpeg', 0.96),
          'JPEG',
          posX,
          posY,
          finalWidth,
          finalHeight,
          undefined,
          'FAST'
        );
      }

      const count = activeRecords.length;
      const pageCount = pages.length;
      const safeStoreName = (activeRecords[0]?.storeName || '店舗').replace(/[\\/:*?"<>|]/g, '_');
      const todayStr = new Date().toISOString().slice(0, 10);
      const fileName =
        count > 1
          ? `カルテ帳票一括_${count}件_${pageCount}枚_${todayStr}.pdf`
          : `カルテ帳票_${safeStoreName}_${activeRecords[0]?.id || todayStr}.pdf`;

      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      setPdfDownloadUrl(url);
      setPdfFileName(fileName);

      // Trigger standard reliable anchor download
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          document.body.removeChild(link);
        } catch (_) {}
      }, 1000);

      setNoticeMessage(
        `「${fileName}」（全${count}件 / A4 ${pageCount}枚、1枚に2件掲載）のPDFをダウンロード保存しました。`
      );
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      setNoticeMessage('PDFの生成中にエラーが発生しました。もう一度お試しいただくか、「プリンター印刷」をご利用ください。');
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgress('');
    }
  };

  // Dedicated OS / Browser Printer Dialog Trigger
  const handlePrint = () => {
    setIsPrinting(true);
    setNoticeMessage(null);

    // Strategy 1: Dedicated clean print popup window (Bypasses iframe sandbox and guarantees Windows print dialog appears)
    try {
      const printArea = printAreaRef.current;
      if (printArea) {
        const printWindow = window.open('', '_blank', 'width=960,height=880');
        if (printWindow) {
          const styleSheets = Array.from(
            document.querySelectorAll('style, link[rel="stylesheet"]')
          )
            .map((node) => node.outerHTML)
            .join('\n');

          const printableHtml = printArea.innerHTML;

          printWindow.document.open();
          printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="ja">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>事前調査 電話ヒアリング結果シート印刷 (${activeRecords.length}件)</title>
              ${styleSheets}
              <style>
                @page {
                  size: A4 portrait;
                  margin: 6mm 8mm;
                }
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  box-sizing: border-box;
                }
                html, body {
                  background: #ffffff !important;
                  color: #0f172a !important;
                  margin: 0 !important;
                  padding: 10px !important;
                  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans JP", sans-serif;
                }
                .print\\:hidden,
                .pdf-exclude,
                .no-print {
                  display: none !important;
                }
                .print-page-block {
                  page-break-after: always !important;
                  break-after: page !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  margin-bottom: 24px !important;
                  border: none !important;
                  box-shadow: none !important;
                  background: white !important;
                  min-height: 0 !important;
                }
                .print-page-block:last-child {
                  page-break-after: auto !important;
                  break-after: auto !important;
                  margin-bottom: 0 !important;
                }
                .print-half-sheet {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                @media print {
                  body {
                    padding: 0 !important;
                  }
                  .print-page-block {
                    margin-bottom: 0 !important;
                  }
                }
              </style>
            </head>
            <body>
              <div class="print:hidden" style="background:#f8fafc; padding:10px 16px; border:1px solid #cbd5e1; border-radius:8px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <span style="font-weight:bold; font-size:14px; color:#0f172a;">🖨️ 印刷プレビュー（全${activeRecords.length}件 / A4 ${totalPages}枚）</span>
                  <p style="margin:2px 0 0 0; font-size:11px; color:#64748b;">Windowsの印刷ダイアログを自動で呼び出します。画面が開かない場合は右の青いボタンを押してください。</p>
                </div>
                <div style="display:flex; gap:8px;">
                  <button onclick="window.focus(); window.print();" style="background:#2563eb; color:white; font-weight:bold; padding:8px 16px; border:none; border-radius:6px; cursor:pointer; font-size:13px;">
                    印刷画面を開く (Ctrl+P)
                  </button>
                  <button onclick="window.close();" style="background:#e2e8f0; color:#334155; font-weight:bold; padding:8px 12px; border:none; border-radius:6px; cursor:pointer; font-size:13px;">
                    閉じる
                  </button>
                </div>
              </div>
              <div id="printable-area" style="width: 100%; max-width: 800px; margin: 0 auto;">
                ${printableHtml}
              </div>
              <script>
                window.addEventListener('load', function() {
                  setTimeout(function() {
                    window.focus();
                    window.print();
                  }, 400);
                });
              <\/script>
            </body>
            </html>
          `);
          printWindow.document.close();

          setNoticeMessage('🖨️ 印刷画面を開きました。Windows印刷ダイアログでプリンターを選択してください。');
          setTimeout(() => setNoticeMessage(null), 8000);
          setIsPrinting(false);
          return;
        }
      }
    } catch (popupErr) {
      console.warn('Popup print window failed, trying direct window.print:', popupErr);
    }

    // Strategy 2: Direct window.print() (Fallback for environments without popup window access)
    try {
      window.focus();
      window.print();
      setNoticeMessage('🖨️ Windows印刷画面を呼び出しました。');
      setTimeout(() => setNoticeMessage(null), 8000);
    } catch (directErr) {
      console.error('Direct window.print() failed:', directErr);
      setNoticeMessage('ご利用環境の制限により印刷画面を開けませんでした。「PDFを保存」ボタンからPDFを保存して印刷してください。');
    } finally {
      setIsPrinting(false);
    }
  };

  const unusedRecords = (allAvailableRecords || []).filter(
    (ar) => !activeRecords.some((r) => r.id === ar.id)
  );

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-3 overflow-hidden print-sheet-portal-overlay">
      <div className="bg-white rounded-2xl max-w-5xl w-full h-[96vh] max-h-[940px] flex flex-col shadow-2xl border border-slate-300 overflow-hidden print-sheet-portal-card animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Controls Top Bar (Sticky, Always visible on screen, hidden on print) */}
        <div className="sticky top-0 z-30 shrink-0 px-3 sm:px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shadow-xs print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900">印刷プレビュー・帳票出力</span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>
                {activeRecords.length}件選択中（A4印刷: {totalPages}枚 / {layoutMode === 'two_per_page' ? '1枚2件' : '1枚1件'}）
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Layout Mode Toggle: 2 per page vs 1 per page */}
            <div className="inline-flex items-center p-0.5 bg-slate-200 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLayoutMode('two_per_page')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  layoutMode === 'two_per_page'
                    ? 'bg-white text-blue-700 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="A4縦1枚に2件を上段・下段で掲載（用紙節約・6件なら3枚）"
              >
                1枚に2件（推奨）
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('one_per_page')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  layoutMode === 'one_per_page'
                    ? 'bg-white text-blue-700 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="A4縦1枚に1件ずつ大きく掲載"
              >
                1枚に1件
              </button>
            </div>

            {/* View Mode Toggle: Fit to screen vs full scroll */}
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'fit' ? 'full' : 'fit')}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              title={viewMode === 'fit' ? '原寸大（スクロール表示）に切り替え' : '画面内に全体収容表示に切り替え'}
            >
              {viewMode === 'fit' ? (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>原寸表示</span>
                </>
              ) : (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>全体収容</span>
                </>
              )}
            </button>

            {/* Edit in check sheet button if single record */}
            {activeRecords.length === 1 && onEditRecord && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditRecord(activeRecords[0]);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                title="通話ナビに戻って修正・上書き保存"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>通話ナビで修正</span>
              </button>
            )}

            {/* Direct PDF Generation Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white rounded-lg transition-all shadow-xs cursor-pointer ${
                isGeneratingPdf ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }`}
              title="A4サイズのPDFを生成し保存先を指定してダウンロードします（1枚2件対応）"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{pdfProgress || 'PDF生成中...'}</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>PDFを保存 ({totalPages}枚一括)</span>
                </>
              )}
            </button>

            {/* Direct OS Print Screen Trigger */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer border ${
                isPrinting
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-wait'
                  : 'text-slate-700 bg-white border-slate-300 hover:bg-slate-100'
              }`}
              title="Windowsの印刷画面（プリンター選択）を開きます"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                  <span>印刷起動中...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>プリンター印刷 ({totalPages}枚)</span>
                </>
              )}
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

        {/* Selected Records Pill Bar (Allows removing or seeing what is selected) */}
        <div className="shrink-0 px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto print:hidden">
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-500 font-semibold mr-1">印刷対象店舗 ({activeRecords.length}件):</span>
            {activeRecords.map((r, idx) => (
              <span
                key={r.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 shadow-2xs font-medium"
              >
                <span className="text-slate-400 font-mono text-[10px]">#{idx + 1}</span>
                <span className="font-bold">{r.storeName}</span>
                {activeRecords.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRecord(r.id)}
                    className="text-slate-400 hover:text-rose-600 ml-0.5 p-0.5 rounded hover:bg-slate-100 cursor-pointer"
                    title="この店舗を印刷対象から除外"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>

          {/* Quick Add Dropdown if unused records exist */}
          {unusedRecords.length > 0 && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                title="他のカルテも印刷対象に追加"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>店舗を追加</span>
                <ChevronDown className="w-3 h-3 text-blue-500" />
              </button>

              {showAddMenu && (
                <div className="absolute right-0 top-full mt-1 w-64 max-h-60 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 border-b border-slate-100">
                    追加する店舗を選択
                  </div>
                  {unusedRecords.map((ur) => (
                    <button
                      key={ur.id}
                      type="button"
                      onClick={() => handleAddRecord(ur)}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-900 flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-semibold">{ur.storeName}</span>
                      <span className="text-[10px] text-slate-400">{ur.contactPerson}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* PDF Download Ready Banner */}
        {pdfDownloadUrl && (
          <div className="shrink-0 px-4 py-2 bg-emerald-50 border-b border-emerald-300 flex items-center justify-between text-xs text-emerald-950 print:hidden animate-in fade-in flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>【{pdfFileName}】</strong>のPDFファイルを保存しました（全{activeRecords.length}件 / A4 {totalPages}枚）。
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={pdfDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 font-bold rounded-lg shadow-xs text-xs cursor-pointer transition-colors"
                title="ブラウザのPDFビューワーで開いて印刷・確認"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                <span>PDFを開いて印刷</span>
              </a>
              <a
                href={pdfDownloadUrl}
                download={pdfFileName}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs text-xs cursor-pointer transition-colors"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>再ダウンロード</span>
              </a>
            </div>
          </div>
        )}

        {/* Notice Message if any */}
        {noticeMessage && (
          <div className="shrink-0 px-4 py-1.5 bg-blue-50 border-b border-blue-200 flex items-center gap-2 text-xs text-blue-900 print:hidden">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{noticeMessage}</span>
          </div>
        )}

        {/* Paper Desk Wrapper on Screen */}
        <div
          className={`flex-1 ${
            viewMode === 'fit'
              ? 'overflow-hidden flex items-center justify-center p-2'
              : 'overflow-y-auto p-4 flex flex-col items-center'
          } bg-slate-200/90 print-sheet-desk-wrapper print:bg-transparent print:p-0 print:overflow-visible`}
        >
          {/* Printable Area containing pages */}
          <div
            ref={printAreaRef}
            id="printable-area"
            className={`w-full max-w-[800px] flex flex-col items-center ${
              viewMode === 'fit' ? 'max-h-[calc(90vh-120px)] overflow-y-auto' : 'space-y-6'
            } print:space-y-0 print:max-w-none print:w-full`}
          >
            {pages.map((pageRecords, pageIdx) => {
              const isTwoPerPage = layoutMode === 'two_per_page';

              return (
                <div
                  key={`page-${pageIdx}`}
                  data-page-index={pageIdx}
                  className="print-page-block w-full max-w-[780px] bg-white shadow-xl rounded-sm p-4 sm:p-5 border border-slate-300 text-slate-900 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none box-border"
                  style={{
                    boxSizing: 'border-box',
                    minHeight: isTwoPerPage ? '1060px' : '980px',
                  }}
                >
                  {/* On-screen Page Badge */}
                  <div className="text-[11px] text-slate-500 font-mono mb-2 flex items-center justify-between border-b border-slate-200 pb-1 print:hidden select-none">
                    <span className="font-bold text-slate-700">
                      📄 A4用紙 ページ {pageIdx + 1} / {totalPages}
                    </span>
                    <span className="text-slate-500">
                      {isTwoPerPage
                        ? `1枚に2件掲載（${pageRecords.map((r) => r.storeName).join(' / ')}）`
                        : `1枚に1件掲載（${pageRecords[0]?.storeName}）`}
                    </span>
                  </div>

                  {isTwoPerPage ? (
                    <div className="flex flex-col justify-between h-full space-y-2">
                      {/* Top Sheet: Slot 1 */}
                      <HearingSheetCard
                        record={pageRecords[0]}
                        stores={stores}
                        compact={true}
                        slotLabel={`上段 (#${pageIdx * 2 + 1})`}
                      />

                      {/* Dotted Cut Line Divider */}
                      <div className="flex items-center gap-2 my-1 text-slate-400 print:text-slate-500 select-none">
                        <Scissors className="w-3.5 h-3.5 rotate-90 shrink-0 text-slate-400" />
                        <span className="border-t border-dashed border-slate-300 print:border-slate-400 flex-1"></span>
                        <span className="font-mono text-[9px] print:text-[6.5pt] text-slate-500 bg-slate-50 print:bg-white px-2 py-0.5 rounded border border-slate-200 print:border-slate-300">
                          キリトリ線（A4用紙 1枚2件掲載）
                        </span>
                        <span className="border-t border-dashed border-slate-300 print:border-slate-400 flex-1"></span>
                      </div>

                      {/* Bottom Sheet: Slot 2 (if present) */}
                      {pageRecords[1] ? (
                        <HearingSheetCard
                          record={pageRecords[1]}
                          stores={stores}
                          compact={true}
                          slotLabel={`下段 (#${pageIdx * 2 + 2})`}
                        />
                      ) : (
                        <div className="border border-dashed border-slate-300 rounded-sm p-4 text-center text-slate-400 text-xs flex flex-col items-center justify-center min-h-[140mm] bg-slate-50/50 print:bg-transparent">
                          <span className="font-semibold text-slate-400">（下段余白・奇数件のため空欄）</span>
                          <span className="text-[10px] text-slate-400 mt-1">※メモ用紙・予備欄としてご利用いただけます</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* 1 per page mode */
                    <HearingSheetCard
                      record={pageRecords[0]}
                      stores={stores}
                      compact={false}
                      slotLabel={`#${pageIdx + 1}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Controls Bottom Bar (Sticky at bottom, hidden on print) */}
        <div className="sticky bottom-0 z-30 shrink-0 px-4 sm:px-6 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shadow-xs print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>
              {layoutMode === 'two_per_page' ? (
                <strong>A4用紙 1枚に2件掲載モード（選択{activeRecords.length}件 → A4用紙 {totalPages}枚）</strong>
              ) : (
                <strong>A4用紙 1枚に1件掲載モード（選択{activeRecords.length}件 → A4用紙 {totalPages}枚）</strong>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white rounded-lg transition-all shadow-xs cursor-pointer ${
                isGeneratingPdf ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{pdfProgress || 'PDF生成中...'}</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>PDFを一括保存 ({totalPages}枚)</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>プリンター印刷 ({totalPages}枚)</span>
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
    </div>,
    document.body
  );
};
