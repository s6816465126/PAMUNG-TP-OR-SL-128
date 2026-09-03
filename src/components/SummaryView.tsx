import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Award,
  Clock,
  Crosshair,
  Layers,
  Sparkles,
} from "lucide-react";
import { EntriesMap, ThemeColors } from "../types";
import {
  THAI_MONTHS_SHORT,
  SESSIONS,
  TECHNIQUES,
} from "../constants/theme";
import { dateKey, daysInMonth, fmtNum } from "../utils/format";
import { StatCard } from "./CalendarView";

interface SummaryViewProps {
  year: number;
  entries: EntriesMap;
  colors: ThemeColors;
  onSelectMonth: (monthIndex: number) => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  year,
  entries,
  colors,
  onSelectMonth,
}) => {
  // Compute monthly totals
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

  // Compute full analytics
  const analytics = useMemo(() => {
    let wins = 0;
    let losses = 0;
    let totalLots = 0;
    let lotEntriesCount = 0;
    const sessionStats: Record<string, { count: number; wins: number; losses: number; profit: number }> = {};
    const techniqueStats: Record<string, { count: number; wins: number; losses: number; profit: number }> = {};
    const equityPoints: { label: string; value: number }[] = [{ label: "เริ่ม", value: 0 }];
    let runningPnl = 0;

    for (let mi = 0; mi < 12; mi++) {
      const dim = daysInMonth(year, mi);
      for (let d = 1; d <= dim; d++) {
        const key = dateKey(year, mi, d);
        const e = entries[key];
        if (!e) continue;

        runningPnl += e.amount;
        equityPoints.push({
          label: `${d} ${THAI_MONTHS_SHORT[mi]}`,
          value: runningPnl,
        });

        const isWin = e.amount > 0;
        const isLoss = e.amount < 0;
        if (isWin) wins++;
        else if (isLoss) losses++;

        if (e.lots !== undefined && !isNaN(e.lots) && e.lots > 0) {
          totalLots += e.lots;
          lotEntriesCount++;
        }

        if (e.session) {
          const s = (sessionStats[e.session] ||= { count: 0, wins: 0, losses: 0, profit: 0 });
          s.count++;
          s.profit += e.amount;
          if (isWin) s.wins++;
          else if (isLoss) s.losses++;
        }

        if (e.technique) {
          const techKey =
            e.technique === "follow&rejection" ||
            e.technique === "Follow&Rejection" ||
            e.technique === "Follow_Rejection"
              ? "follow_rejection"
              : e.technique === "Follow"
              ? "follow"
              : e.technique === "Rejection"
              ? "rejection"
              : e.technique;
          const t = (techniqueStats[techKey] ||= { count: 0, wins: 0, losses: 0, profit: 0 });
          t.count++;
          t.profit += e.amount;
          if (isWin) t.wins++;
          else if (isLoss) t.losses++;
        }
      }
    }

    const tradedDays = wins + losses;
    const winRate = tradedDays > 0 ? Math.round((wins / tradedDays) * 100) : null;

    // Best / worst session & technique
    let topSession: { id: string; label: string; count: number; winRate: number; profit: number } | null = null;
    for (const s of SESSIONS) {
      const stat = sessionStats[s.id];
      if (stat && stat.count > 0) {
        const wr = Math.round((stat.wins / (stat.wins + stat.losses || 1)) * 100);
        if (!topSession || stat.count > topSession.count) {
          topSession = { id: s.id, label: s.shortLabel, count: stat.count, winRate: wr, profit: stat.profit };
        }
      }
    }

    let topTechnique: { id: string; label: string; count: number; winRate: number; profit: number } | null = null;
    for (const t of TECHNIQUES) {
      const stat = techniqueStats[t.id];
      if (stat && stat.count > 0) {
        const wr = Math.round((stat.wins / (stat.wins + stat.losses || 1)) * 100);
        if (!topTechnique || stat.count > topTechnique.count) {
          topTechnique = { id: t.id, label: t.label, count: stat.count, winRate: wr, profit: stat.profit };
        }
      }
    }

    return {
      wins,
      losses,
      tradedDays,
      winRate,
      totalLots,
      avgLots: lotEntriesCount > 0 ? (totalLots / lotEntriesCount).toFixed(1) : "—",
      topSession,
      topTechnique,
      sessionChartData: SESSIONS.map((s) => ({
        name: s.shortLabel,
        count: sessionStats[s.id]?.count || 0,
        profit: sessionStats[s.id]?.profit || 0,
      })),
      techniqueChartData: TECHNIQUES.map((t) => ({
        name: t.label,
        count: techniqueStats[t.id]?.count || 0,
        profit: techniqueStats[t.id]?.profit || 0,
      })),
      monthlyChartData: THAI_MONTHS_SHORT.map((label, mi) => ({
        name: label,
        value: yearMonthTotals[mi],
        monthIndex: mi,
      })),
      equityPoints,
    };
  }, [entries, year, yearMonthTotals]);

  return (
    <div
      id="summary-view-container"
      style={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={18} color={colors.accent} />
          <h2
            style={{
              fontSize: "clamp(18px, 4vw, 22px)",
              fontWeight: 700,
              color: colors.text,
              margin: 0,
            }}
          >
            สรุปภาพรวมการเทรดปี {year}
          </h2>
        </div>
        <p
          style={{
            fontSize: "clamp(11.5px, 2.8vw, 13px)",
            color: colors.textMuted,
            margin: "4px 0 0",
          }}
        >
          วิเคราะห์สถิติ อัตราชนะ และเส้นทางการเติบโตของพอร์ต
        </p>
      </div>

      {/* Top Stat Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "clamp(8px, 2vw, 12px)",
          marginBottom: 20,
          width: "100%",
        }}
      >
        <StatCard
          colors={colors}
          icon={<TrendingUp size={16} />}
          label={`กำไรสะสมทั้งปี ${year}`}
          value={`${fmtNum(yearTotal)} ฿`}
          sub={yearTotal > 0 ? "พอร์ตเป็นบวก เติบโตต่อเนื่อง" : yearTotal < 0 ? "พอร์ตยังติดลบ สู้ต่อไป" : "ไม่มีการเทรด"}
          tone={yearTotal > 0 ? "up" : yearTotal < 0 ? "down" : "neutral"}
        />

        <StatCard
          colors={colors}
          icon={<Award size={16} />}
          label="อัตราชนะรวม (Win Rate)"
          value={analytics.winRate !== null ? `${analytics.winRate}%` : "—"}
          sub={`เทรด ${analytics.tradedDays} วัน (${analytics.wins}W / ${analytics.losses}L)`}
          tone={analytics.winRate !== null && analytics.winRate >= 50 ? "up" : "neutral"}
        />

        <StatCard
          colors={colors}
          icon={<Clock size={16} />}
          label="ช่วงเวลาเทรดบ่อยสุด"
          value={analytics.topSession ? analytics.topSession.label : "—"}
          sub={
            analytics.topSession
              ? `เข้า ${analytics.topSession.count} ครั้ง (Win ${analytics.topSession.winRate}%)`
              : "ยังไม่มีข้อมูล"
          }
          tone="neutral"
        />

        <StatCard
          colors={colors}
          icon={<Crosshair size={16} />}
          label="เทคนิคที่ใช้บ่อยสุด"
          value={analytics.topTechnique ? analytics.topTechnique.label : "—"}
          sub={
            analytics.topTechnique
              ? `ใช้ ${analytics.topTechnique.count} ครั้ง (Win ${analytics.topTechnique.winRate}%)`
              : "ยังไม่มีข้อมูล"
          }
          tone="neutral"
        />

        <StatCard
          colors={colors}
          icon={<Layers size={16} />}
          label="จำนวนไม้รวมทั้งปี"
          value={`${analytics.totalLots} ไม้`}
          sub={`เฉลี่ย ${analytics.avgLots} ไม้/วัน`}
          tone="neutral"
        />
      </div>

      {/* Equity Curve (Line Chart) */}
      <div
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          padding: "clamp(12px, 3vw, 18px)",
          marginBottom: 16,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
          width: "100%",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 10,
          }}
        >
          <div>
            <h3 style={{ fontSize: "clamp(13.5px, 3vw, 15px)", fontWeight: 700, color: colors.text, margin: 0 }}>
              เส้นทางกำไรสะสมตลอดปี (Equity Curve)
            </h3>
            <span style={{ fontSize: 11, color: colors.textMuted }}>
              กราฟแสดงกำไร/ขาดทุนสะสมตามลำดับวันที่
            </span>
          </div>
          <span
            className="mono"
            style={{
              fontSize: "clamp(14px, 3vw, 16px)",
              fontWeight: 700,
              color: yearTotal >= 0 ? colors.profit : colors.loss,
              whiteSpace: "nowrap",
            }}
          >
            {fmtNum(yearTotal)} ฿
          </span>
        </div>

        {analytics.equityPoints.length > 1 ? (
          <div style={{ width: "100%", height: 220, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.equityPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={colors.border} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: colors.textMuted }}
                  interval="preserveStartEnd"
                  axisLine={{ stroke: colors.border }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: colors.textMuted }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v.toLocaleString()}`}
                />
                <Tooltip
                  contentStyle={{
                    background: colors.surface,
                    border: `1px solid ${colors.borderStrong}`,
                    borderRadius: 8,
                    fontSize: 11,
                    color: colors.text,
                  }}
                  formatter={(v: any) => [`${fmtNum(Number(v))} ฿`, "กำไรสะสม"]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={colors.accent}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: colors.accent }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div
            style={{
              height: 140,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.textMuted,
              fontSize: 12,
            }}
          >
            ยังไม่มีข้อมูลบันทึกในปฏิทินสำหรับปีนี้
          </div>
        )}
      </div>

      {/* Monthly Breakdown Bar Chart */}
      <div
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          padding: "clamp(12px, 3vw, 18px)",
          marginBottom: 16,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
          width: "100%",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <h3 style={{ fontSize: "clamp(13.5px, 3vw, 15px)", fontWeight: 700, color: colors.text, margin: 0 }}>
            ผลงานรายเดือน (Monthly P&L)
          </h3>
          <span style={{ fontSize: 11, color: colors.textMuted }}>
            แตะที่แท่งกราฟเพื่อเปิดดูปฏิทินของเดือนนั้น
          </span>
        </div>

        <div style={{ width: "100%", height: 200, minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={analytics.monthlyChartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onClick={(state: any) => {
                if (state && state.activePayload && state.activePayload.length > 0) {
                  const monthIdx = state.activePayload[0].payload.monthIndex;
                  if (typeof monthIdx === "number") onSelectMonth(monthIdx);
                }
              }}
            >
              <CartesianGrid stroke={colors.border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: colors.textMuted }} axisLine={{ stroke: colors.border }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: colors.textMuted }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toLocaleString()}`} />
              <Tooltip
                contentStyle={{
                  background: colors.surface,
                  border: `1px solid ${colors.borderStrong}`,
                  borderRadius: 8,
                  fontSize: 11,
                  color: colors.text,
                }}
                formatter={(v: any) => [`${fmtNum(Number(v))} ฿`, "กำไร/ขาดทุน"]}
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]} cursor="pointer">
                {analytics.monthlyChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.value > 0 ? colors.profit : entry.value < 0 ? colors.loss : colors.border}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Grid: Sessions & Techniques */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "clamp(10px, 2vw, 16px)",
          marginBottom: 16,
          width: "100%",
        }}
      >
        {/* Session Chart */}
        <div
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 14,
            padding: "clamp(12px, 3vw, 16px)",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <h3 style={{ fontSize: "clamp(13px, 3vw, 14px)", fontWeight: 700, color: colors.text, margin: "0 0 2px" }}>
            ความถี่ตามช่วงเวลาที่เทรด
          </h3>
          <p style={{ fontSize: 11, color: colors.textMuted, margin: "0 0 10px" }}>
            เช้า, บ่าย, เย็น, ดึก, ข้ามคืน
          </p>
          {analytics.sessionChartData.some((s) => s.count > 0) ? (
            <div style={{ width: "100%", height: 160, minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.sessionChartData} margin={{ top: 8, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid stroke={colors.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: colors.textMuted }} axisLine={{ stroke: colors.border }} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: colors.textMuted }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: colors.surface,
                      border: `1px solid ${colors.borderStrong}`,
                      borderRadius: 8,
                      fontSize: 11,
                      color: colors.text,
                    }}
                    formatter={(v: any) => [`${v} ครั้ง`, "จำนวน"]}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]} fill={colors.accent} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: colors.textMuted, fontSize: 11 }}>
              ยังไม่มีการระบุช่วงเวลาเทรด
            </div>
          )}
        </div>

        {/* Technique Chart */}
        <div
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 14,
            padding: "clamp(12px, 3vw, 16px)",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <h3 style={{ fontSize: "clamp(13px, 3vw, 14px)", fontWeight: 700, color: colors.text, margin: "0 0 2px" }}>
            ความถี่ตามเทคนิคที่ใช้ (Technique)
          </h3>
          <p style={{ fontSize: 11, color: colors.textMuted, margin: "0 0 10px" }}>
            Follow, Rejection และ Follow&Rejection
          </p>
          {analytics.techniqueChartData.some((t) => t.count > 0) ? (
            <div style={{ width: "100%", height: 160, minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.techniqueChartData} margin={{ top: 8, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid stroke={colors.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: colors.textMuted }} axisLine={{ stroke: colors.border }} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: colors.textMuted }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: colors.surface,
                      border: `1px solid ${colors.borderStrong}`,
                      borderRadius: 8,
                      fontSize: 11,
                      color: colors.text,
                    }}
                    formatter={(v: any) => [`${v} ครั้ง`, "จำนวน"]}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]} fill={colors.accentDeep} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: colors.textMuted, fontSize: 11 }}>
              ยังไม่มีการระบุเทคนิค
            </div>
          )}
        </div>
      </div>

      {/* Personalized Trader Coaching Insight */}
      <div
        id="trader-insight-card"
        style={{
          background: colors.surfaceActive,
          border: `1px solid ${colors.borderStrong}`,
          borderRadius: 14,
          padding: "clamp(14px, 3vw, 20px)",
          fontSize: "clamp(11.5px, 2.5vw, 13px)",
          lineHeight: 1.65,
          color: colors.text,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Sparkles size={16} color={colors.accent} />
          <span style={{ fontSize: "clamp(12.5px, 2.8vw, 14px)", fontWeight: 700, color: colors.accent }}>
            คำแนะนำสำหรับพัฒนาพอร์ตของคุณ (Trader Insights)
          </span>
        </div>
        <div>
          {analytics.tradedDays < 3 ? (
            <p style={{ margin: 0 }}>
              คุณเพิ่งเริ่มบันทึกข้อมูลได้ {analytics.tradedDays} วัน พยายามบันทึกให้ครบทุกวันที่เข้าเทรด พร้อมระบุช่วงเวลาและเทคนิค เพื่อให้ระบบสรุปจุดเด่นและจุดที่ควรพัฒนาได้อย่างแม่นยำยิ่งขึ้นครับ
            </p>
          ) : (
            <div>
              <p style={{ margin: "0 0 6px" }}>
                {yearTotal > 0
                  ? `✨ ยินดีด้วยครับ! ปีนี้พอร์ตของคุณทำกำไรได้รวม ${fmtNum(yearTotal)} บาท มีอัตราชนะอยู่ที่ ${analytics.winRate}%`
                  : yearTotal < 0
                  ? `🌱 ปีนี้พอร์ตยังติดลบอยู่ที่ ${fmtNum(yearTotal)} บาท แต่ข้อมูลที่บันทึกไว้จะเป็นบทเรียนสำคัญในการพัฒนาระบบเทรดให้เสถียรยิ่งขึ้นครับ`
                  : `📊 ภาพรวมปีนี้ผลงานเสมอตัว`}
              </p>
              {analytics.topTechnique && (
                <p style={{ margin: "0 0 6px" }}>
                  🎯 <strong>เทคนิคที่เข้ามือ:</strong> คุณใช้เทคนิค <strong>{analytics.topTechnique.label}</strong> บ่อยที่สุด ({analytics.topTechnique.count} ครั้ง, อัตราชนะ {analytics.topTechnique.winRate}%)
                </p>
              )}
              {analytics.topSession && (
                <p style={{ margin: "0 0 6px" }}>
                  ⏰ <strong>ช่วงเวลาทำกำไร:</strong> ช่วง <strong>{analytics.topSession.label}</strong> เป็นช่วงที่คุณเข้าเทรดบ่อยที่สุด ({analytics.topSession.count} ครั้ง)
                </p>
              )}
              <p style={{ margin: 0, color: colors.textMuted }}>
                💡 <em>เคล็ดลับ:</em> โฟกัสช่วงเวลาและเทคนิคที่มีอัตราชนะสูง และควบคุมขนาดไม้ (Lot Size) ให้สม่ำเสมอ พอร์ตจะเติบโตได้อย่างมั่นคงครับ!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
