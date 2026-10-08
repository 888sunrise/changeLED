/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  X,
  Lock,
  Trash2,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Layers,
} from 'lucide-react';
import {
  clearAllStoreRecords,
  seedInitial173StoreRecords,
} from '../services/storeRecordService';

interface AdminDataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCount: number;
  onClearComplete: () => void;
  onSeedComplete: () => void;
  onOpenCsvImport: () => void;
}

const ADMIN_PINS = ['admin', '8888', '1234', 'y1905dog'];

export const AdminDataManagementModal: React.FC<AdminDataManagementModalProps> = ({
  isOpen,
  onClose,
  currentCount,
  onClearComplete,
  onSeedComplete,
  onOpenCsvImport,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (ADMIN_PINS.includes(pinInput.trim())) {
      setIsAuthenticated(true);
      setPinError(false);
      setStatusMessage(null);
    } else {
      setPinError(true);
    }
  };

  const handleClearAll = async () => {
    const confirmed = window.confirm(
      '【警告】本当にCloud Firestore上の全店舗データを完全に削除しますか？\n\n・実行後、アプリは「登録店舗 0件（データなし）」の状態になります。\n・ブラウザを閉じたり再読込してもデータは復元されません。\n・最新の全173店舗CSVを新規インポートする場合に実行してください。'
    );
    if (!confirmed) return;

    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const deletedCount = await clearAllStoreRecords();
      setStatusMessage({
        type: 'success',
        text: `Cloud Firestoreから全${deletedCount}件のデータを削除しました。アプリは「データなし（0件）」の状態になりました。`,
      });
      onClearComplete();
    } catch (err: any) {
      console.error('Failed to clear records:', err);
      setStatusMessage({
        type: 'error',
        text: '初期化（全削除）に失敗しました: ' + (err.message || String(err)),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSeed173 = async () => {
    const confirmed = window.confirm(
      '標準の全173店舗初期マスタデータをCloud Firestoreに一括投入しますか？\n（既存データがある場合は上書き更新されます）'
    );
    if (!confirmed) return;

    setIsProcessing(true);
    setStatusMessage(null);
    try {
      await seedInitial173StoreRecords();
      setStatusMessage({
        type: 'success',
        text: '全173店舗の初期データをCloud Firestoreに正常に投入・保存しました。',
      });
      onSeedComplete();
    } catch (err: any) {
      console.error('Failed to seed records:', err);
      setStatusMessage({
        type: 'error',
        text: 'データ投入に失敗しました: ' + (err.message || String(err)),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">管理者専用 データ管理・初期化コンソール</h3>
              <p className="text-[11px] text-slate-400">Cloud Firestore 永続ストレージ制御</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {!isAuthenticated ? (
            /* PIN Authentication Screen */
            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-600">
                  <Lock className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">管理者PINコードの入力</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  台帳データの初期化およびマスタリストアは、管理者（ご本人様）のみが実行可能です。
                </p>
              </div>

              <div>
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="管理者パスワード (admin または 8888)"
                  className="w-full px-4 py-2.5 text-center tracking-widest text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  autoFocus
                />
                {pinError && (
                  <p className="text-xs text-rose-600 mt-1.5 text-center font-medium">
                    パスワードが正しくありません。（初期値: admin または 8888）
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
                >
                  認証してメニューを開く
                </button>
              </div>
            </form>
          ) : (
            /* Authenticated Admin Menu */
            <div className="space-y-5">
              {/* Firestore Status Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span>Cloud Firestore 接続ステータス</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    リアルタイム同期中
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                  <div>
                    現在の登録店舗数: <strong className="text-slate-900 text-xs">{currentCount} 件</strong>
                  </div>
                  <div>
                    対象コレクション: <code className="text-slate-700 font-mono">stores_led_records</code>
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              {statusMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    statusMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {statusMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              {/* Admin Actions */}
              <div className="space-y-3">
                {/* Action 1: Clear All Records */}
                <div className="p-3.5 border border-rose-200 bg-rose-50/50 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-rose-900 flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      ① 全データ初期化（完全クリア・0件にする）
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    Firestore上の全店舗データを完全に消去し、アプリを<strong>「登録店舗 0件（データなし）」</strong>の状態にします。
                    ブラウザを閉じても復元されません。Excelから新規に全173店舗CSVを取り込み直したい場合に使用してください。
                  </p>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
                  >
                    {isProcessing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>全店舗データを削除して初期化（0件にする）</span>
                  </button>
                </div>

                {/* Action 2: Restore 173 Stores */}
                <div className="p-3.5 border border-slate-200 bg-slate-50 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-600" />
                      ② 初期173店舗マスタの一括再投入（リストア）
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    標準の全173店舗データ（A〜U列テンプレート）をCloud Firestoreに一括投入・復元します。
                  </p>
                  <button
                    type="button"
                    onClick={handleSeed173}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 disabled:opacity-50 rounded-lg shadow-2xs transition-colors"
                  >
                    {isProcessing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>初期173店舗マスタをCloud Firestoreに投入</span>
                  </button>
                </div>

                {/* Action 3: Open CSV Import */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCsvImport();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>CSV差分・全店舗インポート画面を開く</span>
                  </button>
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-2 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  閉じる
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
