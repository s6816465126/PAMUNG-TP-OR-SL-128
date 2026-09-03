import React from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Target, Zap, Layers } from "lucide-react";
import { EntriesMap, ThemeColors } from "../types";
import {
  THAI_MONTHS,
  THAI_WEEKDAYS,
  SESSION_LABEL_MAP,
  TECHNIQUE_LABEL_MAP,
} from "../constants/theme";
import { dateKey, daysInMonth, firstWeekdayMon, fmtNum } from "../utils/format";

interface CalendarViewProps {
  year: number;
  month: number;
  setMonth: (month: number) => void;
  setYear: React.Dispatch<React.SetStateAction<number>>;
  entries: EntriesMap;
  onOpenEditor: (dateKeyStr: string) => void;
  colors: ThemeColors;
  saveState: "idle" | "saving" | "saved" | "error";
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  year,
  month,
  setMonth,
  setYear,
  entries,
  onOpenEditor,
  colors,
  saveState,
}) => {
  const today = new Date();
  const numDays = daysInMonth(year, month);
  const leadBlanks = firstWeekdayMon(year, month);

  const cells: (number | null)[] = [];
  for (let i = 0; i < leadBlanks; i++) cells.push(null);
  for (let d = 1; d <= numDays; d++) cells.push(d);

  // Month Statistics
  let monthTotal = 0;
  let wins = 0;
  let losses = 0;
  let bestDay: { day: number; amount: number } | null = null;
  let worstDay: { day: number; amount: number } | null = null;
  let totalLots = 0;
  let maxAbsDay = 1;

  for (let d = 1; d <= numDays; d++) {
    const key = dateKey(year, month, d);
    const entry = entries[key];
    if (entry) {
      monthTotal += entry.amount;
      maxAbsDay = Math.max(maxAbsDay, Math.abs(entry.amount));
      if (entry.amount > 0) wins++;
      if (entry.amount < 0) losses++;
      if (entry.lots) totalLots += entry.lots;

      if (!bestDay || entry.amount > bestDay.amount) {
        bestDay = { day: d, amount: entry.amount };
      }
      if (!worstDay || entry.amount < worstDay.amount) {
        worstDay = { day: d, amount: entry.amount };
      }
    }
  }

  const tradedDays = wins + losses;
  const winRate = tradedDays > 0 ? Math.round((wins / tradedDays) * 100) : null;

  function stepMonth(delta: number) {
    let nextMonth = month + delta;
    let nextYear = year;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    setMonth(nextMonth);
    setYear(nextYear);
  }

  function getCellStyle(amount?: number) {
    if (amount === undefined) return {};
    if (amount > 0) {
      return {
        background: colors.profitBg,
        borderColor: colors.profit,
        boxShadow: `inset 0 0 10px ${colors.profitBg}`,
      };
    }
    if (amount < 0) {
      return {
        background: colors.lossBg,
        borderColor: colors.loss,
        boxShadow: `inset 0 0 10px ${colors.lossBg}`,
      };
    }
    return {
      background: colors.surfaceActive,
      borderColor: colors.borderStrong,
    };
  }

  return (
    <div
      id="calendar-view-container"
      style={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
      }}
    >
      {/* Month Subheader */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            id="btn-prev-month"
            onClick={() => stepMonth(-1)}
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
              flexShrink: 0,
            }}
            title="เดือนก่อนหน้า"
          >
            <ChevronLeft size={16} />
          </button>
          <h2
            style={{
              fontSize: "clamp(16px, 4vw, 20px)",
              fontWeight: 700,
              color: colors.text,
              margin: 0,
              whiteSpace: "nowrap",
            }}
          >
            {THAI_MONTHS[month]} {year}
          </h2>
          <button
            id="btn-next-month"
            onClick={() => stepMonth(1)}
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
              flexShrink: 0,
            }}
            title="เดือนถัดไป"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Save state indicator */}
        <div
          className="mono"
          style={{
            fontSize: "clamp(10px, 2.5vw, 12px)",
            color:
              saveState === "error"
                ? colors.loss
                : saveState === "saved"
                ? colors.profit
                : colors.textMuted,
          }}
        >
          {saveState === "saving" && "กำลังบันทึก..."}
          {saveState === "saved" && "✓ บันทึกแล้ว"}
          {saveState === "error" && "✕ บันทึกไม่สำเร็จ"}
        </div>
      </div>

      {/* Weekday headers (Guaranteed minmax(0, 1fr) for perfect responsive 7-col fit) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: "clamp(2px, 0.8vw, 6px)",
          marginBottom: 4,
          width: "100%",
        }}
      >
        {THAI_WEEKDAYS.map((w, idx) => (
          <div
            key={w}
            style={{
              textAlign: "center",
              fontSize: "clamp(10px, 2.5vw, 12px)",
              fontWeight: 600,
              color: idx >= 5 ? colors.accent : colors.textMuted,
              padding: "4px 0",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Calendar days grid (Strict minmax(0, 1fr) to prevent horizontal overflow on all screen sizes) */}
      <div
        id="calendar-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: "clamp(2px, 0.8vw, 6px)",
          marginBottom: 20,
          width: "100%",
        }}
      >
        {cells.map((d, index) => {
          if (d === null) {
            return (
              <div
                key={`blank-${index}`}
                style={{
                  minHeight: "clamp(54px, 12vw, 76px)",
                  aspectRatio: "1 / 1.05",
                  width: "100%",
                }}
              />
            );
          }

          const key = dateKey(year, month, d);
          const entry = entries[key];
          const isToday =
            d === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();

          const hasData = entry !== undefined;

          return (
            <button
              key={key}
              id={`day-cell-${key}`}
              onClick={() => onOpenEditor(key)}
              style={{
                minHeight: "clamp(54px, 12vw, 76px)",
                aspectRatio: "1 / 1.05",
                width: "100%",
                borderRadius: "clamp(6px, 1.5vw, 12px)",
                border: `1.5px solid ${isToday ? colors.accent : colors.border}`,
                background: colors.surface,
                padding: "clamp(3px, 0.8vw, 6px)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                alignItems: "stretch",
                cursor: "pointer",
                position: "relative",
                transition: "all 0.15s ease",
                textAlign: "left",
                overflow: "hidden",
                boxSizing: "border-box",
                ...getCellStyle(entry?.amount),
              }}
            >
              {/* Day Header row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  gap: 2,
                }}
              >
                <span
                  style={{
                    fontSize: "clamp(9px, 2.2vw, 12px)",
                    fontWeight: isToday ? 700 : 600,
                    color: isToday ? colors.accent : colors.textMuted,
                    width: "clamp(16px, 3.5vw, 20px)",
                    height: "clamp(16px, 3.5vw, 20px)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isToday ? colors.surfaceActive : "transparent",
                    flexShrink: 0,
                  }}
                >
                  {d}
                </span>

                {/* Technique Tag (e.g. Follow, Rejection, Follow&Rejection) */}
                {entry?.technique && (
                  <span
                    style={{
                      fontSize: "clamp(6px, 1.6vw, 8.5px)",
                      fontWeight: 600,
                      padding: "1px 3px",
                      borderRadius: 4,
                      background: colors.surfaceActive,
                      color: colors.accent,
                      border: `1px solid ${colors.borderStrong}`,
                      whiteSpace: "nowrap",
                      maxWidth: "calc(100% - 18px)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      lineHeight: 1,
                    }}
                    title={TECHNIQUE_LABEL_MAP[entry.technique] || entry.technique}
                  >
                    {TECHNIQUE_LABEL_MAP[entry.technique] || entry.technique}
                  </span>
                )}
              </div>

              {/* Amount Display */}
              {hasData ? (
                <div style={{ width: "100%", my: "auto", overflow: "hidden" }}>
                  <div
                    className="mono"
                    style={{
                      fontSize: "clamp(9px, 2.4vw, 13px)",
                      fontWeight: 700,
                      color:
                        entry.amount > 0
                          ? colors.profit
                          : entry.amount < 0
                          ? colors.loss
                          : colors.textMuted,
                      lineHeight: 1.1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {fmtNum(entry.amount)}
                  </div>
                </div>
              ) : (
                <div style={{ height: 8 }} />
              )}

              {/* Footer Meta (Session & Lots) */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  fontSize: "clamp(7px, 1.8vw, 9px)",
                  color: colors.textMuted,
                  lineHeight: 1,
                  gap: 2,
                  overflow: "hidden",
                }}
              >
                {entry?.session ? (
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "60%",
                    }}
                  >
                    {SESSION_LABEL_MAP[entry.session] || entry.session}
                  </span>
                ) : (
                  <span />
                )}
                {entry?.lots ? (
                  <span
                    className="mono"
                    style={{
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {entry.lots}M
                  </span>
                ) : (
                  <span />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Month Statistics Cards (Responsive 2-col on mobile, auto-fit on tablet/desktop) */}
      <div
        id="month-stats-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "clamp(8px, 2vw, 12px)",
          width: "100%",
        }}
      >
        <StatCard
          colors={colors}
          icon={<TrendingUp size={16} />}
          label={`กำไร/ขาดทุน ${THAI_MONTHS[month]}`}
          value={`${fmtNum(monthTotal)} ฿`}
          sub={
            monthTotal > 0
              ? "ทำกำไรได้ดีมาก"
              : monthTotal < 0
              ? "ขาดทุนในเดือนนี้"
              : "ยังไม่มีกำไรขาดทุน"
          }
          tone={monthTotal > 0 ? "up" : monthTotal < 0 ? "down" : "neutral"}
        />

        <StatCard
          colors={colors}
          icon={<Target size={16} />}
          label="อัตราชนะ (Win Rate)"
          value={winRate !== null ? `${winRate}%` : "—"}
          sub={tradedDays > 0 ? `ชนะ ${wins} วัน / แพ้ ${losses} วัน` : "ยังไม่มีข้อมูลเทรด"}
          tone={winRate !== null && winRate >= 50 ? "up" : winRate !== null ? "down" : "neutral"}
        />

        <StatCard
          colors={colors}
          icon={<Zap size={16} />}
          label="วันที่กำไรสูงสุด"
          value={bestDay ? `${fmtNum(bestDay.amount)} ฿` : "—"}
          sub={bestDay ? `วันที่ ${bestDay.day} ${THAI_MONTHS[month]}` : "ไม่มีข้อมูล"}
          tone="up"
        />

        <StatCard
          colors={colors}
          icon={<TrendingDown size={16} />}
          label="วันที่ขาดทุนสูงสุด"
          value={worstDay ? `${fmtNum(worstDay.amount)} ฿` : "—"}
          sub={worstDay ? `วันที่ ${worstDay.day} ${THAI_MONTHS[month]}` : "ไม่มีข้อมูล"}
          tone={worstDay && worstDay.amount < 0 ? "down" : "neutral"}
        />

        <StatCard
          colors={colors}
          icon={<Layers size={16} />}
          label="จำนวนไม้สะสม"
          value={`${totalLots} ไม้`}
          sub={tradedDays > 0 ? `เฉลี่ย ${(totalLots / tradedDays).toFixed(1)} ไม้/วัน` : "ยังไม่ได้บันทึกไม้"}
          tone="neutral"
        />
      </div>
    </div>
  );
};

interface StatCardProps {
  colors: ThemeColors;
  icon?: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down" | "neutral";
}

export const StatCard: React.FC<StatCardProps> = ({
  colors,
  icon,
  label,
  value,
  sub,
  tone = "neutral",
}) => {
  const valueColor =
    tone === "up" ? colors.profit : tone === "down" ? colors.loss : colors.text;

  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: "clamp(10px, 2.5vw, 14px) clamp(10px, 2.5vw, 16px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
          gap: 4,
        }}
      >
        <span
          style={{
            fontSize: "clamp(10.5px, 2.4vw, 12px)",
            color: colors.textMuted,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </span>
        {icon && (
          <span style={{ color: colors.accent, opacity: 0.85, flexShrink: 0 }}>
            {icon}
          </span>
        )}
      </div>
      <div
        className="mono"
        style={{
          fontSize: "clamp(15px, 3.8vw, 19px)",
          fontWeight: 700,
          color: valueColor,
          lineHeight: 1.2,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: "clamp(9.5px, 2.2vw, 11px)",
            color: colors.textMuted,
            marginTop: 4,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
};
