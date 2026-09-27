/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Table,
  Lock,
  Edit3,
  PhoneCall,
  Search,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Save,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  Building,
  Store,
  Car,
} from 'lucide-react';
import { StoreRecord } from '../types/hearing';

interface StoreLedgerTableProps {
  records: StoreRecord[];
  onUpdateRecord: (updated: StoreRecord) => void;
  onSelectStoreForCall: (store: StoreRecord) => void;
  onResetDefaults?: () => void;
}

export const StoreLedgerTable: React.FC<StoreLedgerTableProps> = ({
  records,
  onUpdateRecord,
  onSelectStoreForCall,
  onResetDefaults,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPhoneStatus, setFilterPhoneStatus] = useState<string>('all');
  const [filterCompletion, setFilterCompletion] = useState<string>('all');
  const [editingStoreNo, setEditingStoreNo] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<StoreRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter logic
  const filteredRecords = records.filter((r) => {
    if (filterCategory !== 'all' && r.category !== filterCategory) return false;
    if (filterPhoneStatus !== 'all' && r.phoneStatus !== filterPhoneStatus) return false;
    if (filterCompletion !== 'all' && r.completion !== filterCompletion) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.storeName.toLowerCase().includes(q) ||
      r.storeCode.toLowerCase().includes(q) ||
      r.representativePhone.toLowerCase().includes(q) ||
      r.address1.toLowerCase().includes(q) ||
      r.address2.toLowerCase().includes(q) ||
      r.storeMobile.toLowerCase().includes(q) ||
      r.remarks1.toLowerCase().includes(q) ||
      r.surveyAssignee.toLowerCase().includes(q) ||
      r.workAssignee.toLowerCase().includes(q)
    );
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Inline Quick Change for J〜T columns
  const handleQuickChange = (storeNo: number, field: keyof StoreRecord, value: any) => {
    const target = records.find((r) => r.no === storeNo);
    if (!target) return;
    const updated = { ...target, [field]: value };
    onUpdateRecord(updated);
    showToast(`NO.${storeNo} ${target.storeName} の「${fieldLabel(field)}」を更新しました`);
  };

  // Open modal/panel edit
  const handleStartEdit = (record: StoreRecord) => {
    setEditingStoreNo(record.no);
    setEditFormData({ ...record });
  };

  const handleSaveModal = () => {
    if (!editFormData) return;
    onUpdateRecord(editFormData);
    showToast(`NO.${editFormData.no} ${editFormData.storeName} の内容を保存しました`);
    setEditingStoreNo(null);
    setEditFormData(null);
  };

  // Export CSV exactly in format A〜T
  const handleExportCSV = () => {
    const headers = [
      'NO',
      '店番',
      '代表番号',
      '店名',
      '店舗住所1（漢字）',
      '店舗住所2（漢字）',
      '店舗建物名',
      '店舗携帯番号',
      '運営',
      '備考欄1',
      'カテゴリ',
      '電話',
      '調査担当',
      '調査日',
      '調査資料回収',
      '置き換え依頼',
      '商品手配',
      '作業担当',
      '日程連絡',
      '完了',
    ];

    const rows = filteredRecords.map((r) => [
      r.no,
      `"${r.storeCode}"`,
      `"${r.representativePhone}"`,
      `"${r.storeName}"`,
      `"${r.address1}"`,
      `"${r.address2}"`,
      `"${r.buildingName}"`,
      `"${r.storeMobile}"`,
      `"${r.managementType}"`,
      `"${(r.remarks1 || '').replace(/"/g, '""')}"`,
      `"${r.category}"`,
      `"${r.phoneStatus}"`,
      `"${r.surveyAssignee}"`,
      `"${r.surveyDate}"`,
      `"${r.surveyDocCollection}"`,
      `"${r.replacementRequest}"`,
      `"${r.itemOrdering}"`,
      `"${r.workAssignee}"`,
      `"${r.scheduleNotice}"`,
      `"${r.completion}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LED切替調査台帳_A-T列_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fieldLabel = (f: keyof StoreRecord): string => {
    const map: Record<string, string> = {
      remarks1: '備考欄1',
      category: 'カテゴリ',
      phoneStatus: '電話',
      surveyAssignee: '調査担当',
      surveyDate: '調査日',
      surveyDocCollection: '調査資料回収',
      replacementRequest: '置き換え依頼',
      itemOrdering: '商品手配',
      workAssignee: '作業担当',
      scheduleNotice: '日程連絡',
      completion: '完了',
    };
    return map[f] || String(f);
  };

  // Quick stats
  const totalStores = records.length;
  const completedCount = records.filter((r) => r.completion === '完了').length;
  const phonedCount = records.filter((r) => r.phoneStatus === '完了').length;

  return (
    <div className="space-y-5 pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner / Summary KPIs */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900">
                店舗調査・進捗管理台帳（A〜T列 統合CRM）
              </span>
              <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                27店舗マスタ連動
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              <strong>A〜I列（薄グレー背景）</strong>はマスタ情報のため<span className="text-rose-600 font-semibold">入力禁止（閲覧・架電専用）</span>、
              <strong>J〜T列（白背景）</strong>はヒアリング後の<span className="text-blue-700 font-semibold">インライン編集・選択入力</span>が可能です。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-slate-500">全体進捗:</span>
              <span className="font-bold text-slate-900">{totalStores}店舗</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">架電完了:</span>
              <span className="font-bold text-blue-600">{phonedCount}件</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">全工程完了:</span>
              <span className="font-bold text-emerald-600">{completedCount}件</span>
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 shadow-xs whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>A〜T列 CSV出力</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500">カテゴリ(K):</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
            >
              <option value="all">すべて</option>
              <option value="ビルイン">ビルイン</option>
              <option value="フードコート">フードコート</option>
              <option value="フリスタ">フリスタ</option>
              <option value="未設定">未設定</option>
            </select>
          </div>

          {/* Phone Status Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500">電話(L):</span>
            <select
              value={filterPhoneStatus}
              onChange={(e) => setFilterPhoneStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
            >
              <option value="all">すべて</option>
              <option value="未架電">未架電</option>
              <option value="完了">完了</option>
              <option value="不在/再架電">不在/再架電</option>
              <option value="通話中">通話中</option>
            </select>
          </div>

          {/* Completion Status Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500">完了(T):</span>
            <select
              value={filterCompletion}
              onChange={(e) => setFilterCompletion(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
            >
              <option value="all">すべて</option>
              <option value="未完了">未完了</option>
              <option value="完了">完了</option>
              <option value="保留">保留</option>
            </select>
          </div>
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="店番、店名、住所、電話、担当者等で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all"
          />
        </div>
      </div>

      {/* Main Table: Full Column Matrix A〜T */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[640px]">
          <table className="w-full text-left text-xs border-collapse">
            {/* Table Header: Divided into A-I (Locked) and J-T (Editable) */}
            <thead className="sticky top-0 z-20 shadow-xs">
              {/* Group Super Header */}
              <tr className="text-[11px] font-bold border-b border-slate-200 text-slate-700">
                <th colSpan={10} className="bg-slate-100/95 py-2 px-3 border-r-2 border-slate-300">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>【A〜I列：マスタ情報（入力禁止・閲覧専用）】</span>
                  </div>
                </th>
                <th colSpan={11} className="bg-blue-50/95 py-2 px-3">
                  <div className="flex items-center gap-1.5 text-blue-800">
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    <span>【J〜T列：ヒアリング・調査進捗入力（入力および選択方式）】</span>
                  </div>
                </th>
              </tr>

              {/* Column Individual Headers */}
              <tr className="border-b border-slate-200 divide-x divide-slate-200">
                {/* A to I */}
                <th className="py-2.5 px-3 bg-slate-100 font-bold text-slate-700 whitespace-nowrap text-center w-12">
                  A: NO
                </th>
                <th className="py-2.5 px-3 bg-slate-100 font-bold text-slate-700 whitespace-nowrap w-20">
                  B: 店番
                </th>
                <th className="py-2.5 px-3 bg-slate-100 font-bold text-slate-700 whitespace-nowrap w-20">
                  C: 代表番号
                </th>
                <th className="py-2.5 px-3 bg-slate-100 font-bold text-slate-800 whitespace-nowrap min-w-36">
                  D: 店名
                </th>
                <th className="py-2.5 px-3 bg-slate-100 font-semibold text-slate-600 whitespace-nowrap min-w-28">
                  E: 店舗住所1
                </th>
                <th className="py-2.5 px-3 bg-slate-100 font-semibold text-slate-600 whitespace-nowrap min-w-36">
                  F: 店舗住所2
                </th>
                <th className="py-2.5 px-3 bg-slate-100 font-semibold text-slate-600 whitespace-nowrap min-w-36">
                  G: 店舗建物名
                </th>
                <th className="py-2.5 px-3 bg-slate-100 font-bold text-slate-700 whitespace-nowrap min-w-32">
                  H: 店舗携帯番号
                </th>
                <th className="py-2.5 px-3 bg-slate-100 font-semibold text-slate-600 whitespace-nowrap text-center w-20">
                  I: 運営
                </th>
                <th className="py-2.5 px-2 bg-slate-200 font-bold text-slate-700 whitespace-nowrap text-center w-16">
                  架電
                </th>

                {/* J to T */}
                <th className="py-2.5 px-3 bg-blue-50 font-bold text-blue-900 whitespace-nowrap min-w-40">
                  J: 備考欄1
                </th>
                <th className="py-2.5 px-3 bg-blue-50 font-bold text-blue-900 whitespace-nowrap w-32">
                  K: カテゴリ
                </th>
                <th className="py-2.5 px-3 bg-blue-50 font-bold text-blue-900 whitespace-nowrap w-28">
                  L: 電話
                </th>
                <th className="py-2.5 px-3 bg-blue-50 font-bold text-blue-900 whitespace-nowrap w-28">
                  M: 調査担当
                </th>
                <th className="py-2.5 px-3 bg-blue-50 font-bold text-blue-900 whitespace-nowrap w-32">
                  N: 調査日
                </th>
                <th className="py-2.5 px-3 bg-blue-50 font-bold text-blue-900 whitespace-nowrap w-28">
                  O: 調査資料回収
                </th>
                <th className="py-2.5 px-3 bg-blue-50 font-bold text-blue-900 whitespace-nowrap w-28">
                  P: 置き換え依頼
                </th>
                <th className="py-2.5 px-3 bg-blue-50 font-bold text-blue-900 whitespace-nowrap w-28">
                  Q: 商品手配
                </th>
                <th className="py-2.5 px-3 bg-blue-50 font-bold text-blue-900 whitespace-nowrap w-28">
                  R: 作業担当
                </th>
                <th className="py-2.5 px-3 bg-blue-50 font-bold text-blue-900 whitespace-nowrap w-28">
                  S: 日程連絡
                </th>
                <th className="py-2.5 px-3 bg-blue-50 font-bold text-blue-900 whitespace-nowrap w-28 text-center">
                  T: 完了
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={21} className="py-12 text-center text-slate-400">
                    条件に一致する店舗データがありません。
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isDone = r.completion === '完了';

                  return (
                    <tr
                      key={r.no}
                      className={`hover:bg-blue-50/40 transition-colors divide-x divide-slate-100 ${
                        isDone ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      {/* --- A〜I列（入力禁止・マスタ領域：bg-slate-50/60） --- */}
                      <td className="py-2 px-3 text-center font-mono font-bold text-slate-500 bg-slate-50/70 select-none">
                        {r.no}
                      </td>

                      <td className="py-2 px-3 font-mono text-slate-700 bg-slate-50/70 select-none">
                        {r.storeCode}
                      </td>

                      <td className="py-2 px-3 font-mono text-slate-700 bg-slate-50/70 select-none">
                        {r.representativePhone}
                      </td>

                      <td className="py-2 px-3 bg-slate-50/70">
                        <div className="font-bold text-slate-900 flex items-center justify-between gap-1">
                          <span>{r.storeName}</span>
                          <button
                            onClick={() => handleStartEdit(r)}
                            className="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-800 p-0.5 rounded"
                            title="詳細フォームを開く"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      <td className="py-2 px-3 text-slate-600 bg-slate-50/70 select-none">
                        {r.address1}
                      </td>

                      <td className="py-2 px-3 text-slate-600 bg-slate-50/70 select-none">
                        {r.address2}
                      </td>

                      <td className="py-2 px-3 text-slate-500 text-[11px] bg-slate-50/70 select-none">
                        {r.buildingName || '-'}
                      </td>

                      <td className="py-2 px-3 font-mono text-slate-800 bg-slate-50/70 whitespace-nowrap">
                        <a
                          href={`tel:${r.storeMobile.replace(/-/g, '')}`}
                          className="hover:text-blue-600 hover:underline"
                        >
                          {r.storeMobile}
                        </a>
                      </td>

                      <td className="py-2 px-3 text-center bg-slate-50/70 select-none">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                            r.managementType === '直営'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.managementType}
                        </span>
                      </td>

                      {/* コール発信アクションボタン */}
                      <td className="py-1 px-2 text-center bg-slate-100 select-none">
                        <button
                          onClick={() => onSelectStoreForCall(r)}
                          className="flex items-center justify-center gap-1 w-full py-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded shadow-2xs transition-colors"
                          title="この店舗で通話ナビを開始"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>架電</span>
                        </button>
                      </td>

                      {/* --- J〜T列（入力および選択方式：白背景＆アクティブ入力） --- */}
                      {/* J: 備考欄1 */}
                      <td className="py-1 px-2 bg-white">
                        <input
                          type="text"
                          value={r.remarks1}
                          onChange={(e) => handleQuickChange(r.no, 'remarks1', e.target.value)}
                          placeholder="LED状況等入力..."
                          className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded transition-colors"
                        />
                      </td>

                      {/* K: カテゴリ */}
                      <td className="py-1 px-2 bg-white">
                        <select
                          value={r.category}
                          onChange={(e) => handleQuickChange(r.no, 'category', e.target.value)}
                          className={`w-full px-2 py-1 text-xs rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden font-medium ${
                            r.category === 'ビルイン'
                              ? 'text-blue-700 bg-blue-50/50'
                              : r.category === 'フードコート'
                              ? 'text-amber-700 bg-amber-50/50'
                              : r.category === 'フリスタ'
                              ? 'text-emerald-700 bg-emerald-50/50'
                              : 'text-slate-400'
                          }`}
                        >
                          <option value="未設定">未設定</option>
                          <option value="ビルイン">ビルイン</option>
                          <option value="フードコート">フードコート</option>
                          <option value="フリスタ">フリスタ</option>
                        </select>
                      </td>

                      {/* L: 電話 */}
                      <td className="py-1 px-2 bg-white">
                        <select
                          value={r.phoneStatus}
                          onChange={(e) => handleQuickChange(r.no, 'phoneStatus', e.target.value)}
                          className={`w-full px-2 py-1 text-xs rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden font-medium ${
                            r.phoneStatus === '完了'
                              ? 'text-emerald-700 bg-emerald-50'
                              : r.phoneStatus === '通話中'
                              ? 'text-blue-700 bg-blue-50'
                              : r.phoneStatus === '不在/再架電'
                              ? 'text-amber-700 bg-amber-50'
                              : 'text-slate-500'
                          }`}
                        >
                          <option value="未架電">未架電</option>
                          <option value="完了">完了</option>
                          <option value="不在/再架電">不在/再架電</option>
                          <option value="通話中">通話中</option>
                          <option value="担当不在">担当不在</option>
                          <option value="着信拒否">着信拒否</option>
                        </select>
                      </td>

                      {/* M: 調査担当 */}
                      <td className="py-1 px-2 bg-white">
                        <input
                          type="text"
                          value={r.surveyAssignee}
                          onChange={(e) => handleQuickChange(r.no, 'surveyAssignee', e.target.value)}
                          placeholder="担当者名"
                          className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded transition-colors"
                        />
                      </td>

                      {/* N: 調査日 */}
                      <td className="py-1 px-2 bg-white">
                        <input
                          type="date"
                          value={r.surveyDate}
                          onChange={(e) => handleQuickChange(r.no, 'surveyDate', e.target.value)}
                          className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded transition-colors font-mono"
                        />
                      </td>

                      {/* O: 調査資料回収 */}
                      <td className="py-1 px-2 bg-white">
                        <select
                          value={r.surveyDocCollection}
                          onChange={(e) => handleQuickChange(r.no, 'surveyDocCollection', e.target.value)}
                          className={`w-full px-2 py-1 text-xs rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden font-medium ${
                            r.surveyDocCollection === '回収済'
                              ? 'text-emerald-700 bg-emerald-50'
                              : r.surveyDocCollection === '不要'
                              ? 'text-slate-400'
                              : 'text-amber-700'
                          }`}
                        >
                          <option value="未回収">未回収</option>
                          <option value="回収済">回収済</option>
                          <option value="不要">不要</option>
                        </select>
                      </td>

                      {/* P: 置き換え依頼 */}
                      <td className="py-1 px-2 bg-white">
                        <select
                          value={r.replacementRequest}
                          onChange={(e) => handleQuickChange(r.no, 'replacementRequest', e.target.value)}
                          className={`w-full px-2 py-1 text-xs rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden font-medium ${
                            r.replacementRequest === '依頼済'
                              ? 'text-emerald-700 bg-emerald-50'
                              : r.replacementRequest === '対象外'
                              ? 'text-slate-400'
                              : 'text-amber-700'
                          }`}
                        >
                          <option value="未依頼">未依頼</option>
                          <option value="依頼済">依頼済</option>
                          <option value="対象外">対象外</option>
                        </select>
                      </td>

                      {/* Q: 商品手配 */}
                      <td className="py-1 px-2 bg-white">
                        <select
                          value={r.itemOrdering}
                          onChange={(e) => handleQuickChange(r.no, 'itemOrdering', e.target.value)}
                          className={`w-full px-2 py-1 text-xs rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden font-medium ${
                            r.itemOrdering === '完了' || r.itemOrdering === '手配済'
                              ? 'text-emerald-700 bg-emerald-50'
                              : r.itemOrdering === '納品待ち'
                              ? 'text-blue-700 bg-blue-50'
                              : 'text-slate-500'
                          }`}
                        >
                          <option value="未手配">未手配</option>
                          <option value="手配済">手配済</option>
                          <option value="納品待ち">納品待ち</option>
                          <option value="完了">完了</option>
                        </select>
                      </td>

                      {/* R: 作業担当 */}
                      <td className="py-1 px-2 bg-white">
                        <input
                          type="text"
                          value={r.workAssignee}
                          onChange={(e) => handleQuickChange(r.no, 'workAssignee', e.target.value)}
                          placeholder="工事業者/担当"
                          className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded transition-colors"
                        />
                      </td>

                      {/* S: 日程連絡 */}
                      <td className="py-1 px-2 bg-white">
                        <select
                          value={r.scheduleNotice}
                          onChange={(e) => handleQuickChange(r.no, 'scheduleNotice', e.target.value)}
                          className={`w-full px-2 py-1 text-xs rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden font-medium ${
                            r.scheduleNotice === '連絡済'
                              ? 'text-emerald-700 bg-emerald-50'
                              : 'text-amber-700'
                          }`}
                        >
                          <option value="未連絡">未連絡</option>
                          <option value="連絡済">連絡済</option>
                          <option value="日程調整中">日程調整中</option>
                        </select>
                      </td>

                      {/* T: 完了 */}
                      <td className="py-1 px-2 bg-white text-center">
                        <select
                          value={r.completion}
                          onChange={(e) => handleQuickChange(r.no, 'completion', e.target.value)}
                          className={`px-2 py-1 text-xs rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden font-bold ${
                            r.completion === '完了'
                              ? 'text-emerald-800 bg-emerald-100'
                              : r.completion === '保留'
                              ? 'text-rose-800 bg-rose-100'
                              : 'text-slate-600 bg-slate-100'
                          }`}
                        >
                          <option value="未完了">未完了</option>
                          <option value="完了">完了</option>
                          <option value="保留">保留</option>
                          <option value="対象外">対象外</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Edit Modal if requested */}
      {editFormData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-base text-slate-900">
                  店舗詳細編集（NO.{editFormData.no} {editFormData.storeName}）
                </span>
                <span className="ml-2 text-xs text-slate-500 font-mono">店番: {editFormData.storeCode}</span>
              </div>
              <button
                onClick={() => setEditFormData(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Locked Notice */}
              <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  <strong>A〜I列のマスタ情報:</strong> {editFormData.address1} {editFormData.address2} {editFormData.buildingName} / TEL: {editFormData.storeMobile} ({editFormData.managementType})
                </span>
              </div>

              {/* J〜T Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    J: 備考欄1 (LED化状況・ヒアリング詳細)
                  </label>
                  <input
                    type="text"
                    value={editFormData.remarks1}
                    onChange={(e) => setEditFormData({ ...editFormData, remarks1: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                    placeholder="例: 全灯LED済み、一部未LED（厨房内蛍光灯残）など"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    K: カテゴリ（設置場所区分）
                  </label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                  >
                    <option value="未設定">未設定</option>
                    <option value="ビルイン">ビルイン（ビルテナント）</option>
                    <option value="フードコート">フードコート（カウンター/厨房のみ）</option>
                    <option value="フリスタ">フリスタ（独立路面・駐車場灯有）</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">L: 電話ステータス</label>
                  <select
                    value={editFormData.phoneStatus}
                    onChange={(e) => setEditFormData({ ...editFormData, phoneStatus: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                  >
                    <option value="未架電">未架電</option>
                    <option value="完了">完了</option>
                    <option value="不在/再架電">不在/再架電</option>
                    <option value="通話中">通話中</option>
                    <option value="担当不在">担当不在</option>
                    <option value="着信拒否">着信拒否</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">M: 調査担当</label>
                  <input
                    type="text"
                    value={editFormData.surveyAssignee}
                    onChange={(e) => setEditFormData({ ...editFormData, surveyAssignee: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">N: 調査日</label>
                  <input
                    type="date"
                    value={editFormData.surveyDate}
                    onChange={(e) => setEditFormData({ ...editFormData, surveyDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">O: 調査資料回収</label>
                  <select
                    value={editFormData.surveyDocCollection}
                    onChange={(e) => setEditFormData({ ...editFormData, surveyDocCollection: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                  >
                    <option value="未回収">未回収</option>
                    <option value="回収済">回収済</option>
                    <option value="不要">不要</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">P: 置き換え依頼</label>
                  <select
                    value={editFormData.replacementRequest}
                    onChange={(e) => setEditFormData({ ...editFormData, replacementRequest: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                  >
                    <option value="未依頼">未依頼</option>
                    <option value="依頼済">依頼済</option>
                    <option value="対象外">対象外</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Q: 商品手配</label>
                  <select
                    value={editFormData.itemOrdering}
                    onChange={(e) => setEditFormData({ ...editFormData, itemOrdering: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                  >
                    <option value="未手配">未手配</option>
                    <option value="手配済">手配済</option>
                    <option value="納品待ち">納品待ち</option>
                    <option value="完了">完了</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">R: 作業担当</label>
                  <input
                    type="text"
                    value={editFormData.workAssignee}
                    onChange={(e) => setEditFormData({ ...editFormData, workAssignee: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">S: 日程連絡</label>
                  <select
                    value={editFormData.scheduleNotice}
                    onChange={(e) => setEditFormData({ ...editFormData, scheduleNotice: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                  >
                    <option value="未連絡">未連絡</option>
                    <option value="連絡済">連絡済</option>
                    <option value="日程調整中">日程調整中</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">T: 完了</label>
                  <select
                    value={editFormData.completion}
                    onChange={(e) => setEditFormData({ ...editFormData, completion: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden font-bold"
                  >
                    <option value="未完了">未完了</option>
                    <option value="完了">完了</option>
                    <option value="保留">保留</option>
                    <option value="対象外">対象外</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  onSelectStoreForCall(editFormData);
                  setEditFormData(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
              >
                <PhoneCall className="w-4 h-4" />
                <span>この店舗で通話ナビを開く</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditFormData(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveModal}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>保存する</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
