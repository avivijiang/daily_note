import { Category, CategoryStyle } from './types';

export const CATEGORIES: Record<Category, CategoryStyle> = {
  '专注工作': {
    bg: '#FFF9DB', border: '#F4C430', solidBorder: '#e6b800',
    emoji: '⏱',
    keywords: ['工作', '写作', '编程', '学习', '专注', '阅读'],
  },
  '饮食': {
    bg: '#FFE4E4', border: '#FFB3B3', solidBorder: '#ff8080',
    emoji: '🍳',
    keywords: ['烹饪', '做饭', '吃饭', '早餐', '午餐', '晚餐', '饮食', '用餐', '下厨'],
  },
  '休息': {
    bg: '#E4F5E4', border: '#90D090', solidBorder: '#5cb85c',
    emoji: '😴',
    keywords: ['小憩', '打盹', '睡觉', '休息', '午休', '睡眠'],
  },
  '事务': {
    bg: '#EEE4FF', border: '#C4A0FF', solidBorder: '#9966ff',
    emoji: '📋',
    keywords: ['事务', '流程', '行政', '杂事', '会议', '通话', '处理'],
  },
  '运动': {
    bg: '#FFE8D6', border: '#FFB07A', solidBorder: '#ff8533',
    emoji: '🏋️',
    keywords: ['运动', '健身', '跑步', '瑜伽', '锻炼', '散步', '游泳'],
  },
  '其他': {
    bg: '#F0F0F0', border: '#C0C0C0', solidBorder: '#999999',
    emoji: '📝',
    keywords: [],
  },
};

export const CATEGORY_LIST = Object.keys(CATEGORIES) as Category[];

export function getCategoryStyle(category: string): CategoryStyle {
  return CATEGORIES[category as Category] ?? CATEGORIES['其他'];
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${dayLabels[d.getDay()]}`;
}

export function getWeekDays(dateStr: string): Array<{
  date: string;
  dayNum: number;
  dayLabel: string;
  isSelected: boolean;
  isToday: boolean;
}> {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay(); // 0=Sun
  const monday = new Date(d);
  monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));

  const today = todayStr();
  const dayLabels = ['一', '二', '三', '四', '五', '六', '日'];

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const dateString = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    return {
      date: dateString,
      dayNum: day.getDate(),
      dayLabel: dayLabels[i],
      isSelected: dateString === dateStr,
      isToday: dateString === today,
    };
  });
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function getDuration(startTime: string, endTime: string): string {
  const diff = timeToMinutes(endTime) - timeToMinutes(startTime);
  if (diff <= 0) return '';
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours === 0) return `${mins}分钟`;
  if (mins === 0) return `${hours}小时`;
  return `${hours}小时${mins}分钟`;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function currentTimeStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Timeline layout constants
export const TIMELINE_START_HOUR = 6;
export const TIMELINE_END_HOUR = 23;
export const HOUR_HEIGHT = 64; // px per hour (= 1px per minute * 60, rounded)
export const LABEL_WIDTH = 64; // px for time label column

export function timeToY(time: string): number {
  const minutes = timeToMinutes(time) - TIMELINE_START_HOUR * 60;
  return Math.max(0, minutes * (HOUR_HEIGHT / 60));
}

export function yToTime(y: number): string {
  const totalMinutes = Math.round(y / (HOUR_HEIGHT / 60)) + TIMELINE_START_HOUR * 60;
  const startMin = TIMELINE_START_HOUR * 60;
  const endMin = TIMELINE_END_HOUR * 60;
  const clamped = Math.max(startMin, Math.min(endMin, totalMinutes));
  // Snap to 15-minute intervals
  const snapped = Math.round(clamped / 15) * 15;
  const h = Math.floor(snapped / 60);
  const m = snapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addMinutesToTime(time: string, minutes: number): string {
  const total = Math.min(timeToMinutes(time) + minutes, TIMELINE_END_HOUR * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
