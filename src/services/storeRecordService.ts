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
 * リアルタイムで店舗レコード（A〜U列）の変更を購読する
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
        if (snapshot.empty || snapshot.size <= 27) {
          // 旧27店舗データまたは空の場合は173店舗新データへ自動更新・再シード
          resetAllStoreRecords().catch((e) => console.warn('Seed 173 stores note:', e));
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
 * 初期173店舗データ投入（空または旧27店舗の場合）
 */
export async function seedInitialStoreRecordsIfEmpty(force = false) {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    if (snap.empty || snap.size <= 27 || force) {
      await resetAllStoreRecords();
    }
  } catch (e) {
    console.warn('Initial store seeding note:', e);
  }
}

/**
 * 店舗レコードの更新（J〜U列編集保存）
 */
export async function updateStoreRecordInFirestore(record: StoreRecord): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, `store_${record.no}`);
  await setDoc(docRef, { ...record, updatedAt: new Date().toISOString() }, { merge: true });
}

/**
 * 旧27店舗データを全削除し、全173店舗データを一括投入
 */
export async function resetAllStoreRecords(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);

    // 173店舗を50件ずつバッチ書き込み
    const chunkSize = 50;
    for (let i = 0; i < INITIAL_STORE_RECORDS.length; i += chunkSize) {
      const chunk = INITIAL_STORE_RECORDS.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map((rec) => setDoc(doc(db, COLLECTION_NAME, `store_${rec.no}`), rec))
      );
    }
  } catch (err) {
    console.error('Failed to reset all store records in Firestore:', err);
  }
}
