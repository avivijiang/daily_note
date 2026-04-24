'use client';

import { useEffect, useState } from 'react';
import { DiaryEvent } from '@/lib/types';
import {
  CATEGORY_LIST,
  getCategoryStyle,
  generateId,
  currentTimeStr,
  addMinutesToTime,
} from '@/lib/utils';

interface EventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: DiaryEvent) => void;
  onDelete?: (id: string) => void;
  event?: DiaryEvent;
  defaultStartTime?: string;
}

interface FormState {
  title: string;
  category: string;
  emoji: string;
  startTime: string;
  endTime: string;
  note: string;
}

function makeDefault(defaultStartTime?: string): FormState {
  const start = defaultStartTime || currentTimeStr();
  return {
    title: '',
    category: '其他',
    emoji: '📝',
    startTime: start,
    endTime: addMinutesToTime(start, 60),
    note: '',
  };
}

export function EventDialog({
  isOpen,
  onClose,
  onSave,
  onDelete,
  event,
  defaultStartTime,
}: EventDialogProps) {
  const [form, setForm] = useState<FormState>(makeDefault(defaultStartTime));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (event) {
      setForm({
        title: event.title,
        category: event.category,
        emoji: event.emoji,
        startTime: event.startTime,
        endTime: event.endTime,
        note: event.note,
      });
    } else {
      setForm(makeDefault(defaultStartTime));
    }
    setError('');
  }, [isOpen, event, defaultStartTime]);

  const handleCategoryChange = (category: string) => {
    const style = getCategoryStyle(category);
    setForm((f) => ({ ...f, category, emoji: style.emoji }));
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      setError('请输入事件标题');
      return;
    }
    if (!form.startTime || !form.endTime) {
      setError('请填写开始和结束时间');
      return;
    }
    if (form.startTime >= form.endTime) {
      setError('结束时间必须晚于开始时间');
      return;
    }
    onSave({
      id: event?.id ?? generateId(),
      title: form.title.trim(),
      category: form.category,
      emoji: form.emoji,
      startTime: form.startTime,
      endTime: form.endTime,
      note: form.note,
    });
    onClose();
  };

  const handleDelete = () => {
    if (event && onDelete) {
      onDelete(event.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-semibold text-gray-800 mb-5">
          {event ? '编辑事件' : '新增事件'}
        </h2>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              事件标题 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="做了什么..."
              autoFocus
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20 focus:border-[#1A3A5C]/40"
            />
          </div>

          {/* Times */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                开始时间 <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20 focus:border-[#1A3A5C]/40"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                结束时间 <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20 focus:border-[#1A3A5C]/40"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">类别</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORY_LIST.map((cat) => {
                const style = getCategoryStyle(cat);
                const isSelected = form.category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all"
                    style={{
                      backgroundColor: isSelected ? style.bg : '#f8f8f8',
                      borderWidth: '1.5px',
                      borderStyle: 'solid',
                      borderColor: isSelected ? style.solidBorder : '#e5e5e5',
                      color: isSelected ? '#333' : '#777',
                      fontWeight: isSelected ? '500' : '400',
                    }}
                  >
                    <span>{style.emoji}</span>
                    <span className="truncate">{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">备注（可选）</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="添加备注..."
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20 focus:border-[#1A3A5C]/40 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <div>
            {event && onDelete && (
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                删除
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-sm bg-[#1A3A5C] text-white rounded-lg hover:bg-[#2a4a6c] transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
