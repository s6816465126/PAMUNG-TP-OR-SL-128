export interface TradeEntry {
  amount: number;
  lots?: number;
  session?: string;
  technique?: string;
  note?: string;
  updatedAt?: string;
}

export type EntriesMap = Record<string, TradeEntry>;

export type ThemeMode = "light" | "dark";

export interface UserAccount {
  email: string;
  token: string;
  theme?: ThemeMode;
}

export interface SyncState {
  status: "synced" | "syncing" | "offline" | "error";
  lastSyncTime?: Date;
  message?: string;
}

export interface SessionOption {
  id: string;
  label: string;
  shortLabel: string;
  timeRange: string;
}

export interface TechniqueOption {
  id: string;
  label: string;
  description?: string;
}

export interface ThemeColors {
  bg: string;
  bgAlt: string;
  surface: string;
  surfaceActive: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  accent: string;
  accentDeep: string;
  profit: string;
  profitBg: string;
  loss: string;
  lossBg: string;
  cardBg: string;
  inputBg: string;
}
