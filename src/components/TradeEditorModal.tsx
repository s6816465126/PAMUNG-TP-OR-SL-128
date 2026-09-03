import React, { useState, useEffect, useRef } from "react";
import { X, Trash2, Check, DollarSign, Layers, Tag, Clock, FileText } from "lucide-react";
import { TradeEntry, ThemeColors } from "../types";
import {
  THAI_MONTHS,
  SESSIONS,
  TECHNIQUES,
  TECHNIQUE_LABEL_MAP,
} from "../constants/theme";

interface TradeEditorModalProps {
  dateKeyStr: string | null;
  entry?: TradeEntry;
  onSave: (dateKeyStr: string, entryData: TradeEntry | null) => void;
  onClose: () => void;
  colors: ThemeColors;
}

export const TradeEditorModal: React.FC<TradeEditorModalProps> = ({
  dateKeyStr,
  entry,
  onSave,
  onClose,
  colors,
}) => {
  if (!dateKeyStr) return null;

  const [amountStr, setAmountStr] = useState(entry ? String(entry.amount) : "");
  const [lotsStr, setLotsStr] = useState(
    entry?.lots !== undefined ? String(entry.lots) : ""
  );
  const [session, setSession] = useState(entry?.session || "");
  const [technique, setTechnique] = useState(entry?.technique || "");
  const [note, setNote] = useState(entry?.note || "");

  const amountInputRef = useRef<HTMLInputElement>(null);

  // Parse date key (YYYY-MM-DD)
  const [yearStr, monthStr, dayStr] = dateKeyStr.split("-");
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  useEffect(() => {
    if (amountInputRef.current) {
      amountInputRef.current.focus();
      amountInputRef.current.select();
    }
  }, [dateKeyStr]);

  const handleSave = () => {
    const trimmed = amountStr.trim().replace(/,/g, "");
    if (trimmed === "" || isNaN(Number(trimmed))) {
      // If blank or invalid, remove entry
      onSave(dateKeyStr, null);
    } else {
      const numLots = lotsStr.trim() !== "" && !isNaN(Number(lotsStr)) ? Number(lotsStr.trim()) : undefined;
      onSave(dateKeyStr, {
        amount: Number(trimmed),
        lots: numLots,
        session: session || undefined,
        technique: technique || undefined,
        note: note.trim() || undefined,
        updatedAt: new Date().toISOString(),
      });
    }
    onClose();
  };

  const handleDelete = () => {
    onSave(dateKeyStr, null);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      id="trade-editor-backdrop"
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
        zIndex: 100,
      }}
    >
      <div
        id="trade-editor-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{
          background: colors.surface,
          border: `1px solid ${colors.borderStrong}`,
          borderRadius: 18,
          padding: "clamp(16px, 3.5vw, 22px)",
          width: "100%",
          maxWidth: "min(420px, 94vw)",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.35)",
          color: colors.text,
          maxHeight: "92vh",
          overflowY: "auto",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
            borderBottom: `1px solid ${colors.border}`,
            paddingBottom: 12,
          }}
        >
          <div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: colors.accent,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              บันทึกผลการเทรดประจำวัน
            </span>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: colors.text,
                margin: "2px 0 0",
              }}
            >
              วันที่ {day} {THAI_MONTHS[monthIndex]} {year}
            </h3>
          </div>
          <button
            id="btn-close-editor"
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
            title="ปิดหน้าต่าง (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Input Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Amount Input with Profit/Loss Quick Switcher */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: colors.text,
                }}
              >
                <DollarSign size={14} color={colors.accent} />
                กำไร / ขาดทุนสุทธิ (บาท) <span style={{ color: colors.loss }}>*</span>
              </label>

              {/* Status Pill */}
              {amountStr.trim() !== "" && amountStr.trim() !== "-" && !isNaN(Number(amountStr.replace(/,/g, ""))) && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: Number(amountStr.replace(/,/g, "")) < 0 ? colors.lossBg : colors.profitBg,
                    color: Number(amountStr.replace(/,/g, "")) < 0 ? colors.loss : colors.profit,
                  }}
                >
                  {Number(amountStr.replace(/,/g, "")) < 0 ? "📉 ขาดทุน" : "📈 กำไร"}
                </span>
              )}
            </div>

            {/* Quick Toggle: กำไร (+) vs ขาดทุน (-) for mobile keyboards without minus button */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <button
                id="btn-mode-profit"
                type="button"
                onClick={() => {
                  const clean = amountStr.trim().replace(/^-/, "");
                  setAmountStr(clean);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: !amountStr.trim().startsWith("-") ? 700 : 500,
                  border: !amountStr.trim().startsWith("-") && amountStr.trim() !== ""
                    ? `1.5px solid ${colors.profit}`
                    : `1px solid ${colors.border}`,
                  background: !amountStr.trim().startsWith("-") && amountStr.trim() !== ""
                    ? colors.profitBg
                    : colors.surfaceActive,
                  color: !amountStr.trim().startsWith("-") && amountStr.trim() !== ""
                    ? colors.profit
                    : colors.textMuted,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span>➕</span>
                <span>กำไร (บวก)</span>
              </button>

              <button
                id="btn-mode-loss"
                type="button"
                onClick={() => {
                  const raw = amountStr.trim();
                  if (!raw.startsWith("-")) {
                    setAmountStr(raw ? `-${raw}` : "-");
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: amountStr.trim().startsWith("-") ? 700 : 500,
                  border: amountStr.trim().startsWith("-")
                    ? `1.5px solid ${colors.loss}`
                    : `1px solid ${colors.border}`,
                  background: amountStr.trim().startsWith("-")
                    ? colors.lossBg
                    : colors.surfaceActive,
                  color: amountStr.trim().startsWith("-")
                    ? colors.loss
                    : colors.textMuted,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span>➖</span>
                <span>ขาดทุน (ติดลบ)</span>
              </button>
            </div>

            {/* Input with inline +/- toggle button */}
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                ref={amountInputRef}
                id="input-trade-amount"
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="เช่น 1500 หรือ -800"
                className="mono"
                style={{
                  width: "100%",
                  background: colors.inputBg,
                  border: `1.5px solid ${
                    amountStr.trim().startsWith("-")
                      ? colors.loss
                      : amountStr.trim() !== ""
                      ? colors.profit
                      : colors.borderStrong
                  }`,
                  borderRadius: 10,
                  color: amountStr.trim().startsWith("-")
                    ? colors.loss
                    : amountStr.trim() !== ""
                    ? colors.profit
                    : colors.text,
                  fontSize: 17,
                  fontWeight: 600,
                  padding: "12px 64px 12px 14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />

              {/* Quick +/- Button right inside input */}
              <button
                id="btn-toggle-sign"
                type="button"
                onClick={() => {
                  setAmountStr((prev) => {
                    const raw = prev.trim();
                    if (raw.startsWith("-")) {
                      return raw.slice(1);
                    }
                    return raw ? `-${raw}` : "-";
                  });
                }}
                style={{
                  position: "absolute",
                  right: 6,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: colors.surfaceActive,
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                  padding: "6px 10px",
                  borderRadius: 7,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
                title="กดเพื่อสลับ บวก / ลบ (+/-)"
              >
                <span>±</span>
                <span style={{ fontSize: 11 }}>+/-</span>
              </button>
            </div>

            <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 5 }}>
              💡 บนมือถือ: แตะปุ่ม <b>"ขาดทุน (ติดลบ)"</b> หรือปุ่ม <b>"± +/-"</b> เพื่อใส่เครื่องหมายลบได้ทันที
            </div>
          </div>

          {/* Lots & Technique (Grid 2 Cols) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Number of Lots / Trades */}
            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  fontWeight: 600,
                  color: colors.text,
                  marginBottom: 6,
                }}
              >
                <Layers size={13} color={colors.accent} />
                จำนวนไม้ที่เทรด
              </label>
              <input
                id="input-trade-lots"
                type="text"
                inputMode="decimal"
                value={lotsStr}
                onChange={(e) => setLotsStr(e.target.value)}
                placeholder="เช่น 3 หรือ 5"
                className="mono"
                style={{
                  width: "100%",
                  background: colors.inputBg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 10,
                  color: colors.text,
                  fontSize: 14,
                  padding: "10px 12px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Technique (Rejection, Follow, Breakout, etc.) */}
            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  fontWeight: 600,
                  color: colors.text,
                  marginBottom: 6,
                }}
              >
                <Tag size={13} color={colors.accent} />
                ใช้เทคนิคอะไร
              </label>
              <select
                id="select-trade-technique"
                value={technique}
                onChange={(e) => setTechnique(e.target.value)}
                style={{
                  width: "100%",
                  background: colors.inputBg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 10,
                  color: colors.text,
                  fontSize: 14,
                  padding: "10px 12px",
                  outline: "none",
                  boxSizing: "border-box",
                  cursor: "pointer",
                }}
              >
                <option value="">-- ไม่ระบุ --</option>
                {TECHNIQUES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick pills for Technique */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {TECHNIQUES.map((t) => {
              const isSelected = technique === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTechnique(isSelected ? "" : t.id)}
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: `1px solid ${isSelected ? colors.accent : colors.border}`,
                    background: isSelected ? colors.surfaceActive : "transparent",
                    color: isSelected ? colors.accent : colors.textMuted,
                    cursor: "pointer",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Session selection */}
          <div>
            <label
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
              <Clock size={13} color={colors.accent} />
              ช่วงเวลาที่เทรด
            </label>
            <select
              id="select-trade-session"
              value={session}
              onChange={(e) => setSession(e.target.value)}
              style={{
                width: "100%",
                background: colors.inputBg,
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                color: colors.text,
                fontSize: 14,
                padding: "10px 12px",
                outline: "none",
                boxSizing: "border-box",
                cursor: "pointer",
              }}
            >
              <option value="">-- ไม่ระบุ --</option>
              {SESSIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div>
            <label
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
              <FileText size={13} color={colors.accent} />
              โน้ตเพิ่มเติม / แผนการเทรด
            </label>
            <input
              id="input-trade-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น เข้า Long ทองคำ ตามสัญญาณ Follow เทรนด์"
              style={{
                width: "100%",
                background: colors.inputBg,
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                color: colors.text,
                fontSize: 14,
                padding: "10px 12px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 24,
            paddingTop: 16,
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          {(entry !== undefined || amountStr.trim() !== "") && (
            <button
              id="btn-delete-trade"
              type="button"
              onClick={handleDelete}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "11px 16px",
                borderRadius: 10,
                border: `1.5px solid ${colors.loss}`,
                background: colors.lossBg,
                color: colors.loss,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="ลบรายการบันทึกของวันนี้"
            >
              <Trash2 size={16} color={colors.loss} />
              ลบรายการ
            </button>
          )}

          <button
            id="btn-save-trade"
            type="button"
            onClick={handleSave}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "11px 20px",
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
            <Check size={16} />
            บันทึกข้อมูล
          </button>
        </div>
      </div>
    </div>
  );
};
