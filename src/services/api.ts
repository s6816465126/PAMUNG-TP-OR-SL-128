import { EntriesMap, ThemeMode, UserAccount } from "../types";
import {
  emailToDocId,
  ensureFirebaseAuth,
  firebaseLoginUser,
  firebaseRegisterUser,
  firebaseGoogleSignIn,
  firebaseGmailQuickLogin,
  firebaseLogoutUser,
  saveTradeToFirestore,
  syncAllToFirestore,
  fetchUserTradesFromFirestore,
} from "./firebase";

const LOCAL_STORAGE_THEME_KEY = "pamung_theme_preference_v3";
const LOCAL_STORAGE_ACCOUNT_KEY = "pamung_user_session_v3";
const LOCAL_STORAGE_GUEST_KEY = "pamung_guest_entries_v3";

/**
 * Load entries for a specific account identifier, or guest entries if no account.
 */
export function loadEntriesForUser(email?: string | null): EntriesMap {
  try {
    if (email) {
      const docId = emailToDocId(email);
      const rawV3 = localStorage.getItem(`pamung_user_entries_v3_${docId}`);
      if (rawV3) return JSON.parse(rawV3);

      // Legacy key fallback
      const rawV2 = localStorage.getItem(`pamung_user_entries_${docId}`);
      if (rawV2) return JSON.parse(rawV2);
    } else {
      const raw = localStorage.getItem(LOCAL_STORAGE_GUEST_KEY);
      if (raw) return JSON.parse(raw);

      const rawLegacy = localStorage.getItem("pamung_guest_entries");
      if (rawLegacy) return JSON.parse(rawLegacy);
    }
  } catch (e) {
    console.error("Failed to load local entries:", e);
  }
  return {};
}

/**
 * Save entries for a specific account identifier, or guest entries if no account.
 */
export function saveEntriesForUser(entries: EntriesMap, email?: string | null): void {
  try {
    if (email) {
      const docId = emailToDocId(email);
      localStorage.setItem(`pamung_user_entries_v3_${docId}`, JSON.stringify(entries));
    } else {
      localStorage.setItem(LOCAL_STORAGE_GUEST_KEY, JSON.stringify(entries));
    }
  } catch (e) {
    console.error("Failed to save local entries:", e);
  }
}

/**
 * Clear guest records when switching or logging in
 */
export function clearGuestEntries(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_GUEST_KEY);
    localStorage.removeItem("pamung_guest_entries");
  } catch (e) {
    // ignore
  }
}

export function loadLocalTheme(): ThemeMode {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_THEME_KEY) || localStorage.getItem("pamung_theme_preference");
    if (raw === "dark" || raw === "light") {
      return raw;
    }
  } catch (e) {
    console.error("Failed to load theme preference:", e);
  }
  return "light";
}

export function saveLocalTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, theme);
  } catch (e) {
    console.error("Failed to save theme preference:", e);
  }
}

export function loadLocalAccount(): UserAccount | null {
  try {
    const raw =
      localStorage.getItem(LOCAL_STORAGE_ACCOUNT_KEY) ||
      localStorage.getItem("pamung_user_session_v2") ||
      localStorage.getItem("pamung_user_session");
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to load user account:", e);
  }
  return null;
}

export function saveLocalAccount(account: UserAccount | null): void {
  try {
    if (account) {
      localStorage.setItem(LOCAL_STORAGE_ACCOUNT_KEY, JSON.stringify(account));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_ACCOUNT_KEY);
      localStorage.removeItem("pamung_user_session_v2");
      localStorage.removeItem("pamung_user_session");
    }
  } catch (e) {
    console.error("Failed to save user account:", e);
  }
}

// Authentication & Cloud Sync using Firebase Firestore
export async function apiGoogleSignIn(): Promise<{
  user: UserAccount;
  entries: EntriesMap;
  theme?: ThemeMode;
}> {
  try {
    const result = await firebaseGoogleSignIn();
    saveEntriesForUser(result.entries, result.user.email);
    return result;
  } catch (err: any) {
    console.error("Firebase Google Sign-In error:", err);
    throw err;
  }
}

export async function apiGmailQuickLogin(
  identifier: string
): Promise<{ user: UserAccount; entries: EntriesMap; theme?: ThemeMode }> {
  try {
    const result = await firebaseGmailQuickLogin(identifier);
    saveEntriesForUser(result.entries, result.user.email);
    return result;
  } catch (err: any) {
    console.error("Firebase Gmail Login error:", err);
    throw new Error(err.message || "ไม่สามารถเชื่อมต่อกับ Firebase ได้");
  }
}

export async function apiRegister(
  identifier: string,
  password: string,
  theme: ThemeMode
): Promise<{ user: UserAccount; entries: EntriesMap }> {
  try {
    const result = await firebaseRegisterUser(identifier, password, theme);
    saveEntriesForUser({}, result.user.email);
    return result;
  } catch (err: any) {
    console.error("Firebase register error:", err);
    if (err.code === "auth/email-already-in-use") {
      throw new Error("อีเมล/ชื่อผู้ใช้นี้มีบัญชีใน Firebase อยู่แล้ว กรุณาเข้าสู่ระบบ");
    }
    if (err.code === "auth/weak-password") {
      throw new Error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
    }
    if (err.code === "auth/invalid-email") {
      throw new Error("รูปแบบอีเมลไม่ถูกต้อง");
    }
    throw new Error(err.message || "ไม่สามารถสมัครสมาชิกบน Firebase ได้");
  }
}

export async function apiLogin(
  identifier: string,
  password: string
): Promise<{ user: UserAccount; entries: EntriesMap; theme?: ThemeMode }> {
  try {
    const result = await firebaseLoginUser(identifier, password);
    saveEntriesForUser(result.entries, result.user.email);
    return result;
  } catch (err: any) {
    console.error("Firebase login error:", err);
    if (
      err.code === "auth/user-not-found" ||
      err.code === "auth/wrong-password" ||
      err.code === "auth/invalid-credential"
    ) {
      throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }
    throw new Error(err.message || "ไม่สามารถเข้าสู่ระบบบน Firebase ได้");
  }
}

export async function apiLogout(): Promise<void> {
  await firebaseLogoutUser();
}

export async function apiFetchRemote(email: string): Promise<EntriesMap | null> {
  const res = await fetchUserTradesFromFirestore(email);
  if (res && res.entries) {
    saveEntriesForUser(res.entries, email);
    return res.entries;
  }
  return null;
}

export async function apiPushSync(
  email: string,
  entries: EntriesMap,
  theme?: ThemeMode
): Promise<{ count: number; updatedAt: string }> {
  await syncAllToFirestore(email, entries, theme);
  saveEntriesForUser(entries, email);
  return {
    count: Object.keys(entries).length,
    updatedAt: new Date().toISOString(),
  };
}

export { saveTradeToFirestore, syncAllToFirestore, ensureFirebaseAuth, fetchUserTradesFromFirestore };

