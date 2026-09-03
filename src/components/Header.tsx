import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  CloudCheck,
  CloudAlert,
  LogIn,
  Download,
  Upload,
  RefreshCw,
} from "lucide-react";
import { ThemeColors, ThemeMode, UserAccount, SyncState } from "../types";
import { fmtNum } from "../utils/format";

interface HeaderProps {
  year: number;
  setYear: React.Dispatch<React.SetStateAction<number>>;
  yearTotal: number;
  theme: ThemeMode;
  onToggleTheme: () => void;
  colors: ThemeColors;
  account: UserAccount | null;
  syncState: SyncState;
  onOpenSyncModal: () => void;
  onQuickSync: () => void;
  onExport: () => void;
  onImportClick: () => void;
}

export function PamungLogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ display: "block", flexShrink: 0, borderRadius: 12, boxShadow: "0 4px 14px rgba(122, 67, 198, 0.25)" }}
    >
      <rect x="0" y="0" width="100" height="100" rx="22" fill="#140C22" />
      {/* Candle bars */}
      <rect x="14" y="62" width="6" height="16" rx="2" fill="#207851" />
      <rect x="16.5" y="52" width="1" height="36" fill="#207851" />

      <rect x="28" y="56" width="6" height="22" rx="2" fill="#A82E4E" />
      <rect x="30.5" y="48" width="1" height="38" fill="#A82E4E" />

      <rect x="42" y="42" width="6" height="26" rx="2" fill="#207851" />
      <rect x="44.5" y="32" width="1" height="46" fill="#207851" />

      <rect x="56" y="36" width="6" height="20" rx="2" fill="#207851" />
      <rect x="58.5" y="26" width="1" height="40" fill="#207851" />

      <rect x="70" y="46" width="6" height="18" rx="2" fill="#A82E4E" />
      <rect x="72.5" y="38" width="1" height="34" fill="#A82E4E" />

      <rect x="84" y="28" width="6" height="28" rx="2" fill="#207851" />
      <rect x="86.5" y="18" width="1" height="48" fill="#207851" />

      {/* Purple Trend line */}
      <polyline
        points="17,60 31,64 45,46 59,38 73,50 87,24"
        fill="none"
        stroke="#A78BFA"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const Header: React.FC<HeaderProps> = ({
  year,
  setYear,
  yearTotal,
  theme,
  onToggleTheme,
  colors,
  account,
  syncState,
  onOpenSyncModal,
  onQuickSync,
  onExport,
  onImportClick,
}) => {
  return (
    <header
      id="app-header"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        marginBottom: 16,
        paddingBottom: 14,
        borderBottom: `1px solid ${colors.border}`,
        width: "100%",
      }}
    >
      {/* Top row: Brand & Primary Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          width: "100%",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <PamungLogoMark size={38} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <h1
                className="karaoke"
                style={{
                  fontSize: "clamp(22px, 5vw, 28px)",
                  fontWeight: 700,
                  color: colors.accent,
                  lineHeight: 1,
                  letterSpacing: "0.5px",
                  margin: 0,
                }}
              >
                PAMUNG
              </h1>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  padding: "1px 6px",
                  borderRadius: 999,
                  background: colors.surfaceActive,
                  color: colors.accent,
                  border: `1px solid ${colors.borderStrong}`,
                  lineHeight: 1.4,
                }}
              >
                PRO
              </span>
            </div>
            <div
              style={{
                fontSize: "clamp(11px, 2.8vw, 13px)",
                color: colors.textMuted,
                marginTop: 2,
                fontWeight: 400,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              บ้านป้าม่วง · บันทึกกำไรขาดทุน
            </div>
          </div>
        </div>

        {/* Quick Auth & Theme toggles on top right */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {/* Theme Toggle Button */}
          <button
            id="btn-toggle-theme"
            onClick={onToggleTheme}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: `1px solid ${colors.border}`,
              background: colors.surface,
              color: colors.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s",
              flexShrink: 0,
            }}
            title={theme === "dark" ? "เปลี่ยนเป็นธีมสว่าง (Light)" : "เปลี่ยนเป็นธีมมืดโทนม่วง (Dark)"}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Cloud Sync / Login Button */}
          <button
            id="btn-open-sync"
            onClick={onOpenSyncModal}
            style={{
              height: 34,
              padding: "0 10px",
              borderRadius: 8,
              border: `1px solid ${account ? colors.accent : colors.border}`,
              background: account ? colors.surfaceActive : colors.surface,
              color: account ? colors.accent : colors.text,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
              flexShrink: 0,
            }}
            title={
              account
                ? `เข้าสู่ระบบด้วย: ${account.email} (${syncState.status === "syncing" ? "กำลังซิงค์..." : "ซิงค์แล้ว"})`
                : "เข้าสู่ระบบเพื่อซิงค์หลายอุปกรณ์"
            }
          >
            {account ? (
              syncState.status === "syncing" ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : syncState.status === "error" ? (
                <CloudAlert size={14} color={colors.loss} />
              ) : (
                <CloudCheck size={14} color={colors.profit} />
              )
            ) : (
              <LogIn size={14} color={colors.accent} />
            )}
            <span
              style={{
                maxWidth: "clamp(60px, 15vw, 120px)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {account ? account.email.split("@")[0] : "ซิงค์คลาวด์"}
            </span>
          </button>
        </div>
      </div>

      {/* Second row: Year controls + Total PnL + Backup action buttons */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Year Navigator */}
          <div
            id="year-navigator"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: "3px 6px",
            }}
          >
            <button
              id="btn-prev-year"
              onClick={() => setYear((y) => y - 1)}
              style={{
                background: "none",
                border: "none",
                color: colors.textMuted,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                padding: 3,
                borderRadius: 4,
              }}
              title="ปีก่อนหน้า"
            >
              <ChevronLeft size={15} />
            </button>
            <span
              className="mono"
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: colors.text,
                minWidth: 42,
                textAlign: "center",
              }}
            >
              {year}
            </span>
            <button
              id="btn-next-year"
              onClick={() => setYear((y) => y + 1)}
              style={{
                background: "none",
                border: "none",
                color: colors.textMuted,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                padding: 3,
                borderRadius: 4,
              }}
              title="ปีถัดไป"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Year P&L Badge */}
          <div
            id="year-total-badge"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: "4px 10px",
            }}
          >
            <span style={{ fontSize: 11, color: colors.textMuted, whiteSpace: "nowrap" }}>
              รวมปี {year}:
            </span>
            <span
              className="mono"
              style={{
                fontSize: 15,
                fontWeight: 700,
                color:
                  yearTotal > 0
                    ? colors.profit
                    : yearTotal < 0
                    ? colors.loss
                    : colors.textMuted,
                whiteSpace: "nowrap",
              }}
            >
              {fmtNum(yearTotal)} ฿
            </span>
          </div>
        </div>

        {/* Action Buttons Toolbar (Quick sync, export, import) */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          {account && (
            <button
              id="btn-quick-sync"
              onClick={onQuickSync}
              disabled={syncState.status === "syncing"}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                background: colors.surface,
                color: colors.textMuted,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="ซิงค์ข้อมูลกับ Firebase ทันที"
            >
              <RefreshCw size={14} className={syncState.status === "syncing" ? "animate-spin" : ""} />
            </button>
          )}

          {/* Export backup */}
          <button
            id="btn-export-backup"
            onClick={onExport}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: `1px solid ${colors.border}`,
              background: colors.surface,
              color: colors.textMuted,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            title="ดาวน์โหลดไฟล์สำรองข้อมูล (.json)"
          >
            <Download size={14} />
          </button>

          {/* Import backup */}
          <button
            id="btn-import-backup"
            onClick={onImportClick}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: `1px solid ${colors.border}`,
              background: colors.surface,
              color: colors.textMuted,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            title="นำเข้าไฟล์สำรองข้อมูล (.json)"
          >
            <Upload size={14} />
          </button>
        </div>
      </div>
    </header>
  );
};
