import { Goal } from './types';
import { generateId } from './utils';

const GOALS_KEY = 'goals';

export function loadGoals(): Goal[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    return raw ? (JSON.parse(raw) as Goal[]) : [];
  } catch {
    return [];
  }
}

export function saveGoals(goals: Goal[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

export function createGoal(fields: Pick<Goal, 'title' | 'description' | 'deadline'>): Goal {
  return {
    id: generateId(),
    title: fields.title,
    description: fields.description,
    deadline: fields.deadline,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
}

export function getActiveGoals(): Goal[] {
  return loadGoals().filter((g) => g.isActive);
}

export function buildGoalsContext(goals: Goal[]): string {
  const active = goals.filter((g) => g.isActive);
  if (active.length === 0) return '';
  const lines = active.map((g, i) => {
    let line = `${i + 1}. ${g.title}`;
    if (g.description) line += `：${g.description}`;
    if (g.deadline) line += `（截止 ${g.deadline}）`;
    return line;
  });
  return `\n\n【我当前的目标】\n${lines.join('\n')}`;
}
