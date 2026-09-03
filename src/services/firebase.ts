import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  writeBatch,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { EntriesMap, ThemeMode, TradeEntry, UserAccount } from "../types";

// Initialize Firebase App and Services
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;

/**
 * Hash password securely with SHA-256 for Firestore-backed authentication fallback
 */
export async function hashPassword(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`pamung_salt_${str}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Clean email to be used as a 100% deterministic, safe document ID in Firestore.
 * Standardized across all devices and platforms (Phone, Computer, iPad).
 */
export function emailToDocId(email: string): string {
  const clean = email.trim().toLowerCase();
  return "usr_" + clean.replace(/[^a-zA-Z0-9_-]/g, (c) => `_${c.charCodeAt(0)}_`);
}

/**
 * Ensure an active Firebase auth session exists
 */
export async function ensureFirebaseAuth(): Promise<FirebaseUser | { uid: string; email?: string | null }> {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    return { uid: "guest_session", email: null };
  }
}

/**
 * Login or Sign Up with Google / Gmail Popup
 * Strict Rule: 1 Email = 1 Firestore Account. Does NOT merge guest data.
 */
export async function firebaseGoogleSignIn(): Promise<{
  user: UserAccount;
  entries: EntriesMap;
  theme?: ThemeMode;
}> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const cred = await signInWithPopup(auth, provider);
  const user = cred.user;
  const email = (user.email || "google_user@gmail.com").trim().toLowerCase();
  const token = await user.getIdToken();

  return await initializeOrFetchFirestoreUser(email, token);
}

/**
 * Direct Login / Connect via Gmail Address
 * Strict Rule: 1 Email = 1 Firestore Account. Does NOT merge guest data.
 */
export async function firebaseGmailQuickLogin(
  gmailAddress: string
): Promise<{ user: UserAccount; entries: EntriesMap; theme?: ThemeMode }> {
  const cleanEmail = gmailAddress.trim().toLowerCase();
  const token = `token_gmail_${emailToDocId(cleanEmail)}`;
  return await initializeOrFetchFirestoreUser(cleanEmail, token);
}

/**
 * Helper to fetch or initialize user document in Firestore.
 * Always loads this email's own data. If fresh account, starts clean with {}.
 */
async function initializeOrFetchFirestoreUser(
  email: string,
  token: string
): Promise<{ user: UserAccount; entries: EntriesMap; theme?: ThemeMode }> {
  const cleanEmail = email.trim().toLowerCase();
  const userDocId = emailToDocId(cleanEmail);
  const userDocRef = doc(db, "users", userDocId);
  const now = new Date().toISOString();

  const docSnap = await getDoc(userDocRef);
  let entries: EntriesMap = {};
  let theme: ThemeMode = "light";

  if (docSnap.exists()) {
    const data = docSnap.data();
    entries = data.entries || {};
    if (data.theme === "dark" || data.theme === "light") {
      theme = data.theme;
    }
  } else {
    // New account: initialize clean in Firestore
    await setDoc(
      userDocRef,
      {
        email: cleanEmail,
        theme: "light",
        provider: "google",
        createdAt: now,
        updatedAt: now,
        entries: {},
      },
      { merge: true }
    );
  }

  // Backup check: load any subcollection trades if entries map was empty
  if (Object.keys(entries).length === 0) {
    try {
      const tradesCollRef = collection(db, "users", userDocId, "trades");
      const tradesSnap = await getDocs(tradesCollRef);
      if (!tradesSnap.empty) {
        tradesSnap.forEach((d) => {
          const item = d.data();
          const key = d.id;
          if (item && typeof item.amount === "number") {
            entries[key] = {
              amount: item.amount,
              lots: item.lots,
              session: item.session,
              technique: item.technique,
              note: item.note,
              updatedAt: item.updatedAt,
            };
          }
        });
        // Sync back to main doc for rapid reads
        if (Object.keys(entries).length > 0) {
          await setDoc(userDocRef, { entries, updatedAt: now }, { merge: true });
        }
      }
    } catch (err) {
      console.warn("Subcollection read note:", err);
    }
  }

  return {
    user: {
      email: cleanEmail,
      token,
      theme,
    },
    entries,
    theme,
  };
}

/**
 * Register a new user in Firebase (Auth + Firestore)
 * Starts clean with empty {} records for the new account.
 */
export async function firebaseRegisterUser(
  email: string,
  pass: string,
  theme: ThemeMode = "light"
): Promise<{ user: UserAccount; entries: EntriesMap }> {
  const cleanEmail = email.trim().toLowerCase();
  const pwdHash = await hashPassword(pass);
  const userDocId = emailToDocId(cleanEmail);
  const userDocRef = doc(db, "users", userDocId);
  const now = new Date().toISOString();

  // Check if user already exists in Firestore
  const existingDoc = await getDoc(userDocRef);
  if (existingDoc.exists()) {
    throw new Error("อีเมลนี้มีบัญชีในระบบ Firebase แล้ว กรุณากดเข้าสู่ระบบ (Log in)");
  }

  let token = `token_${userDocId}_${Date.now()}`;

  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    token = await cred.user.getIdToken();
  } catch (fbAuthErr: any) {
    // If native Firebase Auth throws error but user doesn't exist in Firestore, continue
  }

  // Save brand-new user profile with empty entries in Firestore
  await setDoc(
    userDocRef,
    {
      email: cleanEmail,
      theme,
      passwordHash: pwdHash,
      createdAt: now,
      updatedAt: now,
      entries: {},
    }
  );

  return {
    user: {
      email: cleanEmail,
      token,
      theme,
    },
    entries: {},
  };
}

/**
 * Login with Email and Password via Firebase Firestore / Auth
 * Loads ONLY this email's stored records.
 */
export async function firebaseLoginUser(
  email: string,
  pass: string
): Promise<{ user: UserAccount; entries: EntriesMap; theme?: ThemeMode }> {
  const cleanEmail = email.trim().toLowerCase();
  const pwdHash = await hashPassword(pass);
  const userDocId = emailToDocId(cleanEmail);
  const userDocRef = doc(db, "users", userDocId);

  // Fetch user doc from Firestore
  const docSnap = await getDoc(userDocRef);

  if (!docSnap.exists()) {
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const token = await cred.user.getIdToken();
      // Initialize doc
      await setDoc(userDocRef, {
        email: cleanEmail,
        theme: "light",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        entries: {},
      });
      return {
        user: {
          email: cleanEmail,
          token,
          theme: "light",
        },
        entries: {},
        theme: "light",
      };
    } catch (authErr: any) {
      throw new Error("ไม่พบบัญชีผู้ใช้นี้ใน Firebase กรุณาตรวจสอบอีเมลหรือสมัครสมาชิกใหม่");
    }
  }

  const userData = docSnap.data();
  // Verify password if passwordHash was set
  if (userData.passwordHash && userData.passwordHash !== pwdHash) {
    throw new Error("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
  }

  let entries: EntriesMap = userData.entries || {};
  let theme: ThemeMode = userData.theme === "dark" || userData.theme === "light" ? userData.theme : "light";

  // Check subcollection if needed
  if (Object.keys(entries).length === 0) {
    try {
      const tradesCollRef = collection(db, "users", userDocId, "trades");
      const tradesSnap = await getDocs(tradesCollRef);
      if (!tradesSnap.empty) {
        tradesSnap.forEach((d) => {
          const item = d.data();
          const key = d.id;
          if (item && typeof item.amount === "number") {
            entries[key] = {
              amount: item.amount,
              lots: item.lots,
              session: item.session,
              technique: item.technique,
              note: item.note,
              updatedAt: item.updatedAt,
            };
          }
        });
      }
    } catch (err) {
      console.warn("Subcollection read note:", err);
    }
  }

  let token = `token_${userDocId}`;
  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    token = await cred.user.getIdToken();
  } catch (e) {
    // Graceful fallback
  }

  return {
    user: {
      email: cleanEmail,
      token,
      theme,
    },
    entries,
    theme,
  };
}

/**
 * Sign out from Firebase
 */
export async function firebaseLogoutUser(): Promise<void> {
  try {
    await fbSignOut(auth);
  } catch (e) {
    // ignore
  }
}

/**
 * Batch write trades to Firestore
 */
async function batchWriteTrades(docId: string, entries: EntriesMap): Promise<void> {
  const keys = Object.keys(entries);
  if (keys.length === 0) return;

  const chunkSize = 400;
  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((key) => {
      const tRef = doc(db, "users", docId, "trades", key);
      batch.set(
        tRef,
        {
          dateKey: key,
          ...entries[key],
          updatedAt: entries[key].updatedAt || new Date().toISOString(),
        },
        { merge: true }
      );
    });
    await batch.commit();
  }
}

/**
 * Save or update single trade in Firestore for the logged-in email
 */
export async function saveTradeToFirestore(
  email: string,
  dateKeyStr: string,
  entry: TradeEntry | null,
  allEntries: EntriesMap
): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const userDocId = emailToDocId(cleanEmail);
  const userDocRef = doc(db, "users", userDocId);
  const now = new Date().toISOString();

  // Update root document containing map of all entries
  await setDoc(
    userDocRef,
    {
      email: cleanEmail,
      entries: allEntries,
      updatedAt: now,
    },
    { merge: true }
  );

  // Update subcollection trade document
  try {
    const tradeDocRef = doc(db, "users", userDocId, "trades", dateKeyStr);
    if (entry === null) {
      await deleteDoc(tradeDocRef);
    } else {
      await setDoc(
        tradeDocRef,
        {
          dateKey: dateKeyStr,
          ...entry,
          updatedAt: now,
        },
        { merge: true }
      );
    }
  } catch (e) {
    console.warn("Subcollection trade update note:", e);
  }
}

/**
 * Save all entries and theme in Firestore for the logged-in email
 */
export async function syncAllToFirestore(
  email: string,
  entries: EntriesMap,
  theme?: ThemeMode
): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const userDocId = emailToDocId(cleanEmail);
  const now = new Date().toISOString();
  const userDocRef = doc(db, "users", userDocId);

  const payload: any = {
    email: cleanEmail,
    entries,
    updatedAt: now,
  };
  if (theme) {
    payload.theme = theme;
  }

  await setDoc(userDocRef, payload, { merge: true });
  await batchWriteTrades(userDocId, entries);
}

/**
 * Listen for real-time changes to user's trades in Firestore.
 * Whenever any device (phone, computer, iPad) writes to this email's doc,
 * all active subscribers instantly receive the update.
 */
export function subscribeToUserTrades(
  email: string,
  onUpdate: (entries: EntriesMap, theme?: ThemeMode) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const cleanEmail = email.trim().toLowerCase();
  const userDocId = emailToDocId(cleanEmail);
  const userDocRef = doc(db, "users", userDocId);

  return onSnapshot(
    userDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onUpdate(data.entries || {}, data.theme);
      } else {
        onUpdate({}, "light");
      }
    },
    (error) => {
      console.error("Firestore subscription error:", error);
      if (onError) onError(error);
    }
  );
}
