/** Vercel AI SDK + OpenRouter unified adapter */

// ── Model list ────────────────────────────────────────────────────────

export interface ModelConfig {
  id: string;       // OpenRouter model ID
  name: string;     // Display name
}

export const MODEL_LIST: ModelConfig[] = [
  { id: 'anthropic/claude-sonnet-4-5',                  name: 'Claude 3.5 Sonnet' },
  { id: 'openai/gpt-4o',                                name: 'GPT-4o' },
  { id: 'deepseek/deepseek-chat',                       name: 'DeepSeek V3' },
  { id: 'google/gemini-2.0-flash-001',                  name: 'Gemini 2.0 Flash' },
  { id: 'meta-llama/llama-3.3-70b-instruct',            name: 'Llama 3.3 70B' },
  { id: 'mistralai/mistral-small-3.1-24b-instruct',     name: 'Mistral Small' },
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

// ── Stream call (via /api/ai proxy) ──────────────────────────────────

export async function streamAI(
  systemPrompt: string,
  userMessage: string,
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
      body: JSON.stringify({ system: systemPrompt, userMessage }),
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

  // toTextStreamResponse() streams raw text — no framing, just decode and forward
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (text) onChunk(text);
  }
}
