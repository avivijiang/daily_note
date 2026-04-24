'use client';

import { useState } from 'react';
import { saveApiKey, clearApiKey, getApiKey } from '@/lib/claude';

interface ApiKeyModalProps {
  onSave: () => void;
  onCancel: () => void;
  mode?: 'setup' | 'settings';
}

export function ApiKeyModal({ onSave, onCancel, mode = 'setup' }: ApiKeyModalProps) {
  const [key, setKey] = useState(() =>
    mode === 'settings' ? (getApiKey() ?? '') : ''
  );
  const [error, setError] = useState('');
  const [cleared, setCleared] = useState(false);

  const handleSave = () => {
    const trimmed = key.trim();
    if (!trimmed) {
      setError('请输入 API Key');
      return;
    }
    if (!trimmed.startsWith('sk-ant-')) {
      setError('格式不正确，应以 sk-ant- 开头');
      return;
    }
    saveApiKey(trimmed);
    onSave();
  };

  const handleClear = () => {
    clearApiKey();
    setKey('');
    setCleared(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-base font-semibold text-gray-800 mb-1">
          {mode === 'settings' ? '管理 API Key' : '输入 Claude API Key'}
        </h2>
        <p className="text-xs text-gray-400 mb-4 leading-relaxed">
          Key 仅存储在浏览器本地（localStorage），不会上传至任何服务器。
        </p>

        <input
          type="password"
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setError('');
            setCleared(false);
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="sk-ant-api03-..."
          autoFocus
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20 font-mono bg-gray-50"
        />

        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        {cleared && <p className="text-xs text-green-600 mt-2">API Key 已清除</p>}

        <div className="flex items-center gap-2 mt-4">
          {mode === 'settings' && (
            <button
              onClick={handleClear}
              className="px-3 py-2 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              清除 Key
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-[#1A3A5C] text-white rounded-lg hover:bg-[#2a4a6c] transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
