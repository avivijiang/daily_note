'use client';

import { DiaryData, Todo } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { useRef } from 'react';

interface NotesPanelProps {
  data: DiaryData;
  onChange: (data: DiaryData) => void;
  onEndRecord: () => void;
  hasAnalysis: boolean;
}

const MOOD_OPTIONS = [
  { score: 5, emoji: '😄', label: '很好' },
  { score: 4, emoji: '😊', label: '不错' },
  { score: 3, emoji: '😐', label: '一般' },
  { score: 2, emoji: '😔', label: '有点低' },
  { score: 1, emoji: '😞', label: '很差' },
];

export function NotesPanel({ data, onChange, onEndRecord, hasAnalysis }: NotesPanelProps) {
  const todoInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const update = (partial: Partial<DiaryData>) => {
    onChange({ ...data, ...partial });
  };

  // ── Mood ──
  const handleMoodSelect = (score: number) => {
    if (data.mood?.score === score) {
      update({ mood: null });
    } else {
      update({ mood: { score, note: data.mood?.note ?? '' } });
    }
  };

  // ── Gratitude ──
  const handleGratitude = (index: number, value: string) => {
    const g = [...data.gratitude] as [string, string, string];
    g[index] = value;
    update({ gratitude: g });
  };

  // ── Todos ──
  const addTodo = () => {
    const newTodo: Todo = { id: generateId(), text: '', done: false };
    update({ todos: [...data.todos, newTodo] });
    setTimeout(() => todoInputRefs.current.get(newTodo.id)?.focus(), 50);
  };

  const updateTodo = (id: string, partial: Partial<Todo>) => {
    update({ todos: data.todos.map((t) => (t.id === id ? { ...t, ...partial } : t)) });
  };

  const removeTodo = (id: string) => {
    update({ todos: data.todos.filter((t) => t.id !== id) });
  };

  const CARD = 'bg-white rounded-xl p-4 shadow-sm border border-gray-100';
  const SECTION_TITLE = 'text-sm font-semibold text-gray-700 mb-3';
  const INPUT_CLS =
    'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/15 focus:border-[#1A3A5C]/30 bg-[#FAFAF8] placeholder:text-gray-300';

  return (
    <div className="h-full overflow-y-auto px-4 py-4 space-y-3">
      {/* ─── Mood ─── */}
      <div className={CARD}>
        <p className={SECTION_TITLE}>今天的心情</p>
        <div className="flex gap-1 mb-3">
          {MOOD_OPTIONS.map((opt) => {
            const selected = data.mood?.score === opt.score;
            return (
              <button
                key={opt.score}
                onClick={() => handleMoodSelect(opt.score)}
                className="flex flex-col items-center flex-1 py-2 rounded-xl transition-all"
                style={{
                  backgroundColor: selected ? '#EEF4FF' : 'transparent',
                  outline: selected ? '2px solid #1A3A5C' : '2px solid transparent',
                  outlineOffset: '-2px',
                }}
              >
                <span className="text-xl leading-none">{opt.emoji}</span>
                <span className="text-[10px] text-gray-500 mt-1 leading-none">{opt.label}</span>
              </button>
            );
          })}
        </div>
        {data.mood && (
          <input
            type="text"
            value={data.mood.note}
            onChange={(e) =>
              update({ mood: { score: data.mood!.score, note: e.target.value } })
            }
            placeholder="今天感觉如何？"
            className={INPUT_CLS}
          />
        )}
      </div>

      {/* ─── Inspiration ─── */}
      <div className={CARD}>
        <p className={SECTION_TITLE}>灵感与想法</p>
        <textarea
          value={data.inspiration}
          onChange={(e) => update({ inspiration: e.target.value })}
          placeholder="随手记录今天的灵感、想法、金句..."
          rows={4}
          className={`${INPUT_CLS} resize-none leading-relaxed`}
        />
      </div>

      {/* ─── Gratitude ─── */}
      <div className={CARD}>
        <p className={SECTION_TITLE}>今天感谢的三件事</p>
        <div className="space-y-2">
          {(['第一件...', '第二件...', '第三件...'] as const).map((ph, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-medium text-white shrink-0"
                style={{ backgroundColor: ['#7CB9E8', '#90D090', '#FFB07A'][i] }}
              >
                {i + 1}
              </span>
              <input
                type="text"
                value={data.gratitude[i]}
                onChange={(e) => handleGratitude(i, e.target.value)}
                placeholder={ph}
                className={`${INPUT_CLS} flex-1`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ─── Todos ─── */}
      <div className={CARD}>
        <p className={SECTION_TITLE}>未完成的事</p>
        <div className="space-y-1.5">
          {data.todos.map((todo) => (
            <div key={todo.id} className="flex items-center gap-2 group">
              <input
                type="checkbox"
                checked={todo.done}
                onChange={(e) => updateTodo(todo.id, { done: e.target.checked })}
                className="w-4 h-4 rounded accent-[#1A3A5C] shrink-0 cursor-pointer"
              />
              <input
                ref={(el) => {
                  if (el) todoInputRefs.current.set(todo.id, el);
                  else todoInputRefs.current.delete(todo.id);
                }}
                type="text"
                value={todo.text}
                onChange={(e) => updateTodo(todo.id, { text: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addTodo();
                  if (e.key === 'Backspace' && !todo.text) removeTodo(todo.id);
                }}
                placeholder="待办内容..."
                className="flex-1 text-sm focus:outline-none bg-transparent placeholder:text-gray-300"
                style={{
                  textDecoration: todo.done ? 'line-through' : 'none',
                  color: todo.done ? '#bbb' : '#333',
                }}
              />
              {/* Carried-from label */}
              {todo.carriedFrom && (
                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                  ↩ 昨日
                </span>
              )}
              <button
                onClick={() => removeTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-xs w-4 h-4 flex items-center justify-center shrink-0"
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={addTodo}
            className="flex items-center gap-1 text-xs text-[#1A3A5C]/60 hover:text-[#1A3A5C] mt-1 transition-colors"
          >
            <span className="text-base leading-none">+</span>
            <span>添加一项</span>
          </button>
        </div>
      </div>

      {/* ─── End Record Button ─── */}
      <div className="pb-2">
        <button
          onClick={onEndRecord}
          className="w-full py-3.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
          style={{
            backgroundColor: hasAnalysis ? '#9ca3af' : '#1A3A5C',
            color: '#fff',
            borderRadius: 12,
          }}
        >
          {hasAnalysis ? '重新分析' : '结束记录，探讨一下 →'}
        </button>
      </div>
    </div>
  );
}
