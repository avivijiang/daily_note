'use client';

import { useState } from 'react';
import { Goal } from '@/lib/types';
import { loadGoals, saveGoals, createGoal } from '@/lib/goals';
import { generateId } from '@/lib/utils';

interface GoalPanelProps {
  onClose: () => void;
  onChange?: () => void;
}

interface GoalFormData {
  title: string;
  description: string;
  deadline: string;
}

const EMPTY_FORM: GoalFormData = { title: '', description: '', deadline: '' };

export function GoalPanel({ onClose, onChange }: GoalPanelProps) {
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<GoalFormData>(EMPTY_FORM);

  const persist = (next: Goal[]) => {
    setGoals(next);
    saveGoals(next);
    onChange?.();
  };

  const startAdd = () => {
    setForm(EMPTY_FORM);
    setAdding(true);
    setEditingId(null);
  };

  const startEdit = (g: Goal) => {
    setForm({ title: g.title, description: g.description, deadline: g.deadline ?? '' });
    setEditingId(g.id);
    setAdding(false);
  };

  const cancelForm = () => {
    setAdding(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const submitAdd = () => {
    if (!form.title.trim()) return;
    const newGoal = createGoal({
      title: form.title.trim(),
      description: form.description.trim(),
      deadline: form.deadline || undefined,
    });
    persist([...goals, newGoal]);
    cancelForm();
  };

  const submitEdit = () => {
    if (!form.title.trim() || !editingId) return;
    persist(goals.map((g) =>
      g.id === editingId
        ? { ...g, title: form.title.trim(), description: form.description.trim(), deadline: form.deadline || undefined }
        : g
    ));
    cancelForm();
  };

  const toggleActive = (id: string) => {
    persist(goals.map((g) => (g.id === id ? { ...g, isActive: !g.isActive } : g)));
  };

  const deleteGoal = (id: string) => {
    persist(goals.filter((g) => g.id !== id));
  };

  const isFormOpen = adding || editingId !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-800">🎯 我的目标</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Goal list */}
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-2">
          {goals.length === 0 && !isFormOpen && (
            <p className="text-xs text-gray-400 text-center py-6">还没有目标，点击下方添加</p>
          )}

          {goals.map((g) => (
            <div key={g.id}>
              {editingId === g.id ? (
                <GoalForm
                  form={form}
                  onChange={setForm}
                  onSubmit={submitEdit}
                  onCancel={cancelForm}
                  submitLabel="保存"
                />
              ) : (
                <div
                  className="rounded-xl p-3 border transition-colors"
                  style={{
                    borderColor: g.isActive ? '#1A3A5C33' : '#f0f0f0',
                    backgroundColor: g.isActive ? '#F5F8FF' : '#FAFAFA',
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <button
                        onClick={() => toggleActive(g.id)}
                        className="mt-0.5 shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors"
                        style={{
                          borderColor: g.isActive ? '#1A3A5C' : '#ccc',
                          backgroundColor: g.isActive ? '#1A3A5C' : 'transparent',
                        }}
                        title={g.isActive ? '点击停用' : '点击激活'}
                      >
                        {g.isActive && <span className="text-white text-[8px]">✓</span>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{g.title}</p>
                        {g.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{g.description}</p>
                        )}
                        {g.deadline && (
                          <p className="text-[10px] text-gray-400 mt-1">截止：{g.deadline}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(g)}
                        className="text-xs text-[#1A3A5C] hover:underline px-1"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteGoal(g.id)}
                        className="text-xs text-red-400 hover:underline px-1"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                  {g.isActive && (
                    <span className="inline-block mt-1.5 text-[10px] text-[#1A3A5C] bg-[#EEF4FF] px-1.5 py-0.5 rounded-full">
                      已激活
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}

          {adding && (
            <GoalForm
              form={form}
              onChange={setForm}
              onSubmit={submitAdd}
              onCancel={cancelForm}
              submitLabel="添加"
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0 space-y-2">
          {!isFormOpen && (
            <button
              onClick={startAdd}
              className="w-full py-2 border border-dashed border-[#1A3A5C]/30 text-[#1A3A5C] text-sm rounded-xl hover:bg-[#F5F8FF] transition-colors"
            >
              + 添加新目标
            </button>
          )}
          <p className="text-[11px] text-gray-400">
            ℹ️ AI 分析将结合以上激活目标给出建议
          </p>
        </div>
      </div>
    </div>
  );
}

function GoalForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  form: GoalFormData;
  onChange: (f: GoalFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="rounded-xl p-3 border border-[#1A3A5C]/20 bg-[#F5F8FF] space-y-2">
      <input
        autoFocus
        type="text"
        placeholder="目标标题（必填）"
        value={form.title}
        onChange={(e) => onChange({ ...form, title: e.target.value })}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20 bg-white"
      />
      <textarea
        placeholder="详细描述（可选）"
        value={form.description}
        onChange={(e) => onChange({ ...form, description: e.target.value })}
        rows={2}
        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20 bg-white resize-none"
      />
      <input
        type="date"
        value={form.deadline}
        onChange={(e) => onChange({ ...form, deadline: e.target.value })}
        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20 bg-white text-gray-600"
      />
      <div className="flex gap-2">
        <button
          onClick={onSubmit}
          disabled={!form.title.trim()}
          className="flex-1 py-1.5 bg-[#1A3A5C] text-white text-sm rounded-lg hover:bg-[#2a4a6c] transition-colors disabled:opacity-40"
        >
          {submitLabel}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  );
}
