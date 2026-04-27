/**
 * src/lib/sync.ts
 * Local-first sync engine: localStorage is always the source of truth for the UI.
 * Supabase is synced asynchronously in the background.
 */

import { DiaryData } from './types';
import { Goal } from './types';
import { CustomPersona } from './types';
import { isSupabaseConfigured, createClient } from './supabase/client';

// ── Sync queue (persisted in localStorage) ───────────────────────────────

const QUEUE_KEY = 'sync_queue';

export interface SyncQueueItem {
  id: string;
  type: 'diary' | 'goal' | 'persona';
  operation: 'upsert' | 'delete';
  data: unknown;
  createdAt: string;
  retryCount: number;
}

function loadQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveQueue(q: SyncQueueItem[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

function enqueue(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retryCount'>) {
  const q = loadQueue();
  // Replace existing item of same type+id to avoid duplicates
  const filtered = q.filter(
    (i) => !(i.type === item.type && (i.data as { id?: string })?.id === (item.data as { id?: string })?.id)
  );
  filtered.push({ ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString(), retryCount: 0 });
  saveQueue(filtered);
}

// ── Guard ────────────────────────────────────────────────────────────────

async function getSession() {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data } = await createClient().auth.getSession();
    return data.session;
  } catch (e) {
    // Web Locks race condition: another request stole the lock, treat as no session
    if (e instanceof Error && (e.name === 'AbortError' || e.message.includes('steal'))) {
      return null;
    }
    throw e;
  }
}

// ── Diary sync ───────────────────────────────────────────────────────────

export async function syncDiary(data: DiaryData): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const supabase = createClient();
  const { error } = await supabase.from('diaries').upsert(
    { user_id: session.user.id, date: data.date, data },
    { onConflict: 'user_id,date' }
  );

  if (error) {
    enqueue({ type: 'diary', operation: 'upsert', data });
    console.warn('[sync] diary queued:', error.message);
  }
}

// ── Goals sync ───────────────────────────────────────────────────────────

export async function syncGoals(goals: Goal[]): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const supabase = createClient();
  // Upsert all active goals, delete removed ones via replace strategy:
  // First delete all user's goals, then re-insert. Simple but correct for small datasets.
  await supabase.from('goals').delete().eq('user_id', session.user.id);
  if (goals.length > 0) {
    const { error } = await supabase.from('goals').insert(
      goals.map((g) => ({ id: g.id, user_id: session.user.id, data: g }))
    );
    if (error) {
      enqueue({ type: 'goal', operation: 'upsert', data: goals });
      console.warn('[sync] goals queued:', error.message);
    }
  }
}

// ── Personas sync ────────────────────────────────────────────────────────

export async function syncPersonas(personas: CustomPersona[]): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const supabase = createClient();
  await supabase.from('custom_personas').delete().eq('user_id', session.user.id);
  if (personas.length > 0) {
    const { error } = await supabase.from('custom_personas').insert(
      personas.map((p) => ({ id: p.id, user_id: session.user.id, data: p }))
    );
    if (error) {
      enqueue({ type: 'persona', operation: 'upsert', data: personas });
      console.warn('[sync] personas queued:', error.message);
    }
  }
}

// ── Load from cloud (on login / new device) ──────────────────────────────

export async function loadFromCloud(): Promise<{
  diaries: DiaryData[];
  goals: Goal[];
  personas: CustomPersona[];
}> {
  const session = await getSession();
  if (!session) return { diaries: [], goals: [], personas: [] };

  const supabase = createClient();
  const userId = session.user.id;

  const [{ data: diaryRows }, { data: goalRows }, { data: personaRows }] = await Promise.all([
    supabase.from('diaries').select('data, updated_at').eq('user_id', userId),
    supabase.from('goals').select('data').eq('user_id', userId),
    supabase.from('custom_personas').select('data').eq('user_id', userId),
  ]);

  return {
    diaries: (diaryRows ?? []).map((r) => r.data as DiaryData),
    goals: (goalRows ?? []).map((r) => r.data as Goal),
    personas: (personaRows ?? []).map((r) => r.data as CustomPersona),
  };
}

// ── Merge cloud data into localStorage ───────────────────────────────────
// Strategy: last-write-wins by updated_at / _syncedAt

export async function mergeCloudIntoLocal(): Promise<void> {
  const { diaries, goals, personas } = await loadFromCloud();

  // Merge diaries
  for (const remote of diaries) {
    const localRaw = localStorage.getItem(`diary_${remote.date}`);
    if (!localRaw) {
      localStorage.setItem(`diary_${remote.date}`, JSON.stringify(remote));
    } else {
      const local = JSON.parse(localRaw) as DiaryData & { _syncedAt?: string };
      const localTime = new Date(local._syncedAt ?? 0).getTime();
      // If remote is newer, overwrite local
      const remoteAny = remote as DiaryData & { _syncedAt?: string; _remoteUpdatedAt?: string };
      const remoteTime = new Date(remoteAny._remoteUpdatedAt ?? remoteAny._syncedAt ?? 0).getTime();
      if (remoteTime > localTime) {
        localStorage.setItem(`diary_${remote.date}`, JSON.stringify(remote));
      }
    }
  }

  // Merge goals (cloud wins if cloud has data and local has none)
  if (goals.length > 0) {
    const localGoalsRaw = localStorage.getItem('goals');
    const localGoals: Goal[] = localGoalsRaw ? JSON.parse(localGoalsRaw) : [];
    if (localGoals.length === 0) {
      localStorage.setItem('goals', JSON.stringify(goals));
    }
  }

  // Merge personas
  if (personas.length > 0) {
    const localRaw = localStorage.getItem('custom_personas');
    const localPersonas: CustomPersona[] = localRaw ? JSON.parse(localRaw) : [];
    if (localPersonas.length === 0) {
      localStorage.setItem('custom_personas', JSON.stringify(personas));
    }
  }
}

// ── First-time migration ─────────────────────────────────────────────────

let _migrating = false;

export async function migrateLocalDataToCloud(
  onProgress?: (done: number, total: number, label: string) => void
): Promise<void> {
  if (_migrating) return; // prevent concurrent calls
  _migrating = true;
  try {
    await _doMigrate(onProgress);
  } finally {
    _migrating = false;
  }
}

async function _doMigrate(
  onProgress?: (done: number, total: number, label: string) => void
): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const supabase = createClient();
  const userId = session.user.id;

  // Collect all diary keys
  const diaryKeys = Object.keys(localStorage).filter((k) => k.startsWith('diary_'));
  const goals: Goal[] = (() => {
    try { return JSON.parse(localStorage.getItem('goals') ?? '[]'); } catch { return []; }
  })();
  const personas: CustomPersona[] = (() => {
    try { return JSON.parse(localStorage.getItem('custom_personas') ?? '[]'); } catch { return []; }
  })();

  const total = diaryKeys.length + (goals.length > 0 ? 1 : 0) + (personas.length > 0 ? 1 : 0);
  let done = 0;

  // Upload diaries
  for (const key of diaryKeys) {
    const diary: DiaryData = JSON.parse(localStorage.getItem(key)!);
    await supabase.from('diaries').upsert(
      { user_id: userId, date: diary.date, data: diary },
      { onConflict: 'user_id,date' }
    );
    done++;
    onProgress?.(done, total, `上传 ${diary.date}`);
  }

  // Upload goals
  if (goals.length > 0) {
    await supabase.from('goals').delete().eq('user_id', userId);
    await supabase.from('goals').insert(
      goals.map((g) => ({ id: g.id, user_id: userId, data: g }))
    );
    done++;
    onProgress?.(done, total, '上传目标');
  }

  // Upload personas
  if (personas.length > 0) {
    await supabase.from('custom_personas').delete().eq('user_id', userId);
    await supabase.from('custom_personas').insert(
      personas.map((p) => ({ id: p.id, user_id: userId, data: p }))
    );
    done++;
    onProgress?.(done, total, '上传自定义视角');
  }
}

// ── Flush retry queue ────────────────────────────────────────────────────

export async function flushSyncQueue(): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const q = loadQueue();
  if (q.length === 0) return;

  const remaining: SyncQueueItem[] = [];
  for (const item of q) {
    try {
      if (item.type === 'diary') {
        const d = item.data as DiaryData;
        await syncDiary(d);
      } else if (item.type === 'goal') {
        await syncGoals(item.data as Goal[]);
      } else if (item.type === 'persona') {
        await syncPersonas(item.data as CustomPersona[]);
      }
    } catch {
      if (item.retryCount < 5) {
        remaining.push({ ...item, retryCount: item.retryCount + 1 });
      }
    }
  }
  saveQueue(remaining);
}

// ── Sync status helpers ──────────────────────────────────────────────────

export async function getSyncStatus(): Promise<'online' | 'offline' | 'not_configured' | 'not_logged_in'> {
  if (!isSupabaseConfigured()) return 'not_configured';
  const session = await getSession();
  if (!session) return 'not_logged_in';
  try {
    const { error } = await createClient().from('diaries').select('id').limit(1);
    return error ? 'offline' : 'online';
  } catch {
    return 'offline';
  }
}
