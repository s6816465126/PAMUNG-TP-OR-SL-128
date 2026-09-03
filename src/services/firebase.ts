import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  User as FirebaseUser,
} from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  writeBatch,
  onSnapshot,
  deleteField,
  updateDoc,
  Unsubscribe,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { EntriesMap, ThemeMode, TradeEntry, UserAccount } from "../types";

// Initialize Firebase App and Services
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Use named firestore instance for this project
export const db = firebaseConfig.firestoreDatabaseId
  ? initializeFirestore(app, { ignoreUndefinedProperties: true }, firebaseConfig.firestoreDatabaseId)
  : initializeFirestore(app, { ignoreUndefinedProperties: true });

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
 * Standardize identifier (Email or Username like db22947) into clean Firestore document ID.
 * Standardized across all devices and platforms (Phone, Computer, iPad).
 */
export function emailToDocId(rawInput: string): string {
  const clean = (rawInput || "").trim().toLowerCase();
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
 * Direct fetch of all user trades from Firestore
 */
export async function fetchUserTradesFromFirestore(
  identifier: string
): Promise<{ entries: EntriesMap; theme?: ThemeMode } | null> {
  const cleanEmail = (identifier || "").trim().toLowerCase();
  if (!cleanEmail) return null;

  const userDocId = emailToDocId(cleanEmail);
  const userDocRef = doc(db, "users", userDocId);

  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const entries: EntriesMap = data.entries || {};
      const theme: ThemeMode = data.theme === "dark" || data.theme === "light" ? data.theme : "light";
      return { entries, theme };
    }
  } catch (err) {
    console.warn("fetchUserTradesFromFirestore error:", err);
  }
  return null;
}

/**
 * Login or Sign Up with Google / Gmail Popup
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
 * Direct Login / Connect via Gmail or Username
 */
export async function firebaseGmailQuickLogin(
  identifier: string
): Promise<{ user: UserAccount; entries: EntriesMap; theme?: ThemeMode }> {
  const cleanEmail = identifier.trim().toLowerCase();
  const token = `token_${emailToDocId(cleanEmail)}`;
  return await initializeOrFetchFirestoreUser(cleanEmail, token);
}

/**
 * Helper to fetch or initialize user document in Firestore.
 */
async function initializeOrFetchFirestoreUser(
  identifier: string,
  token: string
): Promise<{ user: UserAccount; entries: EntriesMap; theme?: ThemeMode }> {
  const cleanEmail = identifier.trim().toLowerCase();
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
    // New account: initialize in Firestore
    await setDoc(
      userDocRef,
      {
        email: cleanEmail,
        theme: "light",
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
 */
export async function firebaseRegisterUser(
  identifier: string,
  pass: string,
  theme: ThemeMode = "light"
): Promise<{ user: UserAccount; entries: EntriesMap }> {
  const cleanEmail = identifier.trim().toLowerCase();
  const pwdHash = await hashPassword(pass);
  const userDocId = emailToDocId(cleanEmail);
  const userDocRef = doc(db, "users", userDocId);
  const now = new Date().toISOString();

  const existingDoc = await getDoc(userDocRef);
  if (existingDoc.exists()) {
    throw new Error("บัญชี/อีเมลนี้มีอยู่ในระบบแล้ว กรุณากดเข้าสู่ระบบ (Log in)");
  }

  let token = `token_${userDocId}_${Date.now()}`;

  if (cleanEmail.includes("@")) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      token = await cred.user.getIdToken();
    } catch (fbAuthErr: any) {
      // fallback to Firestore hash
    }
  }

  await setDoc(
    userDocRef,
    {
      email: cleanEmail,
      theme,
      passwordHash: pwdHash,
      createdAt: now,
      updatedAt: now,
      entries: {},
    },
    { merge: true }
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
 * Login with Email/Username and Password
 */
export async function firebaseLoginUser(
  identifier: string,
  pass: string
): Promise<{ user: UserAccount; entries: EntriesMap; theme?: ThemeMode }> {
  const cleanEmail = identifier.trim().toLowerCase();
  const pwdHash = await hashPassword(pass);
  const userDocId = emailToDocId(cleanEmail);
  const userDocRef = doc(db, "users", userDocId);

  const docSnap = await getDoc(userDocRef);

  if (!docSnap.exists()) {
    if (cleanEmail.includes("@")) {
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
        const token = await cred.user.getIdToken();
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
        throw new Error("ไม่พบบัญชีผู้ใช้นี้ กรุณาตรวจสอบชื่อผู้ใช้/อีเมล หรือสมัครสมาชิกใหม่");
      }
    }
    throw new Error("ไม่พบบัญชีผู้ใช้นี้ กรุณาตรวจสอบชื่อผู้ใช้/อีเมล หรือสมัครสมาชิกใหม่");
  }

  const userData = docSnap.data();
  if (userData.passwordHash && userData.passwordHash !== pwdHash) {
    throw new Error("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
  }

  let entries: EntriesMap = userData.entries || {};
  let theme: ThemeMode = userData.theme === "dark" || userData.theme === "light" ? userData.theme : "light";

  let token = `token_${userDocId}`;
  if (cleanEmail.includes("@")) {
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      token = await cred.user.getIdToken();
    } catch (e) {
      // graceful fallback
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
 * Batch write trades to Firestore subcollection
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
 * Save or update single trade in Firestore for the logged-in user
 */
export async function saveTradeToFirestore(
  identifier: string,
  dateKeyStr: string,
  entry: TradeEntry | null,
  allEntries: EntriesMap
): Promise<void> {
  const cleanEmail = identifier.trim().toLowerCase();
  const userDocId = emailToDocId(cleanEmail);
  const userDocRef = doc(db, "users", userDocId);
  const now = new Date().toISOString();

  if (entry === null) {
    // 1. Delete from Firestore entries map
    try {
      await updateDoc(userDocRef, {
        [`entries.${dateKeyStr}`]: deleteField(),
        updatedAt: now,
      });
    } catch (err) {
      // If doc didn't exist or update failed, overwrite doc
      await setDoc(
        userDocRef,
        {
          email: cleanEmail,
          entries: allEntries,
          updatedAt: now,
        }
      );
    }

    // 2. Delete subcollection document
    try {
      const tradeDocRef = doc(db, "users", userDocId, "trades", dateKeyStr);
      await deleteDoc(tradeDocRef);
    } catch (e) {
      console.warn("Subcollection trade delete note:", e);
    }
  } else {
    // 1. Save entry to Firestore
    try {
      await updateDoc(userDocRef, {
        [`entries.${dateKeyStr}`]: entry,
        updatedAt: now,
      });
    } catch (err) {
      await setDoc(
        userDocRef,
        {
          email: cleanEmail,
          entries: allEntries,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    // 2. Save to subcollection
    try {
      const tradeDocRef = doc(db, "users", userDocId, "trades", dateKeyStr);
      await setDoc(
        tradeDocRef,
        {
          dateKey: dateKeyStr,
          ...entry,
          updatedAt: now,
        },
        { merge: true }
      );
    } catch (e) {
      console.warn("Subcollection trade update note:", e);
    }
  }
}

/**
 * Save all entries and theme in Firestore for the logged-in user
 */
export async function syncAllToFirestore(
  identifier: string,
  entries: EntriesMap,
  theme?: ThemeMode
): Promise<void> {
  const cleanEmail = identifier.trim().toLowerCase();
  const userDocId = emailToDocId(cleanEmail);
  const now = new Date().toISOString();
  const userDocRef = doc(db, "users", userDocId);

  const payload: any = {
    email: cleanEmail,
    entries: entries,
    updatedAt: now,
  };
  if (theme) {
    payload.theme = theme;
  }

  // Update or set full entries (no stale zombie keys)
  try {
    await updateDoc(userDocRef, payload);
  } catch (err) {
    await setDoc(userDocRef, payload);
  }
  await batchWriteTrades(userDocId, entries);
}

/**
 * Listen for real-time changes to user's trades in Firestore.
 */
export function subscribeToUserTrades(
  identifier: string,
  onUpdate: (entries: EntriesMap, theme?: ThemeMode) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const cleanEmail = identifier.trim().toLowerCase();
  const userDocId = emailToDocId(cleanEmail);
  const userDocRef = doc(db, "users", userDocId);

  // Immediate fast getDoc so data loads without waiting for snapshot propagation
  getDoc(userDocRef)
    .then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onUpdate(data.entries || {}, data.theme);
      }
    })
    .catch((err) => {
      console.warn("Fast getDoc error:", err);
    });

  return onSnapshot(
    userDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onUpdate(data.entries || {}, data.theme);
      }
    },
    (error) => {
      console.error("Firestore subscription error:", error);
      if (onError) onError(error);
    }
  );
}

