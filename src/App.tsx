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
import { HearingRecord, StoreRecord, getHearingRecordId, isSameStore, getStoreKey } from './types/hearing';
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
          return parsed.map((s) =>
            (s.storeName === '新津田沼' || s.no === 1) && s.storeMobile !== '080-4601-3074'
              ? { ...s, storeMobile: '080-4601-3074' }
              : s
          );
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
        const sanitized = remoteStores.map((s) => {
          if ((s.storeName === '新津田沼' || s.no === 1) && s.storeMobile !== '080-4601-3074') {
            const fixed = { ...s, storeMobile: '080-4601-3074' };
            updateStoreRecordInFirestore(fixed).catch(() => {});
            return fixed;
          }
          return s;
        });
        setStores(sanitized);
        setSyncStatus('connected');
        try {
          localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(sanitized));
        } catch {}
      },
      (err) => {
        console.warn('Store sync note:', err);
        setSyncStatus('offline');
      }
    );

    // 2. Subscribe to Detailed Hearing Records (with robust multi-criterion deduplication)
    const unsubHearings = subscribeHearingRecords(
      (remoteRecords) => {
        const seenStoreKeys = new Set<string>();
        const uniqueRecords: HearingRecord[] = [];
        const duplicateIdsToDelete: string[] = [];

        // Sort so completed / all_led records take precedence, then newest timestamp
        const sorted = [...remoteRecords].sort((a, b) => {
          const aComp = (a.status === 'completed' || a.ledStatus === 'all_led') ? 1 : 0;
          const bComp = (b.status === 'completed' || b.ledStatus === 'all_led') ? 1 : 0;
          if (aComp !== bComp) return bComp - aComp;
          return (b.timestamp || '').localeCompare(a.timestamp || '');
        });

        for (const r of sorted) {
          const key = getStoreKey(r, INITIAL_STORE_RECORDS);

          if (!seenStoreKeys.has(key)) {
            seenStoreKeys.add(key);
            uniqueRecords.push(r);
          } else {
            // Duplicate record found for this store!
            duplicateIdsToDelete.push(r.id);
          }
        }

        // Delete duplicate records from Firestore in background
        if (duplicateIdsToDelete.length > 0) {
          duplicateIdsToDelete.forEach((dupId) => {
            deleteHearingRecordFromFirestore(dupId).catch((err) => {
              console.warn('Failed to clean duplicate hearing record:', err);
            });
          });
        }

        setRecords(uniqueRecords);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueRecords));
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

  // 連動同期: 台帳側で「対象外」または「全灯LED」の店舗は、記録カルテのLED化状況を「全灯LED済」、訪問調査要否を「not_required (案件終了・調査不要)」に自動同期
  useEffect(() => {
    if (stores.length === 0) return;
    const allLedStores = stores.filter(
      (s) =>
        s.surveyDocCollection === '対象外' ||
        (Boolean(s.remarks1) && s.remarks1.includes('全灯LED'))
    );
    if (allLedStores.length === 0) return;

    let hasChanges = false;
    let nextList = [...records];

    allLedStores.forEach((s) => {
      const matchIdx = nextList.findIndex((r) =>
        isSameStore({ storeCode: s.storeCode, storeName: s.storeName, no: s.no }, r) ||
        getStoreKey(r, stores) === getStoreKey({ storeId: s.storeCode, storeName: s.storeName }, stores)
      );

      if (matchIdx >= 0) {
        const r = nextList[matchIdx];
        if (r.ledStatus !== 'all_led' || r.surveyRequirement !== 'not_required') {
          hasChanges = true;
          const updated: HearingRecord = {
            ...r,
            storeId: s.storeCode || r.storeId,
            storeName: s.storeName || r.storeName,
            ledStatus: 'all_led',
            surveyRequirement: 'not_required',
            status: 'completed',
            callStatus: '完了',
            autoCompletedByDocScope: true,
          };
          nextList[matchIdx] = updated;
          saveHearingRecordToFirestore(updated).catch(() => {});
        }
      } else {
        const canonicalId = getHearingRecordId(s.storeCode, s.storeName, s.no);
        const alreadyExists = nextList.some((r) =>
          r.id === canonicalId ||
          isSameStore({ storeCode: s.storeCode, storeName: s.storeName, no: s.no }, r) ||
          getStoreKey(r, stores) === getStoreKey({ storeId: s.storeCode, storeName: s.storeName }, stores)
        );

        if (!alreadyExists) {
          hasChanges = true;
          const newRecord: HearingRecord = {
            id: canonicalId,
            timestamp: new Date().toLocaleString('ja-JP', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }),
            operatorName: s.surveyAssignee || '自動連動',
            storeName: s.storeName,
            storeId: s.storeCode,
            contactPerson: s.phoneContact || 'ご担当者様',
            phoneNumber: s.representativePhone || s.storeMobile || '',
            ledStatus: 'all_led',
            surveyRequirement: 'not_required',
            locationCategory:
              s.category === 'ビルイン'
                ? 'builtin'
                : s.category === 'フードコート'
                ? 'foodcourt'
                : s.category === 'ロードサイド'
                ? 'freesta'
                : 'unspecified',
            status: 'completed',
            callStatus: '完了',
            autoCompletedByDocScope: true,
            notes: '全灯LED済・案件終了に自動同期',
            afterHoursTriggered: false,
            keyCustody: 'not_applicable',
          };
          nextList.unshift(newRecord);
          saveHearingRecordToFirestore(newRecord).catch(() => {});
        }
      }
    });

    // Final deduplication pass to ensure strictly 1 record per store
    const seen = new Set<string>();
    const deduplicatedList: HearingRecord[] = [];
    for (const item of nextList) {
      const k = getStoreKey(item, stores);
      if (!seen.has(k)) {
        seen.add(k);
        deduplicatedList.push(item);
      }
    }

    if (hasChanges || deduplicatedList.length !== records.length) {
      setRecords(deduplicatedList);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicatedList));
      } catch {}
    }
  }, [stores, records]);

  // Update a single Store record (J〜T column update)
  const handleUpdateStore = async (updated: StoreRecord) => {
    // 連動: P: 調査資料回収・結果が「対象外」またはremarks1に「全灯LED」を含む場合は作業が発生しないためU: 完了を「完了」にする
    const isOutOfScope =
      updated.surveyDocCollection === '対象外' ||
      (Boolean(updated.remarks1) && updated.remarks1.includes('全灯LED'));

    const normalized: StoreRecord =
      isOutOfScope
        ? {
            ...updated,
            surveyDocCollection: '対象外',
            completion: '完了',
            replacementRequest: updated.replacementRequest === '未依頼' ? '対象外' : updated.replacementRequest,
            itemOrdering: updated.itemOrdering === '未手配' ? '完了' : updated.itemOrdering,
            scheduleNotice: updated.scheduleNotice === '未連絡' ? '連絡済' : updated.scheduleNotice,
          }
        : updated;

    setStores((prev) => prev.map((s) => (s.no === normalized.no ? normalized : s)));
    setCurrentCallingStore((prev) => (prev && prev.no === normalized.no ? normalized : prev));

    const storeCodeLower = normalized.storeCode?.trim().toLowerCase();
    const storeNameTrimmed = normalized.storeName?.trim();

    setRecords((prev) => {
      const targetKey = getStoreKey({ storeId: normalized.storeCode, storeName: normalized.storeName }, stores);
      const existingIdx = prev.findIndex((r) =>
        (storeCodeLower && r.storeId && r.storeId.trim().toLowerCase() === storeCodeLower) ||
        (storeNameTrimmed && r.storeName && r.storeName.trim() === storeNameTrimmed) ||
        isSameStore(normalized, r) ||
        getStoreKey(r, stores) === targetKey
      );

      let nextList: HearingRecord[] = [...prev];
      let recordToPersist: HearingRecord | null = null;

      if (isOutOfScope) {
        if (existingIdx >= 0) {
          const existing = prev[existingIdx];
          recordToPersist = {
            ...existing,
            storeId: normalized.storeCode || existing.storeId,
            storeName: normalized.storeName || existing.storeName,
            ledStatus: 'all_led',
            surveyRequirement: 'not_required',
            status: 'completed',
            callStatus: '完了',
            autoCompletedByDocScope: true,
            notes: existing.notes
              ? existing.notes.includes('全灯LED済')
                ? existing.notes
                : `${existing.notes}（全灯LED済・訪問調査不要）`
              : '全灯LED済・案件終了に自動更新',
          };
          nextList[existingIdx] = recordToPersist;
        } else {
          recordToPersist = {
            id: getHearingRecordId(normalized.storeCode, normalized.storeName, normalized.no),
            timestamp: new Date().toLocaleString('ja-JP', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }),
            operatorName: normalized.surveyAssignee || '自動連動',
            storeName: normalized.storeName,
            storeId: normalized.storeCode,
            contactPerson: normalized.phoneContact || 'ご担当者様',
            phoneNumber: normalized.representativePhone || normalized.storeMobile || '',
            ledStatus: 'all_led',
            surveyRequirement: 'not_required',
            locationCategory:
              normalized.category === 'ビルイン'
                ? 'builtin'
                : normalized.category === 'フードコート'
                ? 'foodcourt'
                : normalized.category === 'ロードサイド'
                ? 'freesta'
                : 'unspecified',
            status: 'completed',
            callStatus: '完了',
            autoCompletedByDocScope: true,
            notes: '全灯LED済・案件終了に自動更新',
            afterHoursTriggered: false,
            keyCustody: 'not_applicable',
          };
          nextList = [recordToPersist, ...nextList];
        }
      } else if (
        existingIdx >= 0 &&
        prev[existingIdx].autoCompletedByDocScope &&
        normalized.surveyDocCollection !== '対象外' &&
        normalized.completion !== '完了' &&
        !normalized.remarks1?.includes('全灯LED')
      ) {
        // もし以前に全灯LED・P列「対象外」で自動連動完了された店舗が手動で「未回収」かつ「未完了」に戻された場合のみ復元
        const existing = prev[existingIdx];
        recordToPersist = {
          ...existing,
          ledStatus: 'partial_led',
          surveyRequirement: 'required',
          status: 'follow_up_needed',
          callStatus: '再連絡待ち',
          autoCompletedByDocScope: false,
        };
        nextList[existingIdx] = recordToPersist;
      }

      // Deduplicate nextList strictly
      const seen = new Set<string>();
      const deduplicated: HearingRecord[] = [];
      for (const item of nextList) {
        const k = getStoreKey(item, stores);
        if (!seen.has(k)) {
          seen.add(k);
          deduplicated.push(item);
        }
      }
      nextList = deduplicated;

      // 調査確定日（O列）が確定された場合、カルテの訪問予定期間・時間を上書き更新（※〇日〜〇日⇒〇日で確定となるため通話ナビで登録した予定日は削除し上書き）
      if (normalized.surveyConfirmed && normalized.surveyConfirmedDate) {
        if (existingIdx >= 0) {
          const existing = prev[existingIdx];
          const updatedHearing: HearingRecord = {
            ...(recordToPersist || existing),
            visitPeriodStart: normalized.surveyConfirmedDate,
            visitPeriodEnd: '', // 予定期間終了日は削除・クリア（単一日確定）
            preferredDate1: normalized.surveyConfirmedDate,
            preferredTimeSlot1: normalized.surveyConfirmedTime || existing.preferredTimeSlot1,
          };
          recordToPersist = updatedHearing;
          nextList[existingIdx] = updatedHearing;
        }
      }

      if (recordToPersist) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
        } catch {}
        saveHearingRecordToFirestore(recordToPersist).catch((err) => {
          console.error('Failed to auto-save hearing record from P column sync:', err);
        });
      }

      return nextList;
    });

    try {
      setSyncStatus('syncing');
      await updateStoreRecordInFirestore(normalized);
      setSyncStatus('connected');
    } catch (err) {
      console.error('Failed to update store in Firestore:', err);
      setSyncStatus('offline');
    }
  };

  // Bulk update store records (CSV Diff Import) - persists directly to Firestore
  const handleBulkUpdateStores = async (updatedList: StoreRecord[]) => {
    if (!updatedList || updatedList.length === 0) return;
    const normalizedList = updatedList.map((s) =>
      s.surveyDocCollection === '対象外' ? { ...s, completion: '完了' } : s
    );
    const updateMap = new Map(normalizedList.map((s) => [s.no, s]));
    setStores((prev) => {
      const existingNos = new Set(prev.map((s) => s.no));
      const updatedExisting = prev.map((s) => updateMap.get(s.no) || s);
      const newItems = normalizedList.filter((s) => !existingNos.has(s.no));
      const combined = [...updatedExisting, ...newItems].sort((a, b) => a.no - b.no);
      try {
        localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(combined));
      } catch {}
      return combined;
    });

    try {
      setSyncStatus('syncing');
      await bulkUpdateStoreRecords(normalizedList);
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

  // Update multiple fields of a store atomically without race conditions
  const handleUpdateStoreFields = async (storeNo: number, fields: Partial<StoreRecord>) => {
    setCurrentCallingStore((prev) => {
      if (prev && prev.no === storeNo) {
        const updated = { ...prev, ...fields };
        if (fields.callStatus) updated.phoneStatus = fields.callStatus;
        else if (fields.phoneStatus) updated.callStatus = fields.phoneStatus;
        if (fields.surveyDocCollection === '対象外' || (fields.remarks1 && fields.remarks1.includes('全灯LED'))) {
          updated.completion = '完了';
          updated.surveyDocCollection = '対象外';
        }
        return updated;
      }
      return prev;
    });

    const target = stores.find((s) => s.no === storeNo);
    if (!target) return;
    const updated = { ...target, ...fields };
    if (fields.callStatus) {
      updated.phoneStatus = fields.callStatus;
    } else if (fields.phoneStatus) {
      updated.callStatus = fields.phoneStatus;
    }
    if (fields.surveyDocCollection === '対象外' || (fields.remarks1 && fields.remarks1.includes('全灯LED'))) {
      updated.completion = '完了';
      updated.surveyDocCollection = '対象外';
    }
    await handleUpdateStore(updated);
  };

  // Update single field of store
  const handleUpdateStoreField = (storeNo: number, field: keyof StoreRecord, value: any) => {
    handleUpdateStoreFields(storeNo, { [field]: value });
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
    const isCompleted =
      newRecord.status === 'completed' ||
      newRecord.callStatus === '完了' ||
      newRecord.surveyRequirement !== 'pending';

    // Canonical store info resolution
    const matchStore = stores.find(
      (s) =>
        (newRecord.storeId && s.storeCode && s.storeCode.trim().toLowerCase() === newRecord.storeId.trim().toLowerCase()) ||
        (newRecord.storeName && s.storeName && s.storeName.trim() === newRecord.storeName.trim())
    );

    const canonicalStoreCode = matchStore?.storeCode || newRecord.storeId || '';
    const canonicalStoreName = matchStore?.storeName || newRecord.storeName || '';
    const targetKey = getStoreKey({ storeId: canonicalStoreCode, storeName: canonicalStoreName, id: newRecord.id }, stores);

    // 連動: 記録カルテが全灯LED済または調査不要となった場合、店舗台帳側も確実に完了・対象外に連動
    if (newRecord.ledStatus === 'all_led' || newRecord.surveyRequirement === 'not_required') {
      if (matchStore) {
        const updatedStore: StoreRecord = {
          ...matchStore,
          callStatus: '完了',
          phoneStatus: '完了',
          phoneContact: newRecord.contactPerson || matchStore.phoneContact || '',
          remarks1:
            matchStore.remarks1 && matchStore.remarks1.includes('全灯LED')
              ? matchStore.remarks1
              : '全灯LED済み（訪問調査不要）',
          surveyDocCollection: '対象外',
          replacementRequest: '対象外',
          itemOrdering: '完了',
          scheduleNotice: '連絡済',
          completion: '完了',
        };
        setStores((prev) => prev.map((s) => (s.no === updatedStore.no ? updatedStore : s)));
        setCurrentCallingStore((prev) => (prev && prev.no === updatedStore.no ? updatedStore : prev));
        updateStoreRecordInFirestore(updatedStore).catch((err) => {
          console.error('Failed to sync store to firestore from hearing record all_led save:', err);
        });
      }
    }

    // Synchronously resolve existing record and target ID to avoid async race
    const existing = records.find((r) =>
      r.id === newRecord.id ||
      isSameStore(r, newRecord) ||
      getStoreKey(r, stores) === targetKey
    );

    const targetDocId = existing
      ? existing.id
      : (matchStore && matchStore.storeCode
          ? getHearingRecordId(matchStore.storeCode, matchStore.storeName, matchStore.no)
          : (newRecord.id && !newRecord.id.includes('temp') && !newRecord.id.startsWith('rec-')
              ? newRecord.id
              : getHearingRecordId(canonicalStoreCode, canonicalStoreName)));

    // Stale duplicate IDs to clean up from Firestore
    const staleDuplicateIds = records
      .filter((r) => {
        if (r.id === targetDocId) return false;
        return isSameStore(r, newRecord) || getStoreKey(r, stores) === targetKey;
      })
      .map((r) => r.id);

    if (newRecord.id !== targetDocId && !staleDuplicateIds.includes(newRecord.id)) {
      staleDuplicateIds.push(newRecord.id);
    }

    const mergedRecord: HearingRecord = {
      ...(existing || {}),
      ...newRecord,
      storeId: canonicalStoreCode || newRecord.storeId,
      storeName: canonicalStoreName || newRecord.storeName,
      id: targetDocId,
      callbackScheduledAt: isCompleted ? '' : (newRecord.callbackScheduledAt ?? existing?.callbackScheduledAt ?? ''),
      callbackNotes: isCompleted ? '' : (newRecord.callbackNotes ?? existing?.callbackNotes ?? ''),
    };

    setRecords((prev) => {
      const filtered = prev.filter((r) => {
        if (r.id === targetDocId) return false;
        if (staleDuplicateIds.includes(r.id)) return false;
        if (isSameStore(r, newRecord) || getStoreKey(r, stores) === targetKey) return false;
        return true;
      });

      const nextList = [mergedRecord, ...filtered];
      // Final deduplication pass
      const seen = new Set<string>();
      const deduplicated: HearingRecord[] = [];
      for (const item of nextList) {
        const k = getStoreKey(item, stores);
        if (!seen.has(k)) {
          seen.add(k);
          deduplicated.push(item);
        }
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicated));
      } catch {}
      return deduplicated;
    });

    try {
      setSyncStatus('syncing');
      await saveHearingRecordToFirestore(mergedRecord);
      for (const staleId of staleDuplicateIds) {
        try {
          await deleteHearingRecordFromFirestore(staleId);
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
            onUpdateStoreFields={handleUpdateStoreFields}
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
            stores={stores}
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
