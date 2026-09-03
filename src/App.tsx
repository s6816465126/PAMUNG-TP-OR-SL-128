/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Sparkles, Calendar } from "lucide-react";
import {
  EntriesMap,
  ThemeMode,
  UserAccount,
  SyncState,
  TradeEntry,
} from "./types";
import {
  THAI_MONTHS_SHORT,
  LIGHT_THEME,
  DARK_THEME,
} from "./constants/theme";
import { dateKey, daysInMonth, fmtNum } from "./utils/format";
import {
  loadEntriesForUser,
  saveEntriesForUser,
  loadLocalTheme,
  saveLocalTheme,
  loadLocalAccount,
  saveLocalAccount,
} from "./services/api";
import {
  subscribeToUserTrades,
  saveTradeToFirestore,
  syncAllToFirestore,
  FIREBASE_PROJECT_ID,
} from "./services/firebase";
import { Header } from "./components/Header";
import { CalendarView } from "./components/CalendarView";
import { SummaryView } from "./components/SummaryView";
import { TradeEditorModal } from "./components/TradeEditorModal";
import { AuthSyncModal } from "./components/AuthSyncModal";

export default function App() {
  const today = new Date();
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth());
  const [viewMode, setViewMode] = useState<"calendar" | "summary">("calendar");

  // Application State
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [entries, setEntries] = useState<EntriesMap>({});
  const [syncState, setSyncState] = useState<SyncState>({
    status: "synced",
    message: "พร้อมใช้งาน",
  });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Modals
  const [editingDateKey, setEditingDateKey] = useState<string | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<any>(null);
  const firestoreUnsubRef = useRef<(() => void) | null>(null);

  const colors = theme === "dark" ? DARK_THEME : LIGHT_THEME;

  // 1. Initial Load from LocalStorage
  useEffect(() => {
    const savedTheme = loadLocalTheme();
    setTheme(savedTheme);

    const savedAccount = loadLocalAccount();
    if (savedAccount && savedAccount.email) {
      setAccount(savedAccount);
      const userCached = loadEntriesForUser(savedAccount.email);
      setEntries(userCached);
    } else {
      const guestEntries = loadEntriesForUser(null);
      setEntries(guestEntries);
    }
  }, []);

  // 2. Real-time Firestore Sync per Email Account (1 Email = 1 Firestore Account)
  useEffect(() => {
    // Teardown previous listener
    if (firestoreUnsubRef.current) {
      firestoreUnsubRef.current();
      firestoreUnsubRef.current = null;
    }

    if (!account?.email) {
      setSyncState({
        status: "synced",
        message: "โหมดไม่ได้เข้าสู่ระบบ (บันทึกเฉพาะเครื่องนี้)",
      });
      return;
    }

    setSyncState({
      status: "syncing",
      message: `กำลังเชื่อมต่อเรียลไทม์ (${account.email})...`,
    });

    const email = account.email.trim().toLowerCase();

    // Subscribe to Firestore document changes for this email
    const unsub = subscribeToUserTrades(
      email,
      (remoteEntries, remoteTheme) => {
        setEntries(remoteEntries);
        saveEntriesForUser(remoteEntries, email);

        if (remoteTheme === "light" || remoteTheme === "dark") {
          setTheme(remoteTheme);
          saveLocalTheme(remoteTheme);
        }

        setSyncState({
          status: "synced",
          lastSyncTime: new Date(),
          message: `ซิงค์เรียลไทม์กับ Firebase (${email}) เรียบร้อย`,
        });
      },
      (err) => {
        console.warn("Firestore sync listener error:", err);
        setSyncState({
          status: "error",
          message: "ไม่สามารถเชื่อมต่อคลาวด์ได้",
        });
      }
    );

    firestoreUnsubRef.current = unsub;

    return () => {
      if (firestoreUnsubRef.current) {
        firestoreUnsubRef.current();
        firestoreUnsubRef.current = null;
      }
    };
  }, [account?.email]);

  // Set Account & Save session
  const handleSetAccount = (newAccount: UserAccount | null) => {
    setAccount(newAccount);
    saveLocalAccount(newAccount);

    if (!newAccount) {
      // Logged out: reset entries to clean state
      setEntries({});
    } else {
      // Switched account: load cached entries for this email (or empty)
      const cached = loadEntriesForUser(newAccount.email);
      setEntries(cached);
    }
  };

  // Toggle Theme
  const handleToggleTheme = () => {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    saveLocalTheme(nextTheme);

    if (account?.email) {
      syncAllToFirestore(account.email, entries, nextTheme).catch(console.error);
    }
  };

  // Manual Quick Sync with Firebase
  const handleQuickSync = async () => {
    if (!account?.email) {
      setIsSyncModalOpen(true);
      return;
    }

    setSyncState((prev) => ({ ...prev, status: "syncing" }));
    try {
      await syncAllToFirestore(account.email, entries, theme);
      setSyncState({
        status: "synced",
        lastSyncTime: new Date(),
        message: `ข้อมูลซิงค์ตรงกับ Firebase (${account.email}) แล้ว`,
      });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1200);
    } catch (e) {
      setSyncState((prev) => ({ ...prev, status: "error" }));
    }
  };

  // Save / Delete Trade Entry
  const handleSaveTrade = (dateKeyStr: string, entryData: TradeEntry | null) => {
    const next = { ...entries };
    if (entryData === null) {
      delete next[dateKeyStr];
    } else {
      next[dateKeyStr] = entryData;
    }
    setEntries(next);
    saveEntriesForUser(next, account?.email);

    setSaveState("saving");
    if (account?.email) {
      saveTradeToFirestore(account.email, dateKeyStr, entryData, next)
        .then(() => {
          setSaveState("saved");
          setSyncState({
            status: "synced",
            lastSyncTime: new Date(),
            message: `บันทึกลง Firebase (${account.email}) เรียบร้อย`,
          });
        })
        .catch((err) => {
          console.error("Firestore save trade error:", err);
          setSaveState("saved");
        });
    } else {
      setSaveState("saved");
    }

    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveState("idle"), 1400);
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    const dataStr = JSON.stringify(
      {
        version: "3.0",
        firebaseProject: FIREBASE_PROJECT_ID,
        accountEmail: account?.email || "guest",
        exportDate: new Date().toISOString(),
        entries,
      },
      null,
      2
    );
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pamung_trade_journal_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON Backup
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const importedEntries: EntriesMap = parsed.entries || parsed;

        if (typeof importedEntries === "object" && importedEntries !== null) {
          const merged = { ...entries, ...importedEntries };
          setEntries(merged);
          saveEntriesForUser(merged, account?.email);

          if (account?.email) {
            await syncAllToFirestore(account.email, merged, theme);
          }
          alert(`นำเข้าข้อมูลการเทรดสำเร็จเรียบร้อยแล้ว!`);
        } else {
          alert("รูปแบบไฟล์ไม่ถูกต้อง กรุณาเลือกไฟล์สำรองข้อมูล .json");
        }
      } catch (err) {
        alert("ไม่สามารถอ่านไฟล์ได้ กรุณาลองใหม่อีกครั้ง");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Compute Year Monthly Totals for Month Selection Bar
  const yearMonthTotals = useMemo(() => {
    return THAI_MONTHS_SHORT.map((_, mi) => {
      let total = 0;
      const dim = daysInMonth(year, mi);
      for (let d = 1; d <= dim; d++) {
        const e = entries[dateKey(year, mi, d)];
        if (e) total += e.amount;
      }
      return total;
    });
  }, [entries, year]);

  const yearTotal = yearMonthTotals.reduce((a, b) => a + b, 0);

  return (
    <div
      id="pamung-app-root"
      style={{
        minHeight: "100vh",
        width: "100%",
        maxWidth: "100vw",
        overflowX: "hidden",
        background: `linear-gradient(180deg, ${colors.bg} 0%, ${colors.bgAlt} 100%)`,
        color: colors.text,
        fontFamily: "'Noto Sans Thai', sans-serif",
        padding: "clamp(12px, 3vw, 24px) clamp(8px, 2.5vw, 16px) 60px",
        boxSizing: "border-box",
        transition: "background 0.3s ease, color 0.3s ease",
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .karaoke { font-family: 'Baloo 2', 'Noto Sans Thai', sans-serif; }
        .month-selector-btn:hover {
          background: ${colors.surfaceActive} !important;
          border-color: ${colors.borderStrong} !important;
        }
        .day-cell:hover {
          border-color: ${colors.accent} !important;
          transform: translateY(-1px);
        }
      `}</style>

      <div
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          width: "100%",
          overflowX: "hidden",
        }}
      >
        {/* Main Application Header */}
        <Header
          year={year}
          setYear={setYear}
          yearTotal={yearTotal}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          colors={colors}
          account={account}
          syncState={syncState}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
          onQuickSync={handleQuickSync}
          onExport={handleExportBackup}
          onImportClick={() => fileInputRef.current?.click()}
        />

        {/* Hidden File Input for Import */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleImportFile}
          style={{ display: "none" }}
        />

        {/* Navigation / Mode Toggle Bar */}
        <div
          id="view-toggle-bar"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 12,
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              id="tab-mode-calendar"
              onClick={() => setViewMode("calendar")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: "clamp(11px, 2.8vw, 13px)",
                fontWeight: 600,
                border: `1.5px solid ${viewMode === "calendar" ? colors.accent : colors.border}`,
                background: viewMode === "calendar" ? colors.surfaceActive : colors.surface,
                color: viewMode === "calendar" ? colors.accent : colors.textMuted,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Calendar size={14} />
              ปฏิทินรายเดือน
            </button>

            <button
              id="tab-mode-summary"
              onClick={() => setViewMode("summary")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: "clamp(11px, 2.8vw, 13px)",
                fontWeight: 600,
                border: `1.5px solid ${viewMode === "summary" ? colors.accent : colors.border}`,
                background: viewMode === "summary" ? colors.accent : colors.surface,
                color: viewMode === "summary" ? "#FFFFFF" : colors.accent,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Sparkles size={14} />
              สรุปภาพรวมปี {year}
            </button>
          </div>
        </div>

        {/* 12 Months Grid Selector */}
        <div
          id="month-selector-bar"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(68px, 1fr))",
            gap: "clamp(4px, 1vw, 8px)",
            marginBottom: 20,
            width: "100%",
          }}
        >
          {THAI_MONTHS_SHORT.map((label, mi) => {
            const isSelected = viewMode === "calendar" && month === mi;
            const monthPnl = yearMonthTotals[mi];
            const hasData = monthPnl !== 0;

            return (
              <button
                key={`month-tab-${mi}`}
                id={`tab-month-${mi}`}
                className="month-selector-btn"
                onClick={() => {
                  setMonth(mi);
                  setViewMode("calendar");
                }}
                style={{
                  border: `1.5px solid ${
                    isSelected ? colors.accent : colors.border
                  }`,
                  background: isSelected ? colors.surfaceActive : colors.surface,
                  borderRadius: "clamp(8px, 1.5vw, 12px)",
                  padding: "clamp(6px, 1.5vw, 9px) clamp(4px, 1vw, 8px)",
                  textAlign: "left",
                  color: colors.text,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: "clamp(46px, 10vw, 56px)",
                  transition: "all 0.15s ease",
                  overflow: "hidden",
                  boxShadow: isSelected
                    ? `0 4px 14px rgba(122, 67, 198, 0.15)`
                    : "0 1px 4px rgba(0,0,0,0.02)",
                }}
              >
                <div
                  style={{
                    fontSize: "clamp(10px, 2.5vw, 12px)",
                    fontWeight: isSelected ? 700 : 600,
                    color: isSelected ? colors.accent : colors.textMuted,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {label}
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: "clamp(9.5px, 2.4vw, 12px)",
                    fontWeight: 700,
                    color:
                      monthPnl > 0
                        ? colors.profit
                        : monthPnl < 0
                        ? colors.loss
                        : colors.textMuted,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    lineHeight: 1.1,
                  }}
                >
                  {hasData ? fmtNum(monthPnl) : "—"}
                </div>
              </button>
            );
          })}
        </div>

        {/* View Mode Switching: Calendar or Summary */}
        {viewMode === "calendar" ? (
          <CalendarView
            year={year}
            month={month}
            setMonth={setMonth}
            setYear={setYear}
            entries={entries}
            onOpenEditor={(dateKeyStr) => setEditingDateKey(dateKeyStr)}
            colors={colors}
            saveState={saveState}
          />
        ) : (
          <SummaryView
            year={year}
            entries={entries}
            colors={colors}
            onSelectMonth={(selectedMonth) => {
              setMonth(selectedMonth);
              setViewMode("calendar");
            }}
          />
        )}
      </div>

      {/* Trade Entry Modal */}
      {editingDateKey && (
        <TradeEditorModal
          dateKeyStr={editingDateKey}
          entry={entries[editingDateKey]}
          onSave={handleSaveTrade}
          onClose={() => setEditingDateKey(null)}
          colors={colors}
        />
      )}

      {/* Cloud Multi-Device Firebase Auth & Sync Modal */}
      <AuthSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        account={account}
        setAccount={handleSetAccount}
        entries={entries}
        setEntries={setEntries}
        colors={colors}
        syncState={syncState}
        setSyncState={setSyncState}
      />
    </div>
  );
}
