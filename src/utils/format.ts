import { THAI_MONTHS } from "../constants/theme";

export function fmtNum(n: number): string {
  if (n === 0) return "0";
  const sign = n > 0 ? "+" : "−";
  const abs = Math.abs(n);
  return sign + abs.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

export function fmtCurrency(n: number): string {
  if (n === 0) return "฿0";
  const sign = n > 0 ? "+฿" : "−฿";
  const abs = Math.abs(n);
  return sign + abs.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

export function dateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

export function firstWeekdayMon(y: number, m: number): number {
  const jsDay = new Date(y, m, 1).getDay();
  return (jsDay + 6) % 7; // Monday = 0, Sunday = 6
}

export function formatDateThai(year: number, monthIndex: number, day: number): string {
  return `${day} ${THAI_MONTHS[monthIndex]} ${year}`;
}
