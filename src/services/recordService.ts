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
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { HearingRecord } from '../types/hearing';
import { INITIAL_SAMPLE_RECORDS } from '../data/sampleRecords';

const COLLECTION_NAME = 'hearing_records';

/**
 * リアルタイムでヒアリング記録の変更を購読する
 */
export function subscribeHearingRecords(
  onData: (records: HearingRecord[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          // 初回のみ初期シードデータを保存（一度シード済みの場合は0件として正常反映）
          const hasSeeded = typeof window !== 'undefined' ? localStorage.getItem('led_hearing_records_seeded') : null;
          if (!hasSeeded) {
            seedInitialRecordsIfEmpty();
            if (typeof window !== 'undefined') {
              localStorage.setItem('led_hearing_records_seeded', 'true');
            }
            onData(INITIAL_SAMPLE_RECORDS);
          } else {
            onData([]);
          }
          return;
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('led_hearing_records_seeded', 'true');
        }
        const items: HearingRecord[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as HearingRecord);
        });

        // タイムスタンプ順でソート（降順）
        items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
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
 * 初期データ投入（空の場合のみ）
 */
async function seedInitialRecordsIfEmpty() {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    if (snap.empty) {
      for (const rec of INITIAL_SAMPLE_RECORDS) {
        await setDoc(doc(db, COLLECTION_NAME, rec.id), rec);
      }
    }
  } catch (e) {
    console.warn('Initial seeding note:', e);
  }
}

/**
 * ヒアリング記録をFirestoreに新規保存または更新
 */
export async function saveHearingRecordToFirestore(record: HearingRecord): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, record.id);
  await setDoc(docRef, record, { merge: true });
}

/**
 * ヒアリング記録をFirestoreから削除
 */
export async function deleteHearingRecordFromFirestore(recordId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, recordId);
  await deleteDoc(docRef);
}
