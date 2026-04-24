import { DiaryData } from './types';

const KEY_PREFIX = 'diary_';

function createEmpty(date: string): DiaryData {
  return {
    date,
    events: [],
    mood: null,
    inspiration: '',
    gratitude: ['', '', ''],
    todos: [],
  };
}

export function loadDiary(date: string): DiaryData {
  if (typeof window === 'undefined') return createEmpty(date);
  try {
    const raw = localStorage.getItem(KEY_PREFIX + date);
    if (!raw) return createEmpty(date);
    const parsed = JSON.parse(raw) as DiaryData;
    // Ensure gratitude is always a 3-tuple
    if (!Array.isArray(parsed.gratitude) || parsed.gratitude.length !== 3) {
      parsed.gratitude = ['', '', ''];
    }
    return parsed;
  } catch {
    return createEmpty(date);
  }
}

export function saveDiary(data: DiaryData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_PREFIX + data.date, JSON.stringify(data));
}
