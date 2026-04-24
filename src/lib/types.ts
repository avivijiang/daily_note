export interface DiaryEvent {
  id: string;
  title: string;
  category: string;
  emoji: string;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  note: string;
}

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

export interface Mood {
  score: number; // 1-5
  note: string;
}

export interface DiaryData {
  date: string;
  events: DiaryEvent[];
  mood: Mood | null;
  inspiration: string;
  gratitude: [string, string, string];
  todos: Todo[];
}

export type Category = '专注工作' | '饮食' | '休息' | '事务' | '运动' | '其他';

export interface CategoryStyle {
  bg: string;
  border: string;
  solidBorder: string;
  emoji: string;
  keywords: string[];
}
