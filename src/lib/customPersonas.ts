import { CustomPersona } from './types';
import { generateId } from './utils';

const CUSTOM_PERSONAS_KEY = 'custom_personas';

export const PRESET_COLORS = [
  '#1A3A5C', '#8B0000', '#1B3A2D', '#3E2723',
  '#4A235A', '#0D3B4F', '#7A4100', '#1A4A3A',
];

export const PRESET_EMOJIS = ['🔬', '🧙', '👨‍💼', '🦁', '🎭', '🌟', '🔥', '⚡', '🧠', '🎯'];

export function loadCustomPersonas(): CustomPersona[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_PERSONAS_KEY);
    return raw ? (JSON.parse(raw) as CustomPersona[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomPersonas(personas: CustomPersona[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CUSTOM_PERSONAS_KEY, JSON.stringify(personas));
}

export function createCustomPersona(
  fields: Pick<CustomPersona, 'name' | 'description' | 'systemPrompt' | 'accentColor' | 'emoji'>
): CustomPersona {
  return {
    id: `custom_${generateId()}`,
    ...fields,
    createdAt: new Date().toISOString(),
  };
}

const BLOCKED_PATTERNS = [
  /ignore previous/i,
  /ignore all instructions/i,
  /你现在不是/i,
  /system prompt/i,
  /jailbreak/i,
  /forget (all|your|previous)/i,
  /disregard/i,
];

export function validatePersonaPrompt(prompt: string): { valid: boolean; reason?: string } {
  if (!prompt.trim()) return { valid: false, reason: '提示词不能为空' };
  if (prompt.length > 3000) return { valid: false, reason: '提示词不能超过 3000 字' };
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(prompt)) {
      return { valid: false, reason: '提示词包含不允许的内容，请修改后重试' };
    }
  }
  return { valid: true };
}
