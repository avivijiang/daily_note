'use client';

import { useRef, useState } from 'react';
import { CustomPersona } from '@/lib/types';
import {
  loadCustomPersonas,
  saveCustomPersonas,
  createCustomPersona,
  validatePersonaPrompt,
  PRESET_COLORS,
  PRESET_EMOJIS,
} from '@/lib/customPersonas';
import { getORKey, getActiveModelId } from '@/lib/ai';

interface PersonaCreatorModalProps {
  editPersona?: CustomPersona;
  onClose: () => void;
  onChange: () => void;
}

export function PersonaCreatorModal({ editPersona, onClose, onChange }: PersonaCreatorModalProps) {
  const [name, setName] = useState(editPersona?.name ?? '');
  const [description, setDescription] = useState(editPersona?.description ?? '');
  const [systemPrompt, setSystemPrompt] = useState(editPersona?.systemPrompt ?? '');
  const [accentColor, setAccentColor] = useState(editPersona?.accentColor ?? PRESET_COLORS[0]);
  const [emoji, setEmoji] = useState(editPersona?.emoji ?? PRESET_EMOJIS[0]);
  const [error, setError] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const validate = () => {
    if (!name.trim()) return '请输入名称';
    const check = validatePersonaPrompt(systemPrompt);
    if (!check.valid) return check.reason ?? '提示词无效';
    return null;
  };

  const handleSave = () => {
    const err = validate();
    if (err) { setError(err); return; }

    const personas = loadCustomPersonas();
    if (editPersona) {
      const updated = personas.map((p) =>
        p.id === editPersona.id
          ? { ...p, name: name.trim(), description: description.trim(), systemPrompt, accentColor, emoji }
          : p
      );
      saveCustomPersonas(updated);
    } else {
      saveCustomPersonas([...personas, createCustomPersona({
        name: name.trim(),
        description: description.trim(),
        systemPrompt,
        accentColor,
        emoji,
      })]);
    }
    onChange();
    onClose();
  };

  const handlePreview = async () => {
    const err = validate();
    if (err) { setError(err); return; }

    const apiKey = getORKey();
    if (!apiKey) { setError('请先填入 OpenRouter API Key'); return; }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setPreviewing(true);
    setPreviewText('');
    setError('');

    const sampleMsg = '今天 09:00-10:30 开了一个产品评审会，下午 14:00-17:00 写代码，晚上跑步 30 分钟。心情 4/5，感觉今天效率不错。';

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        signal: ac.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
          'X-Model-Id': getActiveModelId(),
        },
        body: JSON.stringify({
          system: systemPrompt,
          userMessage: `${sampleMsg}\n\n以上是这个人今天的记录，请用你的风格给出点评。`,
        }),
      });

      if (!res.ok) { setError('预览调用失败'); setPreviewing(false); return; }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setPreviewText(acc);
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError('预览失败，请重试');
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-800">
            ✨ {editPersona ? '编辑' : '创建'}自定义视角
          </h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. Sharp"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">简介</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="来自 miaomiaoguo 的毒舌导师"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20"
            />
          </div>

          {/* Emoji */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">头像</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className="w-9 h-9 text-lg rounded-xl flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: emoji === e ? accentColor + '22' : '#f5f5f5',
                    border: `2px solid ${emoji === e ? accentColor : 'transparent'}`,
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">配色</label>
            <div className="flex gap-2 py-1.5 px-0.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setAccentColor(c)}
                  className="w-7 h-7 rounded-full transition-all shrink-0"
                  style={{
                    backgroundColor: c,
                    transform: accentColor === c ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: accentColor === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              提示词 <span className="text-gray-300">（{systemPrompt.length}/3000）</span>
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={5}
              placeholder="你是一个极度理性、不讲情面的成长教练。你会直接指出用户行为中最大的问题，不给无效鼓励..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20 resize-none font-mono text-xs"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* Preview result */}
          {(previewText || previewing) && (
            <div
              className="rounded-xl p-3 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap border-l-4"
              style={{ backgroundColor: accentColor + '08', borderLeftColor: accentColor }}
            >
              <p className="text-xs font-medium mb-1.5" style={{ color: accentColor }}>
                {emoji} {name || '预览'} 点评：
              </p>
              {previewText}
              {previewing && <span className="animate-pulse">▌</span>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0 flex gap-2">
          <button
            onClick={handlePreview}
            disabled={previewing}
            className="flex-1 py-2.5 border border-[#1A3A5C] text-[#1A3A5C] text-sm font-medium rounded-xl hover:bg-[#F5F8FF] transition-colors disabled:opacity-50"
          >
            {previewing ? '生成中...' : '预览效果'}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-[#1A3A5C] text-white text-sm font-medium rounded-xl hover:bg-[#2a4a6c] transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
