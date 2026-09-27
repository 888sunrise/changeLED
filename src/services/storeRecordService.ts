/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { StoreRecord } from '../types/hearing';
import { INITIAL_STORE_RECORDS } from '../data/sampleStores';

const COLLECTION_NAME = 'stores_led_records';

/**
 * リアルタイムで店舗レコード（A〜T列）の変更を購読する
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
          // 初期シードデータが存在しない場合はサンプルデータを保存
          seedInitialStoreRecordsIfEmpty();
          onData(INITIAL_STORE_RECORDS);
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
      }
    );
  } catch (error) {
    console.error('Failed to create onSnapshot query:', error);
    if (onError && error instanceof Error) onError(error);
    return () => {};
  }
}

/**
 * 初期27店舗データ投入（空の場合のみ）
 */
export async function seedInitialStoreRecordsIfEmpty(force = false) {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    if (snap.empty || force) {
      for (const rec of INITIAL_STORE_RECORDS) {
        await setDoc(doc(db, COLLECTION_NAME, `store_${rec.no}`), rec);
      }
    }
  } catch (e) {
    console.warn('Initial store seeding note:', e);
  }
}

/**
 * 店舗レコードの更新（J〜T列編集保存）
 */
export async function updateStoreRecordInFirestore(record: StoreRecord): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, `store_${record.no}`);
  await setDoc(docRef, { ...record, updatedAt: new Date().toISOString() }, { merge: true });
}

/**
 * 一括リセットまたは再シード
 */
export async function resetAllStoreRecords(): Promise<void> {
  for (const rec of INITIAL_STORE_RECORDS) {
    await setDoc(doc(db, COLLECTION_NAME, `store_${rec.no}`), rec);
  }
}
