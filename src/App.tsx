/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { StoreLedgerTable } from './components/StoreLedgerTable';
import { LiveCallSimulator } from './components/LiveCallSimulator';
import { FlowchartView } from './components/FlowchartView';
import { FullScriptManual } from './components/FullScriptManual';
import { ChecksheetForm } from './components/ChecksheetForm';
import { INITIAL_SAMPLE_RECORDS } from './data/sampleRecords';
import { INITIAL_STORE_RECORDS } from './data/sampleStores';
import { HearingRecord, StoreRecord } from './types/hearing';
import { testConnection } from './firebase';
import {
  subscribeHearingRecords,
  saveHearingRecordToFirestore,
  deleteHearingRecordFromFirestore,
} from './services/recordService';
import {
  subscribeStoreRecords,
  updateStoreRecordInFirestore,
  bulkUpdateStoreRecords,
  resetAllStoreRecords,
} from './services/storeRecordService';
import { AlertCircle } from 'lucide-react';

const STORAGE_KEY = 'led_hearing_records_v1';
const STORE_STORAGE_KEY = 'led_stores_records_v2';

export default function App() {
  const [activeTab, setActiveTab] = useState<'ledger' | 'simulator' | 'flowchart' | 'scripts' | 'checksheet'>('ledger');

  // Stores (A〜U columns) - Cloud Firestore is master
  const [stores, setStores] = useState<StoreRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {}
    return [];
  });

  // Selected Store for calling
  const [currentCallingStore, setCurrentCallingStore] = useState<StoreRecord | null>(null);

  // Hearing Record Cards
  const [records, setRecords] = useState<HearingRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_SAMPLE_RECORDS;
  });

  const [syncStatus, setSyncStatus] = useState<'connected' | 'syncing' | 'offline'>('syncing');

  // Sync with Firebase Firestore
  useEffect(() => {
    testConnection().then((connected) => {
      if (connected) setSyncStatus('connected');
    });

    // 1. Subscribe to Store Records (A〜T columns)
    const unsubStores = subscribeStoreRecords(
      (remoteStores) => {
        setStores(remoteStores);
        setSyncStatus('connected');
        try {
          localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(remoteStores));
        } catch {}
      },
      (err) => {
        console.warn('Store sync note:', err);
        setSyncStatus('offline');
      }
    );

    // 2. Subscribe to Detailed Hearing Records
    const unsubHearings = subscribeHearingRecords(
      (remoteRecords) => {
        setRecords(remoteRecords);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteRecords));
        } catch {}
      },
      (error) => {
        console.warn('Hearing sync note:', error);
      }
    );

    return () => {
      unsubStores();
      unsubHearings();
    };
  }, []);

  // Update a single Store record (J〜T column update)
  const handleUpdateStore = async (updated: StoreRecord) => {
    setStores((prev) => prev.map((s) => (s.no === updated.no ? updated : s)));
    try {
      setSyncStatus('syncing');
      await updateStoreRecordInFirestore(updated);
      setSyncStatus('connected');
    } catch (err) {
      console.error('Failed to update store in Firestore:', err);
      setSyncStatus('offline');
    }
  };

  // Bulk update store records (CSV Diff Import) - persists directly to Firestore
  const handleBulkUpdateStores = async (updatedList: StoreRecord[]) => {
    if (!updatedList || updatedList.length === 0) return;
    const updateMap = new Map(updatedList.map((s) => [s.no, s]));
    setStores((prev) => {
      const existingNos = new Set(prev.map((s) => s.no));
      const updatedExisting = prev.map((s) => updateMap.get(s.no) || s);
      const newItems = updatedList.filter((s) => !existingNos.has(s.no));
      const combined = [...updatedExisting, ...newItems].sort((a, b) => a.no - b.no);
      try {
        localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(combined));
      } catch {}
      return combined;
    });

    try {
      setSyncStatus('syncing');
      await bulkUpdateStoreRecords(updatedList);
      setSyncStatus('connected');
    } catch (err) {
      console.error('Failed to bulk update stores in Firestore:', err);
      setSyncStatus('offline');
      throw err;
    }
  };

  const handleClearStores = () => {
    setStores([]);
    try {
      localStorage.removeItem(STORE_STORAGE_KEY);
    } catch {}
  };

  // Update single field of store
  const handleUpdateStoreField = (storeNo: number, field: keyof StoreRecord, value: any) => {
    const target = stores.find((s) => s.no === storeNo);
    if (!target) return;
    const updated = { ...target, [field]: value };
    handleUpdateStore(updated);
  };

  // Launch Call with Store
  const handleSelectStoreForCall = (store: StoreRecord) => {
    setCurrentCallingStore(store);
    setActiveTab('simulator');
  };

  // Save Hearing Record
  const handleSaveRecord = async (newRecord: HearingRecord) => {
    setRecords((prev) => [newRecord, ...prev]);
    try {
      setSyncStatus('syncing');
      await saveHearingRecordToFirestore(newRecord);
      setSyncStatus('connected');
    } catch (err) {
      console.error('Failed to save hearing to Firestore:', err);
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
    setCurrentCallingStore(null);
    setActiveTab('simulator');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top 3-Zone Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewCall={handleNewCall}
        selectedStoreName={currentCallingStore?.storeName}
      />

      {/* Sync Status Banner */}
      <div id="top-sync-banner" className="bg-white/90 border-b border-slate-200 px-4 py-1.5 text-xs print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            {syncStatus === 'connected' ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Cloud Firestore連携中（全173店舗マスタ・ヒアリング記録リアルタイム同期中）</span>
              </span>
            ) : syncStatus === 'syncing' ? (
              <span className="inline-flex items-center gap-1.5 text-blue-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span>クラウド同期中...</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>オフライン保持中（ローカルストレージ自動退避）</span>
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 font-mono hidden md:inline">
            Project: true-pattern-x98sv / Collections: stores_led_records, hearing_records
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'ledger' && (
          <StoreLedgerTable
            records={stores}
            onUpdateRecord={handleUpdateStore}
            onBulkUpdateStores={handleBulkUpdateStores}
            onSelectStoreForCall={handleSelectStoreForCall}
            onResetDefaults={() => resetAllStoreRecords()}
            onClearStores={handleClearStores}
          />
        )}

        {activeTab === 'simulator' && (
          <LiveCallSimulator
            stores={stores}
            initialStore={currentCallingStore}
            onUpdateStoreField={handleUpdateStoreField}
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

      {/* Clean Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            蛍光灯→LED切替 事前調査ヒアリングCRM（全173店舗マスタ A〜U列対応）
          </div>
          <div className="text-slate-400">
            A〜I列: 入力禁止（マスタ） / J〜U列: インライン入力・選択 / Firebase Firestore 永続同期
          </div>
        </div>
      </footer>
    </div>
  );
}
