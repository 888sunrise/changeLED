/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LiveCallSimulator } from './components/LiveCallSimulator';
import { FlowchartView } from './components/FlowchartView';
import { FullScriptManual } from './components/FullScriptManual';
import { ChecksheetForm } from './components/ChecksheetForm';
import { INITIAL_SAMPLE_RECORDS } from './data/sampleRecords';
import { HearingRecord } from './types/hearing';
import { testConnection } from './firebase';
import {
  subscribeHearingRecords,
  saveHearingRecordToFirestore,
  deleteHearingRecordFromFirestore,
} from './services/recordService';
import { Cloud, CheckCircle2, AlertCircle } from 'lucide-react';

const STORAGE_KEY = 'led_hearing_records_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'flowchart' | 'scripts' | 'checksheet'>('simulator');
  const [records, setRecords] = useState<HearingRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return INITIAL_SAMPLE_RECORDS;
  });
  const [syncStatus, setSyncStatus] = useState<'connected' | 'syncing' | 'offline'>('syncing');

  // Test connection & Subscribe to Firestore real-time updates
  useEffect(() => {
    testConnection().then((connected) => {
      if (connected) {
        setSyncStatus('connected');
      }
    });

    const unsubscribe = subscribeHearingRecords(
      (remoteRecords) => {
        setRecords(remoteRecords);
        setSyncStatus('connected');
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteRecords));
        } catch {
          // Ignore
        }
      },
      (error) => {
        console.warn('Firestore sync note:', error);
        setSyncStatus('offline');
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSaveRecord = async (newRecord: HearingRecord) => {
    // 画面側を先行更新
    setRecords((prev) => [newRecord, ...prev]);

    // Firestore へ非同期保存
    try {
      setSyncStatus('syncing');
      await saveHearingRecordToFirestore(newRecord);
      setSyncStatus('connected');
    } catch (err) {
      console.error('Failed to save to Firestore:', err);
      // ローカルストレージにバックアップ
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([newRecord, ...records]));
      } catch {}
      setSyncStatus('offline');
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (window.confirm('このヒアリング記録を削除してもよろしいですか？')) {
      setRecords((prev) => prev.filter((r) => r.id !== id));
      try {
        await deleteHearingRecordFromFirestore(id);
      } catch (err) {
        console.error('Failed to delete from Firestore:', err);
      }
    }
  };

  const handleNewCall = () => {
    setActiveTab('simulator');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top 3-Zone Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewCall={handleNewCall}
      />

      {/* Sync Status Banner */}
      <div className="bg-white/80 border-b border-slate-200 px-4 py-1.5 text-xs flex items-center justify-between">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            {syncStatus === 'connected' ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Cloud Firestore連携中（リアルタイム同期・永続保存）</span>
              </span>
            ) : syncStatus === 'syncing' ? (
              <span className="inline-flex items-center gap-1.5 text-blue-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span>クラウド同期中...</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>オフライン保持中（再接続時にクラウド同期）</span>
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            Project: true-pattern-x98sv / Collection: hearing_records
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'simulator' && (
          <LiveCallSimulator
            onSaveRecord={handleSaveRecord}
            onGoToChecksheet={() => setActiveTab('checksheet')}
          />
        )}

        {activeTab === 'flowchart' && (
          <FlowchartView
            onSelectStep={() => {
              setActiveTab('simulator');
            }}
          />
        )}

        {activeTab === 'scripts' && <FullScriptManual />}

        {activeTab === 'checksheet' && (
          <ChecksheetForm
            records={records}
            onDeleteRecord={handleDeleteRecord}
            onStartNewHearing={handleNewCall}
          />
        )}
      </main>

      {/* Clean Anti-slop Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            蛍光灯→LED切替 事前調査 電話ヒアリング マニュアル & チェックシート管理システム
          </div>
          <div className="text-slate-400">
            判定区分：ビルトイン / フードコート / フリスタ · 営業終了後作業戸締り確認準拠
          </div>
        </div>
      </footer>
    </div>
  );
}
