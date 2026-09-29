/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Upload,
  X,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ArrowRight,
  Download,
  Search,
  Filter,
  RefreshCw,
  Info,
  Check,
} from 'lucide-react';
import { StoreRecord } from '../types/hearing';

export interface FieldDiff {
  fieldKey: keyof StoreRecord;
  columnLetter: string;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
}

export interface StoreDiffItem {
  storeNo: number;
  storeCode: string;
  storeName: string;
  diffs: FieldDiff[];
  currentRecord: StoreRecord;
  updatedRecord: StoreRecord;
}

export interface DiffReportSummary {
  timestamp: string;
  fileName: string;
  totalCsvRows: number;
  matchedCount: number;
  changedCount: number;
  unchangedCount: number;
  totalFieldsChanged: number;
  unmatchedRowsCount: number;
  items: StoreDiffItem[];
}

interface CsvDiffImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStores: StoreRecord[];
  onApplyDiff: (updatedStores: StoreRecord[]) => Promise<void>;
  existingReport?: DiffReportSummary | null;
  onSaveReport?: (report: DiffReportSummary) => void;
}

const COLUMN_SPECS: { key: keyof StoreRecord; col: string; label: string; aliases: string[] }[] = [
  { key: 'no', col: 'A', label: 'NO', aliases: ['no', '番号', '店舗no'] },
  { key: 'storeCode', col: 'B', label: '店番', aliases: ['店番', '店舗番号', '店舗コード', 'コード'] },
  { key: 'representativePhone', col: 'C', label: '代表番号', aliases: ['代表番号', '代表tel', '内線'] },
  { key: 'storeName', col: 'D', label: '店名', aliases: ['店名', '店舗名'] },
  { key: 'address1', col: 'E', label: '店舗住所1（漢字）', aliases: ['店舗住所1（漢字）', '店舗住所1', '住所1'] },
  { key: 'address2', col: 'F', label: '店舗住所2（漢字）', aliases: ['店舗住所2（漢字）', '店舗住所2', '住所2'] },
  { key: 'buildingName', col: 'G', label: '店舗建物名', aliases: ['店舗建物名', '建物名', 'ビル名'] },
  { key: 'storeMobile', col: 'H', label: '店舗携帯番号', aliases: ['店舗携帯番号', '携帯番号', '電話番号', 'tel'] },
  { key: 'managementType', col: 'I', label: '運営', aliases: ['運営', '運営区分', '形態'] },
  { key: 'remarks1', col: 'J', label: '備考欄1', aliases: ['備考欄1', '備考1', '備考'] },
  { key: 'category', col: 'K', label: 'カテゴリ', aliases: ['カテゴリ', '設置区分', '店舗区分'] },
  { key: 'hasDrawing', col: 'L', label: '図面有無', aliases: ['図面有無', '図面'] },
  { key: 'phoneStatus', col: 'M', label: '電話', aliases: ['電話', '架電', '電話ステータス'] },
  { key: 'surveyAssignee', col: 'N', label: '調査担当', aliases: ['調査担当', '現地調査担当'] },
  { key: 'surveyDate', col: 'O', label: '調査日', aliases: ['調査日', '訪問日', '訪問予定日'] },
  { key: 'surveyDocCollection', col: 'P', label: '調査資料回収', aliases: ['調査資料回収', '資料回収'] },
  { key: 'replacementRequest', col: 'Q', label: '置き換え依頼', aliases: ['置き換え依頼', '切替依頼'] },
  { key: 'itemOrdering', col: 'R', label: '商品手配', aliases: ['商品手配', '部材手配'] },
  { key: 'workAssignee', col: 'S', label: '作業担当', aliases: ['作業担当', '工事担当'] },
  { key: 'scheduleNotice', col: 'T', label: '日程連絡', aliases: ['日程連絡', '日程案内'] },
  { key: 'completion', col: 'U', label: '完了', aliases: ['完了', '完了ステータス'] },
];

export const CsvDiffImportModal: React.FC<CsvDiffImportModalProps> = ({
  isOpen,
  onClose,
  currentStores,
  onApplyDiff,
  existingReport,
  onSaveReport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active diff preview data
  const [activeReport, setActiveReport] = useState<DiffReportSummary | null>(null);
  const [appliedSuccessfully, setAppliedSuccessfully] = useState(false);

  // Filter state
  const [filterMode, setFilterMode] = useState<'changed' | 'all'>('changed');
  const [searchQuery, setSearchQuery] = useState('');
  // User setting: Preserve existing values and default statuses for empty CSV cells
  const [preserveExistingOnEmpty, setPreserveExistingOnEmpty] = useState(true);
  const [cachedRows, setCachedRows] = useState<{ rows: string[][]; fileName: string } | null>(null);

  // If opening with an existing report and no active report, load it in viewing mode
  React.useEffect(() => {
    if (isOpen && existingReport && !activeReport) {
      setActiveReport(existingReport);
      setAppliedSuccessfully(true);
    }
  }, [isOpen, existingReport, activeReport]);

  if (!isOpen) return null;

  // Robust CSV parser supporting quotes & linebreaks
  const parseCsvText = (text: string): string[][] => {
    // Strip BOM if present
    const cleanText = text.replace(/^\uFEFF/, '');
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      const nextChar = cleanText[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\r' || char === '\n') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n
        }
        currentRow.push(currentCell.trim());
        if (currentRow.some((cell) => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
    }

    return rows;
  };

  // Decode array buffer checking for UTF-8 or Shift-JIS (Excel standard)
  const decodeFileBuffer = (buffer: ArrayBuffer): string => {
    // 1. Try UTF-8 with fatal=true
    try {
      const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
      return utf8Decoder.decode(buffer);
    } catch {
      // 2. Fallback to Shift-JIS for Japanese Excel CSVs
      try {
        const sjisDecoder = new TextDecoder('shift-jis', { fatal: false });
        return sjisDecoder.decode(buffer);
      } catch {
        // Fallback to standard utf8
        const fallbackDecoder = new TextDecoder('utf-8');
        return fallbackDecoder.decode(buffer);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleTogglePreserve = (checked: boolean) => {
    setPreserveExistingOnEmpty(checked);
    if (cachedRows) {
      const summary = computeDiffReport(cachedRows.rows, cachedRows.fileName, checked);
      setActiveReport(summary);
    }
  };

  const computeDiffReport = (rows: string[][], fileName: string, preserveEmpty: boolean): DiffReportSummary => {
    // Detect header row
    const headerRow = rows[0];
    const colMapping: Record<keyof StoreRecord, number> = {} as any;

    COLUMN_SPECS.forEach((spec, defaultIdx) => {
      // Search header row by aliases
      const foundIdx = headerRow.findIndex((h) => {
        const cleanH = h.replace(/\s+/g, '').toLowerCase();
        return spec.aliases.some((alias) => cleanH === alias.toLowerCase() || cleanH.includes(alias.toLowerCase()));
      });

      if (foundIdx !== -1) {
        colMapping[spec.key] = foundIdx;
      } else if (defaultIdx < headerRow.length) {
        // Fallback to position index
        colMapping[spec.key] = defaultIdx;
      }
    });

    // Quick lookup map of current stores by no, storeCode, and storeName
    const storesByNo = new Map<number, StoreRecord>();
    const storesByCode = new Map<string, StoreRecord>();
    const storesByName = new Map<string, StoreRecord>();

    currentStores.forEach((s) => {
      storesByNo.set(s.no, s);
      if (s.storeCode) storesByCode.set(s.storeCode.trim(), s);
      if (s.storeName) storesByName.set(s.storeName.trim(), s);
    });

    const items: StoreDiffItem[] = [];
    let matchedCount = 0;
    let unmatchedRowsCount = 0;

    // Process each row
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (row.length === 0 || row.every((c) => !c)) continue;

      const rawNo = colMapping.no !== undefined ? parseInt(row[colMapping.no], 10) : NaN;
      const rawCode = colMapping.storeCode !== undefined ? (row[colMapping.storeCode] || '').trim() : '';
      const rawName = colMapping.storeName !== undefined ? (row[colMapping.storeName] || '').trim() : '';

      // Match existing store
      let currentStore: StoreRecord | undefined;
      if (!isNaN(rawNo) && storesByNo.has(rawNo)) {
        currentStore = storesByNo.get(rawNo);
      } else if (rawCode && storesByCode.has(rawCode)) {
        currentStore = storesByCode.get(rawCode);
      } else if (rawName && storesByName.has(rawName)) {
        currentStore = storesByName.get(rawName);
      }

      if (!currentStore) {
        unmatchedRowsCount++;
        continue;
      }

      matchedCount++;

      // Build updated record and check diffs across all fields
      const updatedRecord: StoreRecord = { ...currentStore };
      const diffs: FieldDiff[] = [];

      COLUMN_SPECS.forEach((spec) => {
        const colIdx = colMapping[spec.key];
        if (colIdx !== undefined && colIdx < row.length) {
          const rawVal = row[colIdx];
          const newVal = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
          const oldVal = (currentStore as any)[spec.key] !== undefined && (currentStore as any)[spec.key] !== null
            ? String((currentStore as any)[spec.key]).trim()
            : '';

          if (spec.key === 'no') {
            // NO does not change
            return;
          }

          // Fallback for status columns when CSV has blank/empty cell
          // P: 調査資料回収, Q: 置き換え依頼, R: 商品手配, M: 電話, T: 日程連絡, U: 完了
          const DEFAULT_FALLBACK_MAP: Partial<Record<keyof StoreRecord, string>> = {
            surveyDocCollection: '未回収',
            replacementRequest: '未依頼',
            itemOrdering: '未手配',
            phoneStatus: '未架電',
            scheduleNotice: '未連絡',
            completion: '未完了',
            category: currentStore.category || '未設定',
          };

          let resolvedNewVal = newVal;

          // ユーザー指示対応：
          // 「インポートCSVの空欄を空欄にしないでください」
          // 「現在入っている表示はそのままで、文字が入れば上書き対象」
          // 「例P: 調査資料回収→空欄（空欄にせずに"未回収"のまま）
          // 　Q: 置き換え依頼→空欄（空欄にせずに"未依頼"のまま）
          // 　R: 商品手配→空欄（空欄にせずに"未手配"のまま）」
          if (preserveEmpty && resolvedNewVal === '') {
            // CSV側が空欄の場合：
            // 既存値が入っていればそのまま維持し、空欄で上書き消去しない
            // 既存値が未設定の場合のみデフォルト値（未回収・未手配等）を設定
            resolvedNewVal = oldVal || DEFAULT_FALLBACK_MAP[spec.key] || '';
          } else if (resolvedNewVal === '' && DEFAULT_FALLBACK_MAP[spec.key] !== undefined) {
            resolvedNewVal = DEFAULT_FALLBACK_MAP[spec.key]!;
          }

          // 比較：文字が入っていれば（resolvedNewVal !== oldVal）上書き対象
          if (resolvedNewVal !== oldVal) {
            diffs.push({
              fieldKey: spec.key,
              columnLetter: spec.col,
              fieldLabel: `${spec.col}: ${spec.label}`,
              oldValue: oldVal,
              newValue: resolvedNewVal,
            });
            (updatedRecord as any)[spec.key] = resolvedNewVal;
          }
        }
      });

      items.push({
        storeNo: currentStore.no,
        storeCode: currentStore.storeCode,
        storeName: currentStore.storeName,
        diffs,
        currentRecord: currentStore,
        updatedRecord,
      });
    }

    const changedCount = items.filter((item) => item.diffs.length > 0).length;
    const totalFieldsChanged = items.reduce((acc, item) => acc + item.diffs.length, 0);

    return {
      timestamp: new Date().toLocaleString('ja-JP'),
      fileName,
      totalCsvRows: rows.length - 1,
      matchedCount,
      changedCount,
      unchangedCount: matchedCount - changedCount,
      totalFieldsChanged,
      unmatchedRowsCount,
      items,
    };
  };

  const processFile = async (file: File) => {
    setErrorMessage(null);
    setIsProcessing(true);
    setAppliedSuccessfully(false);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const csvText = decodeFileBuffer(arrayBuffer);
      const rows = parseCsvText(csvText);

      if (rows.length < 2) {
        throw new Error('CSVファイルにデータ行が含まれていません（ヘッダー行＋1行以上必要です）');
      }

      setCachedRows({ rows, fileName: file.name });
      const summary = computeDiffReport(rows, file.name, preserveExistingOnEmpty);
      setActiveReport(summary);
    } catch (err: any) {
      console.error('CSV Parsing Error:', err);
      setErrorMessage(err.message || 'CSVの解析中にエラーが発生しました。ファイル形式をご確認ください。');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleApplyChanges = async () => {
    if (!activeReport || activeReport.changedCount === 0) return;

    setIsApplying(true);
    try {
      // Gather all updated records
      const changedRecords = activeReport.items
        .filter((item) => item.diffs.length > 0)
        .map((item) => item.updatedRecord);

      await onApplyDiff(changedRecords);

      setAppliedSuccessfully(true);
      if (onSaveReport) {
        onSaveReport(activeReport);
      }
    } catch (err: any) {
      console.error('Failed to apply diff:', err);
      setErrorMessage('差分データの保存・同期中にエラーが発生しました: ' + (err.message || ''));
    } finally {
      setIsApplying(false);
    }
  };

  // Download diff audit log as CSV
  const handleDownloadDiffReportCSV = () => {
    if (!activeReport) return;

    const headers = ['更新日時', 'ファイル名', '店舗NO', '店番', '店名', '列記号', '項目名', '変更前', '変更後'];
    const rows: string[][] = [];

    activeReport.items.forEach((item) => {
      item.diffs.forEach((d) => {
        rows.push([
          `"${activeReport.timestamp}"`,
          `"${activeReport.fileName}"`,
          `"${item.storeNo}"`,
          `"${item.storeCode}"`,
          `"${item.storeName}"`,
          `"${d.columnLetter}"`,
          `"${d.fieldLabel}"`,
          `"${d.oldValue.replace(/"/g, '""')}"`,
          `"${d.newValue.replace(/"/g, '""')}"`,
        ]);
      });
    });

    if (rows.length === 0) {
      rows.push([`"${activeReport.timestamp}"`, `"${activeReport.fileName}"`, '-', '-', '差分なし', '-', '-', '-', '-']);
    }

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `台帳差分更新レポート_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered list of diff items
  const filteredItems = (activeReport?.items || []).filter((item) => {
    if (filterMode === 'changed' && item.diffs.length === 0) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchBasic =
        item.storeName.toLowerCase().includes(q) ||
        item.storeCode.toLowerCase().includes(q) ||
        String(item.storeNo).includes(q);
      const matchDiff = item.diffs.some(
        (d) =>
          d.fieldLabel.toLowerCase().includes(q) ||
          d.oldValue.toLowerCase().includes(q) ||
          d.newValue.toLowerCase().includes(q)
      );
      if (!matchBasic && !matchDiff) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                <span>Excel・CSV 差分インポート & 上書き同期</span>
                <span className="text-xs bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded font-normal border border-blue-400/30">
                  A〜U列対応
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                外部Excelで編集したCSVを取り込み、差分項目のみを特定してプレビュー・上書き更新します。
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* File Upload / Re-upload Area */}
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-5 text-center hover:border-blue-500 hover:bg-blue-50/20 transition-all">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,text/csv"
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="p-3 bg-white rounded-full shadow-xs border border-slate-200 text-blue-600">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-slate-800">
                Excelで保存したCSVファイルを選択またはドラッグ＆ドロップ
              </div>
              <p className="text-xs text-slate-500 max-w-lg leading-relaxed">
                ※ Shift-JIS / UTF-8 両対応。店舗NOまたは店番をキーに自動照合し、変更箇所を抽出します。<br />
                <span className="text-blue-700 font-medium">※ P:資料回収・Q:置き換え・R:商品手配・M:電話等の空欄は空欄化せず「未回収/未手配等」のステータスを維持します。</span>
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing || isApplying}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>{activeReport ? '別のCSVファイルを選択する' : 'CSVファイルを選択'}</span>
                </button>
                {activeReport && (
                  <button
                    type="button"
                    onClick={handleDownloadDiffReportCSV}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>差分レポートCSV出力</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* User Option: Preserve Existing on CSV Blank Cells */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <label className="flex items-center gap-2.5 cursor-pointer font-bold text-slate-800 select-none">
              <input
                type="checkbox"
                checked={preserveExistingOnEmpty}
                onChange={(e) => handleTogglePreserve(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>CSVの空欄セルは空欄にせず、現在の値・初期ステータス（P:未回収 / Q:未依頼 / R:未手配 等）のまま維持する</span>
            </label>
            <span className="text-[11px] font-semibold text-blue-700 whitespace-nowrap bg-blue-100/60 px-2 py-0.5 rounded">
              ※文字が入力されている項目のみ上書き対象
            </span>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">インポートエラー</div>
                <div className="mt-0.5">{errorMessage}</div>
              </div>
            </div>
          )}

          {/* Success Banner when applied */}
          {appliedSuccessfully && activeReport && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-start gap-3 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-sm">差分の上書き同期が完了しました！</div>
                <div className="text-xs text-emerald-800 mt-1">
                  対象 <strong>{activeReport.changedCount}店舗</strong>（合計 <strong>{activeReport.totalFieldsChanged}箇所</strong>の項目）を台帳およびCloud Firestoreへ正常に上書き保存しました。
                </div>
              </div>
              <button
                onClick={handleDownloadDiffReportCSV}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100/60 rounded-lg shadow-2xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>監査レポートCSV保存</span>
              </button>
            </div>
          )}

          {/* Diff Summary Cards */}
          {activeReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[11px] font-semibold text-slate-500">CSV読み込み</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5 truncate" title={activeReport.fileName}>
                    {activeReport.fileName}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{activeReport.totalCsvRows} 行のデータ</div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="text-[11px] font-semibold text-blue-700">台帳照合一致</div>
                  <div className="text-lg font-bold text-blue-900 mt-0.5">
                    {activeReport.matchedCount} <span className="text-xs font-normal">店舗</span>
                  </div>
                  <div className="text-[10px] text-blue-600 mt-0.5">
                    {activeReport.unmatchedRowsCount > 0 ? `※不一致: ${activeReport.unmatchedRowsCount}件` : '全店舗照合完了'}
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${activeReport.changedCount > 0 ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[11px] font-semibold text-amber-800">差分あり（上書き対象）</div>
                  <div className="text-lg font-bold text-amber-900 mt-0.5">
                    {activeReport.changedCount} <span className="text-xs font-normal">店舗</span>
                  </div>
                  <div className="text-[10px] text-amber-700 mt-0.5">
                    変更項目数: <strong>{activeReport.totalFieldsChanged}</strong> 箇所
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="text-[11px] font-semibold text-emerald-700">差分なし（一致）</div>
                  <div className="text-lg font-bold text-emerald-900 mt-0.5">
                    {activeReport.unchangedCount} <span className="text-xs font-normal">店舗</span>
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">既存データと完全に同値</div>
                </div>
              </div>

              {/* Diff Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">表示対象:</span>
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setFilterMode('changed')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        filterMode === 'changed'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      差分あり店舗のみ ({activeReport.changedCount}件)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode('all')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        filterMode === 'all'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      全店舗 ({activeReport.matchedCount}件)
                    </button>
                  </div>
                </div>

                <div className="relative min-w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="店舗名・店番・変更項目で絞り込み..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Diff Details Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200 font-semibold z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-16 text-center">NO</th>
                        <th className="py-2.5 px-3 w-24">店番</th>
                        <th className="py-2.5 px-3 w-44">店舗名</th>
                        <th className="py-2.5 px-3 w-28 text-center">差分状態</th>
                        <th className="py-2.5 px-3">変更内容（変更前 ➔ 変更後）</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            {filterMode === 'changed'
                              ? '変更差分のある店舗はありません（すべての項目が台帳と同一です）'
                              : '条件に一致する店舗がありません'}
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((item) => {
                          const hasDiff = item.diffs.length > 0;
                          return (
                            <tr
                              key={item.storeNo}
                              className={`transition-colors ${hasDiff ? 'hover:bg-amber-50/50' : 'hover:bg-slate-50'}`}
                            >
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                                {item.storeNo}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">
                                {item.storeCode}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                {item.storeName}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {hasDiff ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>{item.diffs.length}項目変更</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                                    <Check className="w-3 h-3 text-slate-400" />
                                    <span>変更なし</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                {hasDiff ? (
                                  <div className="space-y-1.5">
                                    {item.diffs.map((d, dIdx) => (
                                      <div
                                        key={dIdx}
                                        className="flex flex-wrap items-center gap-1.5 text-[11px] bg-slate-50 p-1.5 rounded border border-slate-200"
                                      >
                                        <span className="font-bold text-blue-900 bg-blue-100/70 px-1.5 py-0.5 rounded text-[10px]">
                                          {d.fieldLabel}
                                        </span>
                                        <span className="text-slate-500 line-through bg-rose-50 text-rose-800 px-1.5 py-0.5 rounded border border-rose-100">
                                          {d.oldValue || '(空欄)'}
                                        </span>
                                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="font-bold text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                          {d.newValue || '(空欄)'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-xs">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {activeReport ? (
              <span>
                照合済み: <strong>{activeReport.matchedCount}</strong> 店舗中、
                <strong className="text-amber-700"> {activeReport.changedCount}</strong> 店舗に更新差分あり
              </span>
            ) : (
              <span>CSVファイルを選択してください</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
            >
              閉じる
            </button>

            {activeReport && activeReport.changedCount > 0 && !appliedSuccessfully && (
              <button
                type="button"
                onClick={handleApplyChanges}
                disabled={isApplying}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
              >
                {isApplying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Firestoreへ上書き保存中...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>この差分（{activeReport.changedCount}店舗）を台帳に上書き更新</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
