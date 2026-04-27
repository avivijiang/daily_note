/** Vercel AI SDK + OpenRouter unified adapter */

// ── Model list ────────────────────────────────────────────────────────

export interface ModelConfig {
  id: string;
  name: string;
  group: string;
  badge?: string; // e.g. '推荐' | '思维链'
}

export const MODEL_LIST: ModelConfig[] = [
  // ── 千问 (Qwen / Alibaba) ──────────────────────────────────────
  { id: 'qwen/qwen-max',           name: 'Qwen-Max',        group: '千问', badge: '推荐' },
  { id: 'qwen/qwen3-235b-a22b',    name: 'Qwen3 235B',      group: '千问' },
  { id: 'qwen/qwen-plus',          name: 'Qwen-Plus',       group: '千问' },

  // ── DeepSeek ───────────────────────────────────────────────────
  { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek V3',  group: 'DeepSeek', badge: '推荐' },
  { id: 'deepseek/deepseek-r1',           name: 'DeepSeek R1',  group: 'DeepSeek', badge: '思维链' },

  // ── 豆包 (ByteDance Seed) ──────────────────────────────────────
  { id: 'bytedance-seed/seed-1.6',       name: 'Seed 1.6',       group: '豆包', badge: '推荐' },
  { id: 'bytedance-seed/seed-1.6-flash', name: 'Seed 1.6 Flash', group: '豆包' },

  // ── 智谱 GLM ──────────────────────────────────────────────────
  { id: 'z-ai/glm-4.5', name: 'GLM-4.5', group: '智谱', badge: '推荐' },
  { id: 'z-ai/glm-4.6', name: 'GLM-4.6', group: '智谱' },

  // ── OpenAI ────────────────────────────────────────────────────
  { id: 'openai/gpt-4.1',    name: 'GPT-4.1',    group: 'OpenAI', badge: '推荐' },
  { id: 'openai/gpt-4o',     name: 'GPT-4o',     group: 'OpenAI' },
  { id: 'openai/gpt-4o-mini',name: 'GPT-4o Mini',group: 'OpenAI' },

  // ── Claude ────────────────────────────────────────────────────
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', group: 'Claude', badge: '推荐' },
  { id: 'anthropic/claude-haiku-4.5',  name: 'Claude Haiku 4.5',  group: 'Claude' },
];

// ── Storage keys ──────────────────────────────────────────────────────

export const OR_KEY_STORAGE = 'openrouter_api_key';
export const ACTIVE_MODEL_KEY = 'or_active_model';
const DEFAULT_MODEL_ID = MODEL_LIST[0].id;

// ── Key management ────────────────────────────────────────────────────

export function getORKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(OR_KEY_STORAGE) || null;
}

export function setORKey(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(OR_KEY_STORAGE, key.trim());
}

export function clearORKey(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OR_KEY_STORAGE);
}

export function hasORKey(): boolean {
  return !!getORKey();
}

// ── Model management ──────────────────────────────────────────────────

export function getActiveModelId(): string {
  if (typeof window === 'undefined') return DEFAULT_MODEL_ID;
  return localStorage.getItem(ACTIVE_MODEL_KEY) || DEFAULT_MODEL_ID;
}

export function setActiveModelId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_MODEL_KEY, id);
}

export function getActiveModel(): ModelConfig {
  const id = getActiveModelId();
  return MODEL_LIST.find((m) => m.id === id) ?? MODEL_LIST[0];
}

// ── Chat message type ─────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ── Shared fetch helper ───────────────────────────────────────────────

async function streamFromAPI(
  systemPrompt: string,
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const apiKey = getORKey();
  if (!apiKey) throw new Error('请先在设置中填入 OpenRouter API Key');
  const modelId = getActiveModelId();

  let response: Response;
  try {
    response = await fetch('/api/ai', {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
        'X-Model-Id': modelId,
      },
      body: JSON.stringify({ system: systemPrompt, messages }),
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new Error('网络连接失败，请检查网络后重试');
  }

  if (!response.ok) {
    const status = response.status;
    if (status === 401) throw new Error('API Key 无效，请检查 OpenRouter Key 是否正确');
    if (status === 402) throw new Error('OpenRouter 余额不足，请充值后重试');
    if (status === 429) throw new Error('请求太频繁，请稍后重试');
    if (status === 502) throw new Error('无法连接到 AI 服务，请检查网络');
    throw new Error(`请求失败（${status}），请稍后再试`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (text) onChunk(text);
  }
}

// ── Stream call (via /api/ai proxy) ──────────────────────────────────

export async function streamAI(
  systemPrompt: string,
  userMessage: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<void> {
  return streamFromAPI(
    systemPrompt,
    [{ role: 'user', content: userMessage }],
    onChunk,
    signal
  );
}

// ── Multi-turn chat stream ─────────────────────────────────────────────

export async function streamAIChat(
  systemPrompt: string,
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<void> {
  return streamFromAPI(systemPrompt, messages, onChunk, signal);
}
