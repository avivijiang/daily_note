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
  carriedFrom?: string | null; // date string if carried from previous day
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
}

export interface Analysis {
  generatedAt: string;
  diary: string;
  summary: AnalysisSummary | null;
  insight: string;
  personas: Partial<Record<PersonaId, string>>;
}

export interface DiaryData {
  date: string;
  events: DiaryEvent[];
  mood: Mood | null;
  inspiration: string;
  gratitude: [string, string, string];
  todos: Todo[];
  analysis?: Analysis | null;
}

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
