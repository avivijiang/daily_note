/** Groundhog state management: streaks, quotes, music prefs, meditation stats */

// ── Types ─────────────────────────────────────────────────────────────

export type GroundhogEmotion =
  | 'idle' | 'happy' | 'thinking' | 'excited'
  | 'sleepy' | 'music' | 'waving' | 'thumbsup' | 'sad';

export interface GroundhogState {
  currentEmotion: GroundhogEmotion;
  streakDays: number;
  lastOpenDate: string;
  quotesShown: string[];
}

export interface MusicPreference {
  lastScene: string;
  dismissed: string;   // YYYY-MM-DD
  totalPlays: number;
}

export interface MeditationStats {
  totalSessions: number;
  totalMinutes: number;
  lastSession: string;
}

// ── Quote bank ────────────────────────────────────────────────────────

export interface Quote {
  id: string;
  text: string;
  trigger: 'first_open' | 'streak_3' | 'streak_7' | 'bad_mood' |
           'ai_slow' | 'goal_set' | 'custom_persona' | 'missed_3days' |
           'meditation_done' | 'weekly_report' | 'logo_click' | 'random';
}

export const QUOTES: Quote[] = [
  { id: 'first_open',      trigger: 'first_open',      text: '嗨！我是土拨鼠。每天都差不多，除非你愿意不一样。' },
  { id: 'streak_3',        trigger: 'streak_3',        text: '连续 3 天了。土拨鼠之日的秘诀是坚持，你做到了。' },
  { id: 'streak_7',        trigger: 'streak_7',        text: '一周！你已经比 80% 的人坚持得久了。' },
  { id: 'bad_mood',        trigger: 'bad_mood',        text: '不好的一天也值得被记录。至少你还在。' },
  { id: 'ai_slow',         trigger: 'ai_slow',         text: '土拨鼠正在认真思考，请稍等...' },
  { id: 'goal_set',        trigger: 'goal_set',        text: '有目标的土拨鼠，挖的洞才有方向。' },
  { id: 'custom_persona',  trigger: 'custom_persona',  text: '你的专属导师出现了。让他说说你今天的表现。' },
  { id: 'missed_3days',    trigger: 'missed_3days',    text: '土拨鼠想你了。今天写点什么？' },
  { id: 'meditation_done', trigger: 'meditation_done', text: '你刚刚给大脑放了个假。明天会更清醒。' },
  { id: 'weekly_report',   trigger: 'weekly_report',   text: '一周的你，浓缩在这里了。值得看一看。' },
  { id: 'logo_1',          trigger: 'logo_click',      text: '土拨鼠说：今天的事，今天写完。' },
  { id: 'logo_2',          trigger: 'logo_click',      text: '嗯？点我干嘛？专心写日记！' },
  { id: 'logo_3',          trigger: 'logo_click',      text: '每天挖一个洞，总会挖出宝藏的。' },
  { id: 'random_1',        trigger: 'random',          text: '好记性不如烂笔头，但我更喜欢你用键盘。' },
  { id: 'random_2',        trigger: 'random',          text: '复利不只是钱，时间、技能、记录都复利。' },
];

// ── Streak calculation ────────────────────────────────────────────────

export function calcStreak(today: string): number {
  let streak = 0;
  let d = today;
  while (true) {
    const raw = localStorage.getItem(`diary_${d}`);
    if (!raw) break;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.events?.length > 0 || parsed.mood || parsed.inspiration?.trim()) {
        streak++;
        const prev = new Date(d + 'T00:00:00');
        prev.setDate(prev.getDate() - 1);
        d = prev.toISOString().slice(0, 10);
      } else break;
    } catch { break; }
  }
  return streak;
}

export function daysSinceLastOpen(lastOpenDate: string): number {
  const last = new Date(lastOpenDate + 'T00:00:00');
  const now = new Date();
  return Math.floor((now.getTime() - last.getTime()) / 86400000);
}

// ── localStorage helpers ──────────────────────────────────────────────

const GH_KEY   = 'groundhog_state';
const MUSIC_KEY = 'music_preference';
const MED_KEY   = 'meditation_stats';

export function loadGroundhogState(): GroundhogState {
  try {
    const raw = localStorage.getItem(GH_KEY);
    return raw ? JSON.parse(raw) : {
      currentEmotion: 'idle', streakDays: 0,
      lastOpenDate: '', quotesShown: [],
    };
  } catch { return { currentEmotion: 'idle', streakDays: 0, lastOpenDate: '', quotesShown: [] }; }
}

export function saveGroundhogState(s: GroundhogState) {
  localStorage.setItem(GH_KEY, JSON.stringify(s));
}

export function loadMusicPref(): MusicPreference {
  try {
    const raw = localStorage.getItem(MUSIC_KEY);
    return raw ? JSON.parse(raw) : { lastScene: 'lofi', dismissed: '', totalPlays: 0 };
  } catch { return { lastScene: 'lofi', dismissed: '', totalPlays: 0 }; }
}

export function saveMusicPref(p: MusicPreference) {
  localStorage.setItem(MUSIC_KEY, JSON.stringify(p));
}

export function loadMeditationStats(): MeditationStats {
  try {
    const raw = localStorage.getItem(MED_KEY);
    return raw ? JSON.parse(raw) : { totalSessions: 0, totalMinutes: 0, lastSession: '' };
  } catch { return { totalSessions: 0, totalMinutes: 0, lastSession: '' }; }
}

export function saveMeditationStats(s: MeditationStats) {
  localStorage.setItem(MED_KEY, JSON.stringify(s));
}

export function markQuoteShown(id: string) {
  const state = loadGroundhogState();
  if (!state.quotesShown.includes(id)) {
    state.quotesShown = [...state.quotesShown, id];
    saveGroundhogState(state);
  }
}

export function hasShownQuote(id: string): boolean {
  return loadGroundhogState().quotesShown.includes(id);
}
