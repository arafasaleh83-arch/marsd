import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { OfficialStatement, OfficialAccount, PopularMoodPost } from '../types';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

// Collections
export const STATEMENTS_COLLECTION = 'official_statements';
export const POPULAR_MOOD_COLLECTION = 'popular_mood_posts';
export const ACCOUNTS_COLLECTION = 'official_accounts';

// Realtime subscription for Official Statements
export function subscribeOfficialStatements(callback: (statements: OfficialStatement[]) => void) {
  const colRef = collection(db, STATEMENTS_COLLECTION);
  return onSnapshot(colRef, (snapshot) => {
    const items: OfficialStatement[] = [];
    snapshot.forEach((docSnap) => {
      items.push(docSnap.data() as OfficialStatement);
    });
    // Sort by pubDate descending
    items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    callback(items);
  }, (err) => {
    console.error('Error listening to official statements in Firestore:', err);
  });
}

// Realtime subscription for Popular Mood Posts
export function subscribePopularMoodPosts(callback: (posts: PopularMoodPost[]) => void) {
  const colRef = collection(db, POPULAR_MOOD_COLLECTION);
  return onSnapshot(colRef, (snapshot) => {
    const items: PopularMoodPost[] = [];
    snapshot.forEach((docSnap) => {
      items.push(docSnap.data() as PopularMoodPost);
    });
    // Sort by pubDate descending
    items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    callback(items);
  }, (err) => {
    console.error('Error listening to popular mood posts in Firestore:', err);
  });
}

// Realtime subscription for Official Accounts
export function subscribeOfficialAccounts(callback: (accounts: OfficialAccount[]) => void) {
  const colRef = collection(db, ACCOUNTS_COLLECTION);
  return onSnapshot(colRef, (snapshot) => {
    const items: OfficialAccount[] = [];
    snapshot.forEach((docSnap) => {
      items.push(docSnap.data() as OfficialAccount);
    });
    callback(items);
  }, (err) => {
    console.error('Error listening to official accounts in Firestore:', err);
  });
}

// Add or update Official Statement
export async function saveOfficialStatementToDb(statement: OfficialStatement): Promise<void> {
  const docRef = doc(db, STATEMENTS_COLLECTION, statement.id);
  const cleanData = JSON.parse(JSON.stringify(statement));
  await setDoc(docRef, cleanData, { merge: true });
}

// Delete Official Statement
export async function deleteOfficialStatementFromDb(id: string): Promise<void> {
  const docRef = doc(db, STATEMENTS_COLLECTION, id);
  await deleteDoc(docRef);
}

// Add or update Popular Mood Post
export async function savePopularMoodPostToDb(post: PopularMoodPost): Promise<void> {
  const docRef = doc(db, POPULAR_MOOD_COLLECTION, post.id);
  const cleanData = JSON.parse(JSON.stringify(post));
  await setDoc(docRef, cleanData, { merge: true });
}

// Delete Popular Mood Post
export async function deletePopularMoodPostFromDb(id: string): Promise<void> {
  const docRef = doc(db, POPULAR_MOOD_COLLECTION, id);
  await deleteDoc(docRef);
}

// Save Official Account
export async function saveOfficialAccountToDb(account: OfficialAccount): Promise<void> {
  const docRef = doc(db, ACCOUNTS_COLLECTION, account.id);
  const cleanData = JSON.parse(JSON.stringify(account));
  await setDoc(docRef, cleanData, { merge: true });
}

// Delete Official Account
export async function deleteOfficialAccountFromDb(id: string): Promise<void> {
  const docRef = doc(db, ACCOUNTS_COLLECTION, id);
  await deleteDoc(docRef);
}

// Initialize default tracked accounts if collection is empty
export async function initializeDefaultAccountsIfEmpty(defaultAccounts: OfficialAccount[]): Promise<void> {
  try {
    const colRef = collection(db, ACCOUNTS_COLLECTION);
    const snap = await getDocs(colRef);
    if (snap.empty && defaultAccounts.length > 0) {
      for (const acc of defaultAccounts) {
        await saveOfficialAccountToDb(acc);
      }
    }
  } catch (err) {
    console.error('Failed to initialize default accounts in Firestore:', err);
  }
}

// Clean up any legacy dummy placeholder posts from Firestore if found
export async function cleanupLegacyPlaceholderPosts(): Promise<void> {
  try {
    const colRef = collection(db, POPULAR_MOOD_COLLECTION);
    const snap = await getDocs(colRef);
    snap.forEach(async (docSnap) => {
      if (docSnap.id.startsWith('pulse_00')) {
        await deleteDoc(doc(db, POPULAR_MOOD_COLLECTION, docSnap.id));
      }
    });
  } catch (err) {
    console.error('Failed to cleanup legacy placeholders in Firestore:', err);
  }
}

// Initialize default popular mood posts - disabled to allow only manual uploads
export async function initializeDefaultPopularMoodIfEmpty(_defaultPosts: PopularMoodPost[]): Promise<void> {
  // No default posts injected - only manual uploads
}

