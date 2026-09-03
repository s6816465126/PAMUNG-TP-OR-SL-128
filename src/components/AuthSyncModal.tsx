import React, { useState } from "react";
import {
  X,
  Lock,
  Mail,
  LogIn,
  UserPlus,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Cloud,
} from "lucide-react";
import { UserAccount, ThemeColors, SyncState, EntriesMap } from "../types";
import {
  apiLogin,
  apiRegister,
  apiGoogleSignIn,
  apiPushSync,
  apiLogout,
  clearGuestEntries,
} from "../services/api";

interface AuthSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: UserAccount | null;
  setAccount: (account: UserAccount | null) => void;
  entries: EntriesMap;
  setEntries: React.Dispatch<React.SetStateAction<EntriesMap>>;
  colors: ThemeColors;
  syncState: SyncState;
  setSyncState: React.Dispatch<React.SetStateAction<SyncState>>;
}

export const AuthSyncModal: React.FC<AuthSyncModalProps> = ({
  isOpen,
  onClose,
  account,
  setAccount,
  entries,
  setEntries,
  colors,
  syncState,
  setSyncState,
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Handle Google Popup Sign-in
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    setSyncState((prev) => ({ ...prev, status: "syncing" }));

    try {
      const result = await apiGoogleSignIn();
      clearGuestEntries();
      setAccount(result.user);
      setEntries(result.entries);
      setSyncState({
        status: "synced",
        lastSyncTime: new Date(),
        message: `เข้าสู่ระบบ ${result.user.email} และซิงค์ข้อมูลเรียบร้อย`,
      });
      setSuccessMessage(`ยินดีต้อนรับ ${result.user.email}!`);
      setTimeout(() => onClose(), 800);
    } catch (err: any) {
      console.warn("Google sign-in error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setErrorMessage("ปิดหน้าต่างก่อนทำรายการเสร็จสิ้น");
      } else {
        setErrorMessage(err.message || "ไม่สามารถเชื่อมต่อ Google Sign-in ได้ กรุณาใช้อีเมลและรหัสผ่าน");
      }
      setSyncState((prev) => ({ ...prev, status: "error" }));
    } finally {
      setLoading(false);
    }
  };

  // Handle Password-based Sign-in or Registration
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || cleanEmail.length < 3) {
      setErrorMessage("กรุณากรอกอีเมลหรือชื่อผู้ใช้ (อย่างน้อย 3 ตัวอักษร)");
      return;
    }

    if (!password || password.length < 4) {
      setErrorMessage("รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร");
      return;
    }

    setLoading(true);
    setSyncState((prev) => ({ ...prev, status: "syncing" }));

    try {
      if (mode === "register") {
        // Register new account: starts completely fresh with 0 entries
        const result = await apiRegister(cleanEmail, password, "light");
        clearGuestEntries();
        setAccount(result.user);
        setEntries({});
        setSyncState({
          status: "synced",
          lastSyncTime: new Date(),
          message: `สร้างบัญชี ${result.user.email} พร้อมใช้งาน`,
        });
        setSuccessMessage("สมัครสมาชิกและเข้าสู่ระบบสำเร็จ!");
        setTimeout(() => onClose(), 800);
      } else {
        // Login existing account: load ONLY this email's stored records
        const result = await apiLogin(cleanEmail, password);
        clearGuestEntries();
        setAccount(result.user);
        setEntries(result.entries);
        setSyncState({
          status: "synced",
          lastSyncTime: new Date(),
          message: `ซิงค์ข้อมูลบัญชี ${result.user.email} เรียบร้อยแล้ว`,
        });
        setSuccessMessage("เข้าสู่ระบบสำเร็จ!");
        setTimeout(() => onClose(), 800);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
      setSyncState((prev) => ({ ...prev, status: "error" }));
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!account?.email) return;
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    setSyncState((prev) => ({ ...prev, status: "syncing" }));

    try {
      await apiPushSync(account.email, entries);
      setSyncState({
        status: "synced",
        lastSyncTime: new Date(),
        message: "ข้อมูลซิงค์ตรงกันกับคลาวด์แล้ว",
      });
      setSuccessMessage("ซิงค์ข้อมูลสำเร็จ!");
      setTimeout(() => setSuccessMessage(""), 2500);
    } catch (err: any) {
      setErrorMessage(err.message || "ซิงค์ข้อมูลไม่สำเร็จ");
      setSyncState((prev) => ({ ...prev, status: "error" }));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await apiLogout();
    setAccount(null);
    setEntries({});
    setSyncState({
      status: "synced",
      message: "ออกจากระบบแล้ว",
    });
    setSuccessMessage("ออกจากระบบเรียบร้อยแล้ว");
    setTimeout(() => onClose(), 600);
  };

  return (
    <div
      id="auth-sync-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(18, 12, 28, 0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 110,
      }}
    >
      <div
        id="auth-sync-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.surface,
          border: `1px solid ${colors.borderStrong}`,
          borderRadius: 20,
          padding: "clamp(16px, 3.5vw, 24px)",
          width: "100%",
          maxWidth: "min(440px, 94vw)",
          maxHeight: "92vh",
          overflowY: "auto",
          boxSizing: "border-box",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.35)",
          color: colors.text,
          position: "relative",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: colors.surfaceActive,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.accent,
                border: `1px solid ${colors.border}`,
              }}
            >
              <Cloud size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: colors.text }}>
                {account ? "บัญชีผู้ใช้งาน" : mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิกใหม่"}
              </h3>
              <span style={{ fontSize: 12, color: colors.textMuted }}>
                {account ? "บันทึกและซิงค์ข้อมูลบนคลาวด์" : "เพื่อเปิดดูและบันทึกข้อมูลได้จากทุกเครื่อง"}
              </span>
            </div>
          </div>
          <button
            id="btn-close-sync-modal"
            onClick={onClose}
            style={{
              background: colors.surfaceActive,
              border: `1px solid ${colors.border}`,
              color: colors.textMuted,
              width: 32,
              height: 32,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* If user is currently LOGGED IN */}
        {account ? (
          <div>
            <div
              style={{
                background: colors.inputBg,
                border: `1px solid ${colors.border}`,
                borderRadius: 14,
                padding: "16px",
                marginBottom: 18,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <CheckCircle2 size={18} color={colors.profit} />
                <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                  เข้าสู่ระบบแล้ว
                </span>
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: colors.accent,
                  wordBreak: "break-all",
                  marginBottom: 10,
                }}
              >
                {account.email}
              </div>
              <div style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.7 }}>
                • บันทึกการเทรดของบัญชีนี้: <strong>{Object.keys(entries).length} วัน</strong>
                <br />
                • ระบบซิงค์: <strong>1 อีเมล ต่อ 1 ฐานข้อมูลคลาวด์</strong>
                <br />
                • สถานะการซิงค์:{" "}
                <span
                  style={{
                    color:
                      syncState.status === "synced"
                        ? colors.profit
                        : syncState.status === "syncing"
                        ? colors.accent
                        : colors.loss,
                    fontWeight: 600,
                  }}
                >
                  {syncState.status === "synced"
                    ? "✓ ซิงค์เรียลไทม์พร้อมใช้งาน"
                    : syncState.status === "syncing"
                    ? "กำลังส่งข้อมูล..."
                    : "พบปัญหาในการซิงค์"}
                </span>
                {syncState.lastSyncTime && (
                  <span> ({syncState.lastSyncTime.toLocaleTimeString("th-TH")})</span>
                )}
              </div>
            </div>

            {/* Error or Success feedback */}
            {errorMessage && (
              <div
                style={{
                  background: colors.lossBg,
                  border: `1px solid ${colors.loss}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 12,
                  color: colors.loss,
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <AlertCircle size={15} />
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div
                style={{
                  background: colors.profitBg,
                  border: `1px solid ${colors.profit}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 12,
                  color: colors.profit,
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <CheckCircle2 size={15} />
                {successMessage}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                id="btn-sync-now"
                type="button"
                onClick={handleManualSync}
                disabled={loading}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "11px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: colors.accent,
                  color: "#FFFFFF",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                ซิงค์ข้อมูลทันที
              </button>

              <button
                id="btn-logout"
                type="button"
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "11px 16px",
                  borderRadius: 10,
                  border: `1px solid ${colors.border}`,
                  background: "transparent",
                  color: colors.loss,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <LogOut size={15} />
                ออกจากระบบ
              </button>
            </div>
          </div>
        ) : (
          /* If user is NOT logged in */
          <div>
            {/* Quick Google Sign-In Button */}
            <div style={{ marginBottom: 14 }}>
              <button
                id="btn-google-login"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: "11px 16px",
                  borderRadius: 12,
                  border: `1px solid ${colors.borderStrong}`,
                  background: colors.surfaceActive,
                  color: colors.text,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                เข้าสู่ระบบด้วย Google
              </button>
            </div>

            {/* Divider */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <div style={{ flex: 1, height: 1, background: colors.border }} />
              <span style={{ fontSize: 11, color: colors.textMuted, fontWeight: 500 }}>
                หรือใช้อีเมลและรหัสผ่าน
              </span>
              <div style={{ flex: 1, height: 1, background: colors.border }} />
            </div>

            {/* Only 2 Tabs: เข้าสู่ระบบ / สมัครใหม่ */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 4,
                background: colors.inputBg,
                padding: 4,
                borderRadius: 10,
                marginBottom: 16,
              }}
            >
              <button
                type="button"
                id="tab-login"
                onClick={() => {
                  setMode("login");
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                style={{
                  padding: "8px",
                  borderRadius: 8,
                  border: "none",
                  background: mode === "login" ? colors.surface : "transparent",
                  color: mode === "login" ? colors.accent : colors.textMuted,
                  fontWeight: mode === "login" ? 700 : 500,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  boxShadow: mode === "login" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                }}
              >
                <LogIn size={14} />
                เข้าสู่ระบบ
              </button>

              <button
                type="button"
                id="tab-register"
                onClick={() => {
                  setMode("register");
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                style={{
                  padding: "8px",
                  borderRadius: 8,
                  border: "none",
                  background: mode === "register" ? colors.surface : "transparent",
                  color: mode === "register" ? colors.accent : colors.textMuted,
                  fontWeight: mode === "register" ? 700 : 500,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  boxShadow: mode === "register" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                }}
              >
                <UserPlus size={14} />
                สมัครใหม่
              </button>
            </div>

            {/* Error or Success feedback */}
            {errorMessage && (
              <div
                style={{
                  background: colors.lossBg,
                  border: `1px solid ${colors.loss}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 12,
                  color: colors.loss,
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <AlertCircle size={15} />
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div
                style={{
                  background: colors.profitBg,
                  border: `1px solid ${colors.profit}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 12,
                  color: colors.profit,
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <CheckCircle2 size={15} />
                {successMessage}
              </div>
            )}

            {/* FORM: LOGIN OR REGISTER */}
            <form onSubmit={handlePasswordSubmit}>
              {/* Email Input */}
              <div style={{ marginBottom: 14 }}>
                <label
                  htmlFor="auth-input-email"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    color: colors.text,
                    marginBottom: 6,
                  }}
                >
                  <Mail size={13} color={colors.accent} />
                  อีเมล (Email)
                </label>
                <input
                  id="auth-input-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="เช่น yourname@gmail.com"
                  required
                  style={{
                    width: "100%",
                    background: colors.inputBg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 10,
                    color: colors.text,
                    fontSize: 14,
                    padding: "11px 12px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Password Input */}
              <div style={{ marginBottom: 18 }}>
                <label
                  htmlFor="auth-input-password"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    color: colors.text,
                    marginBottom: 6,
                  }}
                >
                  <Lock size={13} color={colors.accent} />
                  {mode === "register"
                    ? "รหัสผ่าน (Password อย่างน้อย 6 ตัวอักษร)"
                    : "รหัสผ่าน (Password)"}
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="auth-input-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "register" ? "กำหนดรหัสผ่าน 6 ตัวขึ้นไป" : "กรอกรหัสผ่านของคุณ"}
                    required
                    minLength={6}
                    style={{
                      width: "100%",
                      background: colors.inputBg,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 10,
                      color: colors.text,
                      fontSize: 14,
                      padding: "11px 40px 11px 12px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: colors.textMuted,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      padding: 4,
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="btn-submit-auth"
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: colors.accent,
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(122, 67, 198, 0.35)",
                }}
              >
                {loading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : mode === "login" ? (
                  <LogIn size={16} />
                ) : (
                  <UserPlus size={16} />
                )}
                {mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
              </button>

              {/* Bottom switch link */}
              <div style={{ textAlign: "center", marginTop: 14 }}>
                {mode === "login" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("register");
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: colors.accent,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: "4px 8px",
                    }}
                  >
                    ยังไม่มีบัญชี? สมัครใหม่ที่นี่
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: colors.accent,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: "4px 8px",
                    }}
                  >
                    มีบัญชีอยู่แล้ว? เข้าสู่ระบบที่นี่
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
