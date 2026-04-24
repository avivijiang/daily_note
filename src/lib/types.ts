export interface DiaryEvent {
  id: string;
  title: string;
  category: string;
  emoji: string;
  startTime: string;
  endTime: string;
  note: string;
}

export interface Todo {
  id: string;
  text: string;
  done: boolean;
  carriedFrom?: string | null;
}

export interface Mood {
  score: number; // 1-5
  note: string;
}

export interface AnalysisSummary {
  mood: string;
  insights: string[];
  gratitude: string[];
  todos: string[];
  score: number;
  goalAlignment?: number; // 1-10, AI eval of alignment with active goals
}

export interface Analysis {
  generatedAt: string;
  diary: string;
  summary: AnalysisSummary | null;
  insight: string;
  personas: Record<string, string>; // preset or custom persona id → text
}

export interface DiaryData {
  date: string;
  events: DiaryEvent[];
  mood: Mood | null;
  inspiration: string;
  gratitude: [string, string, string];
  todos: Todo[];
  analysis?: Analysis | null;
  greeting?: string; // AI or fallback daily greeting
}

// ── Goals ─────────────────────────────────────────────────────────────

export interface Goal {
  id: string;
  title: string;
  description: string;
  deadline?: string; // YYYY-MM-DD
  isActive: boolean;
  createdAt: string;
}

// ── Custom Personas ───────────────────────────────────────────────────

export interface CustomPersona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  accentColor: string; // HEX
  emoji: string;
  createdAt: string;
}

// ── Weekly Report ─────────────────────────────────────────────────────

export interface WeekStats {
  totalRecordDays: number;
  avgMoodScore: number;
  avgGoalAlignment: number;
  mostProductiveDay: string;
  totalEventHours: number;
  topCategory: string;
}

export interface WeeklyReport {
  generatedAt: string;
  weekStart: string;
  weekEnd: string;
  summary: string;
  stats: WeekStats | null;
  patterns: string;
  insight: string;
}

// ── Preset types ──────────────────────────────────────────────────────

export type PersonaId = 'jobs' | 'naval' | 'munger' | 'yangming' | 'musk';

export interface PersonaConfig {
  id: PersonaId;
  name: string;
  color: string;
  bgColor: string;
  sealText: string;
  systemPrompt: string;
}

export type Category = '专注工作' | '饮食' | '休息' | '事务' | '运动' | '其他';

export interface CategoryStyle {
  bg: string;
  border: string;
  solidBorder: string;
  emoji: string;
  keywords: string[];
}
