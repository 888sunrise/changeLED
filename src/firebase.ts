/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase safely
let appInstance: any = null;
let dbInstance: any = null;

try {
  appInstance = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  dbInstance = firebaseConfig.firestoreDatabaseId
    ? getFirestore(appInstance, firebaseConfig.firestoreDatabaseId)
    : getFirestore(appInstance);
} catch (initErr) {
  console.warn('Firebase initialization warning (running in offline mode):', initErr);
}

export const app = appInstance;
export const db = dbInstance;

// Connection test
export async function testConnection(): Promise<boolean> {
  if (!db) return false;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection check: offline or awaiting connect');
    }
    return false;
  }
}
