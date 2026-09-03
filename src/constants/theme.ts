import { SessionOption, TechniqueOption, ThemeColors } from "../types";

export const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export const THAI_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

export const THAI_WEEKDAYS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

export const SESSIONS: SessionOption[] = [
  { id: "morning", label: "เช้า (06:00–12:00)", shortLabel: "เช้า", timeRange: "06:00 - 12:00" },
  { id: "afternoon", label: "บ่าย (12:00–16:00)", shortLabel: "บ่าย", timeRange: "12:00 - 16:00" },
  { id: "evening", label: "เย็น (16:00–20:00)", shortLabel: "เย็น", timeRange: "16:00 - 20:00" },
  { id: "night", label: "ดึก (20:00–00:00)", shortLabel: "ดึก", timeRange: "20:00 - 00:00" },
  { id: "late", label: "ข้ามคืน (00:00–06:00)", shortLabel: "ข้ามคืน", timeRange: "00:00 - 06:00" },
];

export const SESSION_LABEL_MAP: Record<string, string> = Object.fromEntries(
  SESSIONS.map((s) => [s.id, s.shortLabel])
);

// Techniques: Follow, Rejection และ Follow&Rejection
export const TECHNIQUES: TechniqueOption[] = [
  { id: "follow", label: "Follow", description: "เทรดตามแนวโน้ม / โมเมนตัม" },
  { id: "rejection", label: "Rejection", description: "เทรดตามการปฏิเสธราคา / จุดกลับตัว" },
  { id: "follow_rejection", label: "Follow&Rejection", description: "เทรดทั้ง Follow และ Rejection ร่วมกัน" },
];

export const TECHNIQUE_LABEL_MAP: Record<string, string> = {
  ...Object.fromEntries(TECHNIQUES.map((t) => [t.id, t.label])),
  "follow&rejection": "Follow&Rejection",
  "Follow&Rejection": "Follow&Rejection",
  "Follow_Rejection": "Follow&Rejection",
  "follow_rejection": "Follow&Rejection",
  "Follow": "Follow",
  "Rejection": "Rejection",
};

export const LIGHT_THEME: ThemeColors = {
  bg: "#F2E8FA",
  bgAlt: "#E9DCF7",
  surface: "#FCFAFF",
  surfaceActive: "#EFE5FC",
  border: "#D8C7ED",
  borderStrong: "#BD9FE0",
  text: "#322149",
  textMuted: "#83709B",
  accent: "#7A43C6",
  accentDeep: "#5B2A9E",
  profit: "#1C7C54",
  profitBg: "rgba(28, 124, 84, 0.12)",
  loss: "#A82E4E",
  lossBg: "rgba(168, 46, 78, 0.12)",
  cardBg: "#FAF6FF",
  inputBg: "#F4ECFC",
};

export const DARK_THEME: ThemeColors = {
  bg: "#130D1E",
  bgAlt: "#1C142B",
  surface: "#241B37",
  surfaceActive: "#32254C",
  border: "#3F2F5E",
  borderStrong: "#624B8E",
  text: "#F3EEFB",
  textMuted: "#A797C6",
  accent: "#A78BFA",
  accentDeep: "#C4B5FD",
  profit: "#4ADE80",
  profitBg: "rgba(74, 222, 128, 0.16)",
  loss: "#FB7185",
  lossBg: "rgba(251, 113, 133, 0.16)",
  cardBg: "#241B37",
  inputBg: "#191226",
};
