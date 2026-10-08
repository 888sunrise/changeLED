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
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { HearingRecord } from '../types/hearing';

interface PrintSheetModalProps {
  record: HearingRecord | null;
  onClose: () => void;
  onEditRecord?: (record: HearingRecord) => void;
}

export const PrintSheetModal: React.FC<PrintSheetModalProps> = ({ record, onClose, onEditRecord }) => {
  if (!record) return null;

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'fit' | 'full'>('fit');
  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.add('print-sheet-modal-open');
    return () => {
      document.body.classList.remove('print-sheet-modal-open');
      if (pdfDownloadUrl) {
        URL.revokeObjectURL(pdfDownloadUrl);
      }
    };
  }, [pdfDownloadUrl]);

  // Robust PDF Generation & Direct Save Dialog
  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    setIsGeneratingPdf(true);
    setNoticeMessage(null);

    try {
      const element = printAreaRef.current;

      // Use html2canvas to capture the entire sheet element from top to bottom
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: 800,
        onclone: (clonedDoc) => {
          const target = clonedDoc.getElementById('printable-area');
          if (target) {
            target.style.transform = 'none';
            target.style.maxHeight = 'none';
            target.style.height = 'auto';
            target.style.overflow = 'visible';
          }
        },
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = 297; // A4 height in mm
      const marginX = 8;
      const marginY = 8;
      const availableWidth = pdfWidth - marginX * 2; // 194mm
      const availableHeight = pdfHeight - marginY * 2; // 281mm

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Scale proportionally so BOTH width AND height fit 100% within the A4 page without clipping
      const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
      const finalWidth = imgWidth * scale;
      const finalHeight = imgHeight * scale;

      // Center horizontally, start comfortably from top margin so bottom stamps are never clipped
      const posX = marginX + (availableWidth - finalWidth) / 2;
      const posY = marginY;

      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.98),
        'JPEG',
        posX,
        posY,
        finalWidth,
        finalHeight,
        undefined,
        'FAST'
      );

      const safeStoreName = (record.storeName || '店舗').replace(/[\\/:*?"<>|]/g, '_');
      const safeDate = (record.timestamp || '').split(' ')[0].replace(/[/:]/g, '-');
      const fileName = `カルテ帳票_${safeStoreName}_${record.id || safeDate}.pdf`;

      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      setPdfDownloadUrl(url);
      setPdfFileName(fileName);

      // Method 1: Native Windows File System Access API "Save As" (名前を付けて保存) Dialog
      let savedViaPicker = false;
      if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
        try {
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: 'PDF ドキュメント (*.pdf)',
                accept: { 'application/pdf': ['.pdf'] },
              },
            ],
          });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          savedViaPicker = true;
          setNoticeMessage(`「${fileName}」を指定の場所に保存しました。下部の押印枠まで完全に収録されています。`);
          setTimeout(() => setNoticeMessage(null), 6000);
          return;
        } catch (pickerErr: any) {
          if (pickerErr.name === 'AbortError') {
            return;
          }
          console.warn('showSaveFilePicker not supported/permitted in this context, falling back:', pickerErr);
        }
      }

      // Method 2: Standard download fallback
      if (!savedViaPicker) {
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
        }, 500);

        setNoticeMessage(
          `「${fileName}」を出力・ダウンロードしました（最下部の押印枠までA4縦1枚に完全収録）。`
        );
      }
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      setNoticeMessage('PDFの生成中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Direct Browser Print Trigger with error handling
  const handlePrint = () => {
    try {
      window.focus();
      window.print();
    } catch (err) {
      console.warn('window.print() error:', err);
      setNoticeMessage(
        'ご利用環境（iframe等）のセキュリティ制限によりWindows印刷画面を開けませんでした。「PDFを保存」ボタンからPDFを出力してください。'
      );
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-3 overflow-hidden print-sheet-portal-overlay">
      <div className="bg-white rounded-2xl max-w-4xl w-full h-[96vh] max-h-[920px] flex flex-col shadow-2xl border border-slate-300 overflow-hidden print-sheet-portal-card animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Controls Top Bar (Sticky, Always visible on screen, hidden on print) */}
        <div className="sticky top-0 z-30 shrink-0 px-4 sm:px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shadow-xs print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900">印刷プレビュー・帳票出力</span>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              【{record.storeName}】（A4縦1枚・全項目収録）
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle: Fit to screen vs 100% */}
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'fit' ? 'full' : 'fit')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
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

            {/* Direct PDF Generation Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white rounded-lg transition-all shadow-xs cursor-pointer ${
                isGeneratingPdf ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }`}
              title="A4サイズのPDFを生成し保存先を指定してダウンロードします（下部押印枠まで完全収録）"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>PDF生成中...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>PDFを保存</span>
                </>
              )}
            </button>

            {/* Direct OS Print Screen Trigger */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Windowsの印刷画面（プリンター選択）を開きます"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>プリンター印刷</span>
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

        {/* PDF Download Ready Banner */}
        {pdfDownloadUrl && (
          <div className="shrink-0 px-4 py-2 bg-emerald-50 border-b border-emerald-300 flex items-center justify-between text-xs text-emerald-950 print:hidden animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>【{pdfFileName}】</strong>のPDFファイルを生成しました（下部押印枠まで完全収録）。
              </span>
            </div>
            <a
              href={pdfDownloadUrl}
              download={pdfFileName}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs text-xs cursor-pointer transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>保存先を指定して再ダウンロード</span>
            </a>
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
            viewMode === 'fit' ? 'overflow-hidden flex items-center justify-center p-2' : 'overflow-y-auto p-4 flex justify-center items-start'
          } bg-slate-200/90 print-sheet-desk-wrapper print:bg-transparent print:p-0 print:overflow-visible`}
        >
          {/* Printable A4 Sheet Content (Calibrated compact height so 100% fits on screen & on A4 without any cut off) */}
          <div
            ref={printAreaRef}
            className={`w-full max-w-[740px] bg-white shadow-xl rounded-sm p-4 sm:p-5 border border-slate-300 text-slate-900 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print-sheet-content ${
              viewMode === 'fit'
                ? 'max-h-[calc(92vh-110px)] flex flex-col justify-between overflow-y-auto'
                : 'space-y-2 sm:space-y-2.5'
            }`}
            id="printable-area"
            style={{
              boxSizing: 'border-box',
            }}
          >
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-1.5 print:pb-1 flex items-start justify-between">
              <div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 print:text-[12pt] leading-tight">
                  蛍光灯→LED切替 事前調査 電話ヒアリング結果シート
                </h1>
                <div className="text-[10px] print:text-[7.5pt] text-slate-500 mt-0.5">
                  LED照明更新プロジェクト・現場調査手配用カルテ（A4縦1枚保管用）
                </div>
              </div>
              <div className="text-right text-[11px] print:text-[7.5pt] font-mono leading-tight space-y-0.5">
                <div>記録ID: {record.id}</div>
                {(() => {
                  const match = (record.timestamp || '').match(/^(.*?)\s*\((修正|更新):\s*(.*?)\)$/);
                  if (match) {
                    return (
                      <div className="leading-tight">
                        <div>受付日時: {match[1]}</div>
                        <div className="text-[9.5px] print:text-[7pt] text-amber-700 font-sans font-semibold">
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

            {/* Section 1: Store Info */}
            <div className="my-1.5 print:my-1">
              <div className="flex items-center gap-1.5 text-xs print:text-[8.5pt] font-bold text-slate-900 mb-0.5">
                <span className="w-1.5 h-3 bg-slate-900 inline-block rounded-2xs"></span>
                <span>1. 対象店舗・対応者情報</span>
              </div>
              <table className="w-full text-xs print:text-[8pt] border border-slate-300 border-collapse">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <th className="w-24 sm:w-28 py-1 px-2 bg-slate-50 text-left font-semibold text-slate-600">店舗名</th>
                    <td className="py-1 px-2 font-bold text-slate-900">{record.storeName}</td>
                    <th className="w-20 sm:w-24 py-1 px-2 bg-slate-50 text-left font-semibold text-slate-600">店舗ID</th>
                    <td className="py-1 px-2 font-mono text-slate-800">{record.storeId || '-'}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <th className="py-1 px-2 bg-slate-50 text-left font-semibold text-slate-600">対応者氏名</th>
                    <td className="py-1 px-2 text-slate-900">
                      {record.contactPerson} 様（{record.contactRole || '店長'}）
                    </td>
                    <th className="py-1 px-2 bg-slate-50 text-left font-semibold text-slate-600">電話番号</th>
                    <td className="py-1 px-2 font-mono text-slate-800">{record.phoneNumber || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 2: LED Status & Verdict */}
            <div className="my-1.5 print:my-1">
              <div className="flex items-center gap-1.5 text-xs print:text-[8.5pt] font-bold text-slate-900 mb-0.5">
                <span className="w-1.5 h-3 bg-slate-900 inline-block rounded-2xs"></span>
                <span>2. LED化状況確認 & 訪問調査要否判定</span>
              </div>
              <div className="border border-slate-300 p-1.5 space-y-1 rounded-2xs">
                <div className="flex items-center gap-3 text-xs print:text-[8pt]">
                  <span className="font-semibold text-slate-700">店舗内LED化状況:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-xs print:text-[8pt] ${
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
                    <span className="text-slate-600 text-xs">（残存エリア: {record.partialAreas}）</span>
                  )}
                </div>

                {/* Requirement Result */}
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
                    <span className="text-xs print:text-[8.5pt] font-bold">
                      判定結果：
                      {record.surveyRequirement === 'not_required'
                        ? '【訪問調査 不要（案件終了）】'
                        : '【訪問調査 必要（技術員派遣）】'}
                    </span>
                  </div>
                  <span className="text-xs print:text-[7.5pt] font-semibold text-slate-600">
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
                <div className="my-1.5 print:my-1">
                  <div className="flex items-center gap-1.5 text-xs print:text-[8.5pt] font-bold text-slate-900 mb-0.5">
                    <span className="w-1.5 h-3 bg-slate-900 inline-block rounded-2xs"></span>
                    <span>3. 設置場所区分 & 訪問日程調整</span>
                  </div>
                  <table className="w-full text-xs print:text-[8pt] border border-slate-300 border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <th className="w-24 sm:w-28 py-1 px-2 bg-slate-50 text-left font-semibold text-slate-600">
                          設置場所区分
                        </th>
                        <td colSpan={3} className="py-1 px-2 font-bold text-slate-900">
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
                        <th className="py-1 px-2 bg-slate-50 text-left font-semibold text-slate-600">訪問予定期間</th>
                        <td className="py-1 px-2 font-bold text-blue-900">
                          {record.visitPeriodStart && record.visitPeriodEnd
                            ? `${record.visitPeriodStart} 〜 ${record.visitPeriodEnd}`
                            : record.preferredDate1 && record.preferredDate2
                            ? `${record.preferredDate1} 〜 ${record.preferredDate2}`
                            : record.preferredDate1 || '未定'}
                        </td>
                        <th className="w-20 sm:w-24 py-1 px-2 bg-slate-50 text-left font-semibold text-slate-600">希望時間帯</th>
                        <td className="py-1 px-2 text-slate-900">
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
                        <th className="py-1 px-2 bg-slate-50 text-left font-semibold text-slate-600">希望作業時間帯</th>
                        <td colSpan={3} className="py-1 px-2 text-slate-900">
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
                  <div className="my-1.5 print:my-1">
                    <div className="flex items-center gap-1.5 text-xs print:text-[8.5pt] font-bold text-amber-900 mb-0.5">
                      <span className="w-1.5 h-3 bg-amber-600 inline-block rounded-2xs"></span>
                      <Key className="w-3 h-3 text-amber-700" />
                      <span>4. 【条件発動】営業終了後作業の戸締り・鍵預かり手順</span>
                    </div>
                    <table className="w-full text-xs print:text-[8pt] border border-amber-300 border-collapse">
                      <tbody>
                        <tr className="border-b border-slate-200">
                          <th className="w-24 sm:w-28 py-1 px-2 bg-amber-50 text-left font-semibold text-amber-950">
                            鍵預かり可否
                          </th>
                          <td className="py-1 px-2 font-bold">
                            {record.keyCustody === 'possible'
                              ? '預かり可能（キーボックス等の預託）'
                              : record.keyCustody === 'not_possible'
                              ? '預かり不可（スタッフ様立ち会い必須）'
                              : 'その他・警備会社対応'}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <th className="py-1 px-2 bg-amber-50 text-left font-semibold text-amber-950">
                            施錠・返却手順
                          </th>
                          <td className="py-1 px-2 leading-tight text-slate-800">
                            {record.lockProcedure || '特記事項なし'}
                          </td>
                        </tr>
                        <tr>
                          <th className="py-1 px-2 bg-amber-50 text-left font-semibold text-amber-950">
                            緊急連絡先
                          </th>
                          <td className="py-1 px-2 font-mono text-slate-800">
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
            <div className="my-1.5 print:my-1">
              <div className="flex items-center gap-1.5 text-xs print:text-[8.5pt] font-bold text-slate-900 mb-0.5">
                <span className="w-1.5 h-3 bg-slate-900 inline-block rounded-2xs"></span>
                <span>特記事項・引継ぎ連絡メモ</span>
              </div>
              <div className="border border-slate-300 p-1.5 min-h-[38px] print:min-h-[30px] text-xs print:text-[8pt] text-slate-700 whitespace-pre-wrap leading-tight rounded-2xs">
                {record.notes || '特になし'}
              </div>
            </div>

            {/* Footer Signatures (Always visible in preview and completely captured in PDF) */}
            <div className="mt-2 pt-1.5 border-t-2 border-slate-300 grid grid-cols-3 gap-2 sm:gap-3 text-center text-xs print:text-[8pt] shrink-0">
              <div className="border border-slate-300 p-1 rounded bg-slate-50/50">
                <div className="text-slate-500 mb-0.5 text-[10px] print:text-[7pt]">受付オペレーター印</div>
                <div className="font-bold text-xs sm:text-sm print:text-[8pt] py-0.5 text-slate-900">
                  {record.operatorName}
                </div>
              </div>
              <div className="border border-slate-300 p-1 rounded bg-slate-50/50">
                <div className="text-slate-500 mb-0.5 text-[10px] print:text-[7pt]">調査員アサイン確認</div>
                <div className="text-slate-400 text-xs sm:text-sm print:text-[8pt] py-0.5">承認印</div>
              </div>
              <div className="border border-slate-300 p-1 rounded bg-slate-50/50">
                <div className="text-slate-500 mb-0.5 text-[10px] print:text-[7pt]">本部管理簿記入</div>
                <div className="text-slate-400 text-xs sm:text-sm print:text-[8pt] py-0.5">完了印</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Controls Bottom Bar (Sticky at bottom, hidden on print) */}
        <div className="sticky bottom-0 z-30 shrink-0 px-4 sm:px-6 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shadow-xs print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>A4縦1枚形式（最下部の印鑑枠まで100%全域収録）</span>
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
                  <span>PDF生成中...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>PDFを保存</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>プリンター印刷</span>
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
