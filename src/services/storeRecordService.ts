/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  setDoc,
  getDocs,
  writeBatch,
  query,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { StoreRecord } from '../types/hearing';
import { INITIAL_STORE_RECORDS } from '../data/sampleStores';

const COLLECTION_NAME = 'stores_led_records';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Firestoreへ保存する前のレコード整形（undefinedを排除してエラーを防ぐ）
 */
export function sanitizeStoreRecord(rec: StoreRecord): Record<string, any> {
  const no = typeof rec.no === 'number' ? rec.no : Number(rec.no) || 0;
  return {
    no,
    storeCode: String(rec.storeCode ?? '').trim(),
    representativePhone: String(rec.representativePhone ?? '').trim(),
    storeName: String(rec.storeName ?? '').trim(),
    address1: String(rec.address1 ?? '').trim(),
    address2: String(rec.address2 ?? '').trim(),
    buildingName: String(rec.buildingName ?? '').trim(),
    storeMobile: String(rec.storeMobile ?? '').trim(),
    managementType: String(rec.managementType ?? '').trim(),
    remarks1: String(rec.remarks1 ?? '').trim(),
    category: String(rec.category ?? '未設定').trim() || '未設定',
    hasDrawing: String(rec.hasDrawing ?? '').trim(),
    phoneStatus: String(rec.phoneStatus ?? '未架電').trim() || '未架電',
    surveyAssignee: String(rec.surveyAssignee ?? '').trim(),
    surveyDate: String(rec.surveyDate ?? '').trim(),
    surveyDocCollection: String(rec.surveyDocCollection ?? '未回収').trim() || '未回収',
    replacementRequest: String(rec.replacementRequest ?? '未依頼').trim() || '未依頼',
    itemOrdering: String(rec.itemOrdering ?? '未手配').trim() || '未手配',
    workAssignee: String(rec.workAssignee ?? '').trim(),
    scheduleNotice: String(rec.scheduleNotice ?? '未連絡').trim() || '未連絡',
    completion: String(rec.completion ?? '未完了').trim() || '未完了',
    updatedAt: rec.updatedAt || new Date().toISOString(),
  };
}

/**
 * リアルタイムで店舗レコード（A〜U列）の変更を購読する
 * Firestoreがデータソースの真実（Source of Truth）。
 * 空の場合は空配列を返し、自動で再シードしない（初期化時にデータ0件とするため）。
 */
export function subscribeStoreRecords(
  onData: (records: StoreRecord[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          // 初期化済みまたはデータなしの場合は0件として反映
          onData([]);
          return;
        }

        const items: StoreRecord[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as StoreRecord);
        });

        // NO列で昇順ソート
        items.sort((a, b) => a.no - b.no);
        onData(items);
      },
      (error) => {
        console.error('Firestore onSnapshot error:', error);
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
      }
    );
  } catch (error) {
    console.error('Failed to create onSnapshot query:', error);
    if (onError && error instanceof Error) onError(error);
    return () => {};
  }
}

/**
 * 単一店舗レコードの更新（J〜U列インライン編集保存）
 */
export async function updateStoreRecordInFirestore(record: StoreRecord): Promise<void> {
  const path = `${COLLECTION_NAME}/store_${record.no}`;
  try {
    const docRef = doc(db, COLLECTION_NAME, `store_${record.no}`);
    const sanitized = sanitizeStoreRecord(record);
    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * 差分更新または新規店舗レコード群を一括保存（Firestore writeBatch）
 * 400件単位でチャンク分割コミット
 */
export async function bulkSaveStoreRecords(records: StoreRecord[]): Promise<void> {
  if (!records || records.length === 0) return;
  const chunkSize = 400;
  const now = new Date().toISOString();

  try {
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      chunk.forEach((rec) => {
        const sanitized = sanitizeStoreRecord({ ...rec, updatedAt: now });
        const docRef = doc(db, COLLECTION_NAME, `store_${sanitized.no}`);
        batch.set(docRef, sanitized, { merge: true });
      });

      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
  }
}

/**
 * 互換性のためのエイリアス
 */
export const bulkUpdateStoreRecords = bulkSaveStoreRecords;

/**
 * 全店舗データをCloud Firestoreから完全クリア（0件初期化）
 * 管理者操作用
 */
export async function clearAllStoreRecords(): Promise<number> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    if (snap.empty) return 0;

    const docs = snap.docs;
    const chunkSize = 400;
    for (let i = 0; i < docs.length; i += chunkSize) {
      const chunk = docs.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    return docs.length;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, COLLECTION_NAME);
  }
}

/**
 * 初期173店舗マスタデータをFirestoreに一括投入
 * 管理者操作用
 */
export async function seedInitial173StoreRecords(): Promise<void> {
  try {
    const chunkSize = 400;
    const now = new Date().toISOString();
    for (let i = 0; i < INITIAL_STORE_RECORDS.length; i += chunkSize) {
      const chunk = INITIAL_STORE_RECORDS.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((rec) => {
        const sanitized = sanitizeStoreRecord({ ...rec, updatedAt: now });
        const docRef = doc(db, COLLECTION_NAME, `store_${sanitized.no}`);
        batch.set(docRef, sanitized);
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
  }
}

/**
 * 旧リセット用関数（互換性保持）
 */
export async function resetAllStoreRecords(): Promise<void> {
  await seedInitial173StoreRecords();
}
