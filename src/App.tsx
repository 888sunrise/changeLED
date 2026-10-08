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
import { PostVisitCallNavigator } from './components/PostVisitCallNavigator';
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
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { TestClearModal } from './components/TestClearModal';

const STORAGE_KEY = 'led_hearing_records_v1';
const STORE_STORAGE_KEY = 'led_stores_records_v2';

export default function App() {
  const [activeTab, setActiveTab] = useState<'ledger' | 'simulator' | 'post_visit' | 'flowchart' | 'scripts' | 'checksheet'>('checksheet');

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

  // Target Store for Test Clear Modal
  const [testClearTargetStore, setTestClearTargetStore] = useState<StoreRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Editing Hearing Record (when user clicks "修正" in checksheet)
  const [editingRecord, setEditingRecord] = useState<HearingRecord | null>(null);

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
    setCurrentCallingStore((prev) => (prev && prev.no === updated.no ? updated : prev));
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
    setCurrentCallingStore((prev) => {
      if (prev && prev.no === storeNo) {
        const updated = { ...prev, [field]: value };
        if (field === 'callStatus') updated.phoneStatus = value;
        else if (field === 'phoneStatus') updated.callStatus = value;
        return updated;
      }
      return prev;
    });

    const target = stores.find((s) => s.no === storeNo);
    if (!target) return;
    const updated = { ...target, [field]: value };
    if (field === 'callStatus') {
      updated.phoneStatus = value;
    } else if (field === 'phoneStatus') {
      updated.callStatus = value;
    }
    handleUpdateStore(updated);
  };

  const handleClearEditingRecord = React.useCallback(() => {
    setEditingRecord(null);
  }, []);

  // Launch Call with Store
  const handleSelectStoreForCall = (store: StoreRecord) => {
    // Clear any previous editing record so the newly selected store is cleanly loaded
    setEditingRecord(null);
    setCurrentCallingStore(store);
    setActiveTab('simulator');
  };

  // Launch Post-Visit Navigator with Store
  const handleSelectStoreForPostVisit = (store: StoreRecord) => {
    setCurrentCallingStore(store);
    setActiveTab('post_visit');
  };

  // Save Hearing Record - Overwrites if record for same store already exists
  const handleSaveRecord = async (newRecord: HearingRecord) => {
    let targetDocId = newRecord.id;
    const isCompleted =
      newRecord.status === 'completed' ||
      newRecord.callStatus === '完了' ||
      newRecord.surveyRequirement !== 'pending';

    setRecords((prev) => {
      // Find existing record for same store
      const existingIndex = prev.findIndex((r) => {
        if (r.id === newRecord.id) return true;
        if (
          r.storeId &&
          newRecord.storeId &&
          r.storeId.trim() !== '' &&
          r.storeId.trim().toLowerCase() === newRecord.storeId.trim().toLowerCase()
        ) {
          return true;
        }
        if (
          r.storeName &&
          newRecord.storeName &&
          r.storeName.trim() !== '' &&
          r.storeName !== '無題店舗' &&
          r.storeName.trim() === newRecord.storeName.trim()
        ) {
          return true;
        }
        return false;
      });

      let nextList: HearingRecord[];
      if (existingIndex >= 0) {
        // OVERWRITE existing record in place!
        targetDocId = prev[existingIndex].id;
        const merged: HearingRecord = {
          ...prev[existingIndex],
          ...newRecord,
          callbackScheduledAt: isCompleted ? '' : (newRecord.callbackScheduledAt ?? prev[existingIndex].callbackScheduledAt ?? ''),
          callbackNotes: isCompleted ? '' : (newRecord.callbackNotes ?? prev[existingIndex].callbackNotes ?? ''),
          id: targetDocId, // Keep existing document ID for persistence
        };
        nextList = [...prev];
        nextList[existingIndex] = merged;
      } else {
        const cleanNewRecord: HearingRecord = {
          ...newRecord,
          callbackScheduledAt: isCompleted ? '' : (newRecord.callbackScheduledAt ?? ''),
          callbackNotes: isCompleted ? '' : (newRecord.callbackNotes ?? ''),
        };
        nextList = [cleanNewRecord, ...prev];
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
      } catch {}
      return nextList;
    });

    const recordToPersist: HearingRecord = {
      ...newRecord,
      id: targetDocId,
      callbackScheduledAt: isCompleted ? '' : (newRecord.callbackScheduledAt ?? ''),
      callbackNotes: isCompleted ? '' : (newRecord.callbackNotes ?? ''),
    };

    try {
      setSyncStatus('syncing');
      await saveHearingRecordToFirestore(recordToPersist);
      // If the target document ID differed from newly generated id, clean up transient ID
      if (targetDocId !== newRecord.id) {
        try {
          await deleteHearingRecordFromFirestore(newRecord.id);
        } catch {}
      }
      setSyncStatus('connected');
    } catch (err) {
      console.error('Failed to save hearing to Firestore:', err);
      setSyncStatus('offline');
    }
  };

  const handleDeleteRecord = async (id: string) => {
    setRecords((prev) => {
      const next = prev.filter((r) => r.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    try {
      setSyncStatus('syncing');
      await deleteHearingRecordFromFirestore(id);
      setSyncStatus('connected');
    } catch (err) {
      console.error('Failed to delete hearing record from Firestore:', err);
      setSyncStatus('offline');
    }
  };

  // Switch to Call Navigator to Edit and Overwrite Record
  const handleEditRecord = (record: HearingRecord) => {
    setEditingRecord(record);
    const matched = stores.find(
      (s) =>
        (record.storeId && s.storeCode === record.storeId) ||
        s.storeName === record.storeName
    );
    if (matched) {
      setCurrentCallingStore(matched);
    } else {
      setCurrentCallingStore({
        no: 0,
        storeCode: record.storeId || '',
        representativePhone: record.phoneNumber,
        storeName: record.storeName,
        address1: '',
        address2: '',
        buildingName: '',
        storeMobile: record.phoneNumber,
        managementType: '直営',
        remarks1: record.notes || '',
        category:
          record.locationCategory === 'builtin'
            ? 'ビルイン'
            : record.locationCategory === 'foodcourt'
            ? 'フードコート'
            : record.locationCategory === 'freesta'
            ? 'ロードサイド'
            : '未設定',
        hasDrawing: '',
        phoneContact: record.contactPerson,
        surveyAssignee: record.operatorName,
        surveyDate: record.preferredDate1 || '',
        surveyDocCollection: '未回収',
        replacementRequest: '未依頼',
        itemOrdering: '未手配',
        workAssignee: '',
        scheduleNotice: '連絡済',
        completion: record.surveyRequirement === 'not_required' ? '完了' : '未完了',
        callStatus: (record.callStatus as any) || '完了',
        phoneStatus: (record.callStatus as any) || '完了',
      });
    }
    setActiveTab('simulator');
  };

  // Test Clear: Reset input fields for a specific customer / store only
  const handleTestClearStore = async (storeNo: number) => {
    const target = stores.find((s) => s.no === storeNo);
    if (!target) return;

    // Preserve A〜I master columns and S列:作業担当 (workAssignee), reset only J〜R, T〜V and post-visit fields
    const defaultMaster = INITIAL_STORE_RECORDS.find((s) => s.no === target.no);
    const preservedWorkAssignee = target.workAssignee || defaultMaster?.workAssignee || '';

    const cleanedStore: StoreRecord = {
      ...target,
      remarks1: '',
      category: '未設定',
      hasDrawing: '',
      phoneContact: '',
      surveyAssignee: '',
      surveyDate: '',
      surveyDocCollection: '未回収',
      surveyDocDate: '',
      surveyMaterialStartDate: '',
      surveyMaterialStatus: '未着手',
      replacementRequest: '未依頼',
      replacementRequestDate: '',
      itemOrdering: '未手配',
      workAssignee: preservedWorkAssignee, // 作業担当（S列）は初期化対象外（保持）
      scheduleNotice: '未連絡',
      completion: '未完了',
      callStatus: '未架電',
      phoneStatus: '未架電',
      postVisitNotes: '',
      updatedAt: new Date().toISOString(),
    };

    // 1. Update store record in memory, localStorage and Firestore
    await handleUpdateStore(cleanedStore);

    // 2. Delete any matching hearing records for this store
    const matchedHearings = records.filter((r) => {
      if (target.storeCode && r.storeId && r.storeId.trim().toLowerCase() === target.storeCode.trim().toLowerCase()) {
        return true;
      }
      if (target.storeName && r.storeName && r.storeName.trim() === target.storeName.trim()) {
        return true;
      }
      return false;
    });

    for (const h of matchedHearings) {
      await handleDeleteRecord(h.id);
    }

    // 3. Keep currentCallingStore updated if this store was currently loaded
    if (currentCallingStore?.no === storeNo) {
      setCurrentCallingStore(cleanedStore);
    }

    setToastMessage(`NO.${target.no} ${target.storeName} のテスト入力情報を初期化しました（作業担当:S列は保持）。`);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleNewCall = () => {
    setEditingRecord(null);
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
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 shrink-0">
            {syncStatus === 'connected' ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Cloud Firestore連携中（全173店舗マスタ・ヒアリング記録リアルタイム同期中）</span>
              </span>
            ) : syncStatus === 'syncing' ? (
              <span className="inline-flex items-center gap-1.5 text-blue-600 font-medium whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span>クラウド同期中...</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium whitespace-nowrap">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>オフライン保持中（ローカルストレージ自動退避）</span>
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 font-mono hidden md:inline shrink-0 whitespace-nowrap">
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
            onSelectStoreForPostVisit={handleSelectStoreForPostVisit}
            onRequestTestClear={(store) => setTestClearTargetStore(store)}
            onResetDefaults={() => resetAllStoreRecords()}
            onClearStores={handleClearStores}
          />
        )}

        {activeTab === 'simulator' && (
          <LiveCallSimulator
            stores={stores}
            records={records}
            initialStore={currentCallingStore}
            editingRecord={editingRecord}
            onClearEditingRecord={handleClearEditingRecord}
            onUpdateStoreField={handleUpdateStoreField}
            onSaveRecord={handleSaveRecord}
            onGoToChecksheet={() => setActiveTab('checksheet')}
            onSelectStore={handleSelectStoreForCall}
            onBackToLedger={() => setActiveTab('ledger')}
            onRequestTestClear={(store) => setTestClearTargetStore(store)}
          />
        )}

        {activeTab === 'post_visit' && (
          <PostVisitCallNavigator
            stores={stores}
            records={records}
            onUpdateStore={handleUpdateStore}
            onUpdateStoreField={handleUpdateStoreField}
            onGoToLedger={() => setActiveTab('ledger')}
            onSelectStoreForHearing={handleSelectStoreForCall}
            onRequestTestClear={(store) => setTestClearTargetStore(store)}
            initialStoreNo={currentCallingStore?.no}
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
            onEditRecord={handleEditRecord}
            onStartNewHearing={handleNewCall}
          />
        )}
      </main>

      {/* Safety Test Clear Modal */}
      <TestClearModal
        isOpen={Boolean(testClearTargetStore)}
        onClose={() => setTestClearTargetStore(null)}
        store={testClearTargetStore}
        records={records}
        onConfirmClear={handleTestClearStore}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

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
