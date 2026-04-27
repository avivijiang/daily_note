'use client';

import { useState, useRef } from 'react';
import {
  MODEL_LIST,
  ModelConfig,
  getORKey,
  setORKey,
  clearORKey,
  getActiveModelId,
  setActiveModelId,
} from '@/lib/ai';

interface ModelSettingsModalProps {
  onClose: () => void;
  onSaved?: () => void;
  hint?: string;
}

export function ModelSettingsModal({ onClose, onSaved, hint }: ModelSettingsModalProps) {
  const [activeId, setActiveId] = useState(() => getActiveModelId());
  const [key, setKey] = useState(() => getORKey() ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSetActive = (id: string) => {
    setActiveId(id);
    setActiveModelId(id);
    onSaved?.();
  };

  const startEdit = () => {
    setEditValue(key);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const confirmEdit = () => {
    const val = editValue.trim();
    if (!val) return;
    setKey(val);
    setORKey(val);
    setIsEditing(false);
    onSaved?.();
  };

  const handleClear = () => {
    setKey('');
    clearORKey();
    setIsEditing(false);
    onSaved?.();
  };

  const handleClose = () => {
    if (isEditing) confirmEdit();
    onClose();
  };

  const maskKey = (k: string) => {
    if (!k) return '';
    if (k.length <= 12) return k.slice(0, 4) + '••••••••';
    return k.slice(0, 8) + '••••••••' + k.slice(-4);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-800">🤖 AI 模型设置</h2>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Hint */}
        {hint && (
          <div className="mx-5 mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 shrink-0">
            {hint}
          </div>
        )}

        {/* OpenRouter API Key */}
        <div className="px-5 pt-4 pb-3 shrink-0">
          <p className="text-xs font-medium text-gray-500 mb-2">OpenRouter API Key</p>
          <div
            className="rounded-xl p-3 border transition-colors"
            style={{ borderColor: key ? '#1A3A5C33' : '#f0f0f0', backgroundColor: key ? '#F5F8FF' : '#FAFAFA' }}
          >
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmEdit();
                    if (e.key === 'Escape') setIsEditing(false);
                  }}
                  placeholder="sk-or-v1-..."
                  className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20 bg-white"
                />
                <button
                  onClick={confirmEdit}
                  className="text-xs bg-[#1A3A5C] text-white px-2.5 py-1.5 rounded-lg hover:bg-[#2a4a6c] transition-colors shrink-0"
                >
                  确认
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 px-1"
                >
                  取消
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-gray-400">
                  {key ? maskKey(key) : '未配置'}
                </span>
                <div className="flex gap-1">
                  {key ? (
                    <>
                      <button
                        onClick={startEdit}
                        className="text-xs text-[#1A3A5C] hover:underline px-1.5"
                      >
                        修改
                      </button>
                      <button
                        onClick={handleClear}
                        className="text-xs text-red-400 hover:underline px-1.5"
                      >
                        清除
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={startEdit}
                      className="text-xs text-[#1A3A5C] bg-[#EEF4FF] hover:bg-[#dde9ff] px-2.5 py-1 rounded-full transition-colors"
                    >
                      填入
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            在{' '}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1A3A5C] underline"
            >
              openrouter.ai/keys
            </a>{' '}
            免费注册获取
          </p>
        </div>

        {/* Model selector */}
        <div className="px-5 pb-3 overflow-y-auto">
          <p className="text-xs font-medium text-gray-500 mb-2">选择模型</p>
          <div className="space-y-3">
            {Object.entries(
              MODEL_LIST.reduce<Record<string, ModelConfig[]>>((acc, m) => {
                (acc[m.group] ??= []).push(m);
                return acc;
              }, {})
            ).map(([group, models]) => (
              <div key={group}>
                <p className="text-[10px] font-semibold text-gray-400 tracking-widest mb-1 px-1">{group}</p>
                <div className="space-y-1">
                  {models.map((m) => {
                    const isActive = activeId === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => handleSetActive(m.id)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all"
                        style={{
                          backgroundColor: isActive ? '#F5F8FF' : '#FAFAFA',
                          border: `1.5px solid ${isActive ? '#1A3A5C33' : '#f0f0f0'}`,
                          color: isActive ? '#1A3A5C' : '#555',
                        }}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="font-medium">{m.name}</span>
                          {m.badge && (
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{
                                backgroundColor: m.badge === '思维链' ? '#FFF4E5' : '#EEF4FF',
                                color: m.badge === '思维链' ? '#C07000' : '#1A3A5C',
                              }}
                            >
                              {m.badge}
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-300 font-mono hidden sm:inline">{m.id}</span>
                          {isActive && <span className="text-[10px] text-[#1A3A5C]">✓</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <p className="text-[11px] text-gray-400 mb-3">
            ℹ️ Key 仅存储在你的浏览器本地，不会上传至任何服务器
          </p>
          <button
            onClick={handleClose}
            className="w-full py-2.5 bg-[#1A3A5C] text-white text-sm font-medium rounded-xl hover:bg-[#2a4a6c] transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
