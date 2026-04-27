'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Analysis, AnalysisSummary, CustomPersona, DiaryData, Goal } from '@/lib/types';
import {
  buildAnalysisMessage,
  ANALYSIS_SYSTEM_PROMPT,
  parseStream,
} from '@/lib/claude';
import { streamAI, streamAIChat, getActiveModel, ChatMessage } from '@/lib/ai';
import { PERSONAS } from '@/lib/personas';
import { loadCustomPersonas } from '@/lib/customPersonas';
import { loadGoals } from '@/lib/goals';
import { PersonaCreatorModal } from '@/components/PersonaCreatorModal';

// ── Types ─────────────────────────────────────────────────────────────

interface AnyPersona {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  sealText: string;
  systemPrompt: string;
  isCustom?: boolean;
}

interface UIChatMessage {
  role: 'user' | 'ai';
  content: string;
  personaId: string;
  streaming?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────

function toAnyPersona(p: CustomPersona): AnyPersona {
  return {
    id: p.id,
    name: `${p.emoji} ${p.name}`,
    color: p.accentColor,
    bgColor: p.accentColor + '0d',
    sealText: p.emoji,
    systemPrompt: p.systemPrompt,
    isCustom: true,
  };
}

function buildChatSystem(persona: AnyPersona, diaryContext: string): string {
  return `${persona.systemPrompt}

---
以下是用户今天的日记内容和分析摘要，作为对话背景（已阅读，无需重复引用，直接进入对话）：

${diaryContext}

请保持你的角色风格，简洁回应，每次回复不超过 200 字。`;
}

// ── Score stars ───────────────────────────────────────────────────────

function ScoreStars({ score }: { score: number }) {
  return (
    <span>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className="text-xs" style={{ color: i < score ? '#F4C430' : '#e5e7eb' }}>★</span>
      ))}
    </span>
  );
}

// ── Persona tabs ──────────────────────────────────────────────────────

function PersonaTabs({
  personas, activeId, onSelect, onAdd, onEdit,
}: {
  personas: AnyPersona[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {personas.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap"
          style={{
            backgroundColor: activeId === p.id ? p.color : 'transparent',
            color: activeId === p.id ? '#fff' : p.color,
            border: `1.5px solid ${p.color}44`,
          }}
        >
          {p.sealText} {p.name.replace(/^[^\s]+\s/, '')}
          {p.isCustom && activeId === p.id && (
            <span
              onClick={(e) => { e.stopPropagation(); onEdit(p.id); }}
              className="ml-0.5 opacity-60 hover:opacity-100 text-[10px]"
            >✏</span>
          )}
        </button>
      ))}
      <button
        onClick={onAdd}
        className="px-3 py-1.5 rounded-full text-xs text-gray-400 border border-dashed border-gray-200 hover:border-gray-400 hover:text-gray-500 transition-colors whitespace-nowrap"
      >
        + 自定义
      </button>
    </div>
  );
}

// ── Chat message bubble ───────────────────────────────────────────────

function ChatBubble({ msg, persona }: { msg: UIChatMessage; persona?: AnyPersona }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end`}>
      {/* Avatar */}
      {!isUser && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mb-0.5"
          style={{
            background: persona
              ? `radial-gradient(circle at 40% 35%, ${persona.color}cc, ${persona.color})`
              : '#999',
          }}
        >
          {persona?.sealText ?? '?'}
        </div>
      )}

      <div
        className="max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
        style={
          isUser
            ? { backgroundColor: '#1A3A5C', color: '#fff', borderBottomRightRadius: 4 }
            : {
                backgroundColor: persona ? persona.bgColor : '#f5f5f5',
                color: '#374151',
                border: `1px solid ${persona ? persona.color + '22' : '#e5e7eb'}`,
                borderBottomLeftRadius: 4,
              }
        }
      >
        {msg.content}
        {msg.streaming && <span className="animate-pulse ml-0.5">▌</span>}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────

interface AnalysisViewProps {
  data: DiaryData;
  onBack: () => void;
  onAnalysisUpdate: (analysis: Analysis) => void;
}

export function AnalysisView({ data, onBack, onAnalysisUpdate }: AnalysisViewProps) {
  const cached = data.analysis;

  const [rawText, setRawText] = useState(
    cached
      ? `<diary>${cached.diary}</diary><summary>${JSON.stringify(cached.summary)}</summary><insight>${cached.insight}</insight>`
      : ''
  );
  const [phase, setPhase] = useState<'idle' | 'streaming' | 'complete' | 'error'>(
    cached ? 'complete' : 'idle'
  );
  const [errorMsg, setErrorMsg] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const [goals] = useState<Goal[]>(() => loadGoals());
  const [customPersonas, setCustomPersonas] = useState<CustomPersona[]>(() => loadCustomPersonas());
  const [showCreator, setShowCreator] = useState(false);
  const [editingPersona, setEditingPersona] = useState<CustomPersona | undefined>();

  const allPersonas: AnyPersona[] = [
    ...PERSONAS.map((p) => ({ ...p, isCustom: false as const })),
    ...customPersonas.map(toAnyPersona),
  ];

  const [activePersonaId, setActivePersonaId] = useState<string>(PERSONAS[0].id);
  const [personaCache, setPersonaCache] = useState<Record<string, string>>(cached?.personas ?? {});

  // Chat state
  const [chatMessages, setChatMessages] = useState<UIChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatStreaming, setChatStreaming] = useState(false);
  const chatAbortRef = useRef<AbortController | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const diaryMessage = useRef(buildAnalysisMessage(data, goals)).current;
  const parsed = parseStream(rawText);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Start initial analysis
  const startAnalysis = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setRawText('');
    setPhase('streaming');
    setErrorMsg('');
    setChatMessages([]);

    let accumulated = '';
    try {
      await streamAI(
        ANALYSIS_SYSTEM_PROMPT,
        diaryMessage,
        (chunk: string) => {
          accumulated += chunk;
          setRawText(accumulated);
        },
        ac.signal
      );

      setPhase('complete');
      const fp = parseStream(accumulated);
      const analysis: Analysis = {
        generatedAt: new Date().toISOString(),
        diary: fp.diary,
        summary: fp.summary,
        insight: fp.insight,
        personas: personaCache,
      };
      onAnalysisUpdate(analysis);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setPhase(rawText.length > 0 ? 'complete' : 'idle');
        return;
      }
      setPhase('error');
      setErrorMsg(err instanceof Error ? err.message : '未知错误');
    }
  }, [diaryMessage, personaCache, onAnalysisUpdate]);

  useEffect(() => {
    if (!cached) startAnalysis();
    return () => abortRef.current?.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persona card stream
  const handlePersonaCache = useCallback(
    (id: string, text: string) => {
      setPersonaCache((prev) => {
        const next = { ...prev, [id]: text };
        if (data.analysis) onAnalysisUpdate({ ...data.analysis, personas: next });
        return next;
      });
    },
    [data.analysis, onAnalysisUpdate]
  );

  // Delete custom persona
  const handleDeleteCustomPersona = (id: string) => {
    const updated = customPersonas.filter((p) => p.id !== id);
    setCustomPersonas(updated);
    const { saveCustomPersonas } = require('@/lib/customPersonas');
    saveCustomPersonas(updated);
    if (activePersonaId === id) setActivePersonaId(PERSONAS[0].id);
  };

  // Send chat message
  const sendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatStreaming) return;
    setChatInput('');

    const activePersona = allPersonas.find((p) => p.id === activePersonaId) ?? allPersonas[0];

    // Build history for API
    const history: ChatMessage[] = chatMessages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));
    history.push({ role: 'user', content: text });

    const newUI: UIChatMessage[] = [
      ...chatMessages,
      { role: 'user', content: text, personaId: activePersonaId },
      { role: 'ai', content: '', personaId: activePersonaId, streaming: true },
    ];
    setChatMessages(newUI);
    setChatStreaming(true);

    chatAbortRef.current?.abort();
    const ac = new AbortController();
    chatAbortRef.current = ac;

    // Context: diary summary + insight
    const diaryCtx = [
      parsed.diary ? `日记全文：\n${parsed.diary}` : '',
      parsed.insight ? `今日洞察：${parsed.insight}` : '',
    ].filter(Boolean).join('\n\n');

    let acc = '';
    try {
      await streamAIChat(
        buildChatSystem(activePersona, diaryCtx),
        history,
        (chunk) => {
          acc += chunk;
          setChatMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { ...copy[copy.length - 1], content: acc };
            return copy;
          });
        },
        ac.signal
      );
      // Mark done
      setChatMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { ...copy[copy.length - 1], streaming: false };
        return copy;
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Stop button clicked — keep whatever text was streamed, clear streaming flag
        setChatMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], streaming: false };
          return copy;
        });
        return;
      }
      setChatMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          ...copy[copy.length - 1],
          content: `（出错了：${err instanceof Error ? err.message : '请重试'}）`,
          streaming: false,
        };
        return copy;
      });
    } finally {
      setChatStreaming(false);
    }
  }, [chatInput, chatStreaming, chatMessages, activePersonaId, allPersonas, parsed]);

  // Export diary
  const diaryCardRef = useRef<HTMLDivElement>(null);
  const handleExport = async () => {
    if (!diaryCardRef.current) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(diaryCardRef.current, { scale: 2 });
      const link = document.createElement('a');
      link.download = `日记_${data.date}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      alert('导出失败，请重试');
    }
  };

  const isStreaming = phase === 'streaming';
  const activePersona = allPersonas.find((p) => p.id === activePersonaId) ?? allPersonas[0];
  const showChat = phase === 'complete';

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#FAF8F3]">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8E4DA] shrink-0 bg-[#FAF8F3]">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-[#1A3A5C]/70 hover:text-[#1A3A5C] transition-colors"
        >
          ← 返回
        </button>
        <div className="flex items-center gap-3">
          {phase === 'streaming' && (
            <button
              onClick={() => abortRef.current?.abort()}
              className="text-xs text-red-500 font-medium px-3 py-1 rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
              style={{ backgroundColor: '#FAF8F3' }}
            >
              停止
            </button>
          )}
          {phase === 'complete' && (
            <button
              onClick={startAnalysis}
              className="text-xs text-[#1A3A5C] font-medium px-3 py-1 rounded-lg border border-[#1A3A5C]/25 transition-colors hover:bg-[#1A3A5C]/5"
              style={{ backgroundColor: '#FAF8F3' }}
            >
              重新分析
            </button>
          )}
          <span className="text-xs text-gray-300">{getActiveModel().name}</span>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">

        {/* Error */}
        {phase === 'error' && (
          <div className="mx-5 mt-5 bg-red-50 border border-red-200 rounded-2xl p-5">
            <p className="text-sm font-medium text-red-600 mb-1">分析失败</p>
            <p className="text-xs text-red-500 mb-3">{errorMsg}</p>
            <button
              onClick={startAnalysis}
              className="px-4 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {isStreaming && !parsed.diary && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <div className="w-6 h-6 border-2 border-[#1A3A5C]/30 border-t-[#1A3A5C] rounded-full animate-spin" />
            <span className="text-sm">正在整理今天的记录...</span>
          </div>
        )}

        {/* ── Diary card ── */}
        {(parsed.diary || isStreaming) && (
          <div ref={diaryCardRef} className="mx-5 mt-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-400 tracking-widest uppercase">Today</span>
              {parsed.diaryDone && (
                <button
                  onClick={handleExport}
                  className="text-xs text-[#1A3A5C]/50 hover:text-[#1A3A5C] transition-colors"
                >
                  导出图片
                </button>
              )}
            </div>
            <div
              className="text-[15px] leading-[2] text-gray-800 whitespace-pre-wrap"
              style={{ fontFamily: 'Georgia, "Times New Roman", "Noto Serif SC", serif' }}
            >
              {parsed.diary}
              {isStreaming && !parsed.diaryDone && <span className="animate-pulse text-[#1A3A5C]">▌</span>}
            </div>
          </div>
        )}

        {/* ── Summary card ── */}
        {parsed.summary && (
          <div className="mx-5 mt-6">
            <div className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-3">Overview</div>
            <SummaryCard summary={parsed.summary} hasGoals={goals.some((g) => g.isActive)} />
          </div>
        )}

        {/* ── Insight card ── */}
        {(parsed.insight || (isStreaming && parsed.diaryDone && parsed.summaryDone)) && (
          <div
            className="mx-5 mt-5 px-5 py-4 rounded-2xl border-l-4"
            style={{ backgroundColor: '#F0F5FC', borderLeftColor: '#1A3A5C' }}
          >
            <div className="text-xs font-semibold text-[#1A3A5C]/50 tracking-widest uppercase mb-2">Insight</div>
            <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
              {parsed.insight}
              {isStreaming && !parsed.insightDone && <span className="animate-pulse text-[#1A3A5C]">▌</span>}
            </p>
          </div>
        )}

        {/* ── Persona section ── */}
        {phase === 'complete' && parsed.insightDone && (
          <div className="mx-5 mt-6 mb-2">
            <div className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-3">Perspectives</div>

            <PersonaTabs
              personas={allPersonas}
              activeId={activePersonaId}
              onSelect={setActivePersonaId}
              onAdd={() => { setEditingPersona(undefined); setShowCreator(true); }}
              onEdit={(id) => {
                const cp = customPersonas.find((c) => c.id === id);
                setEditingPersona(cp);
                setShowCreator(true);
              }}
            />

            <div className="mt-3">
              <PersonaCard
                key={activePersonaId}
                persona={activePersona}
                diaryMessage={diaryMessage}
                cached={personaCache[activePersonaId]}
                onCache={handlePersonaCache}
              />
            </div>

            {activePersona?.isCustom && (
              <button
                onClick={() => handleDeleteCustomPersona(activePersonaId)}
                className="mt-2 text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                删除此视角
              </button>
            )}
          </div>
        )}

        {/* ── Chat history ── */}
        {showChat && (
          <div className="mx-5 mt-6 mb-2">
            {chatMessages.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 h-px bg-[#E8E4DA]" />
                  <span className="text-xs text-gray-300">对话</span>
                  <div className="flex-1 h-px bg-[#E8E4DA]" />
                </div>
                <div className="space-y-3">
                  {chatMessages.map((msg, i) => (
                    <ChatBubble
                      key={i}
                      msg={msg}
                      persona={allPersonas.find((p) => p.id === msg.personaId)}
                    />
                  ))}
                </div>
              </>
            )}
            <div ref={chatBottomRef} className="h-4" />
          </div>
        )}
      </div>

      {/* ── Chat input bar ── */}
      {showChat && (
        <div className="shrink-0 border-t border-[#E8E4DA] bg-[#FAF8F3] px-4 py-3">
          {/* Persona label */}
          <div className="flex items-center gap-1.5 mb-2">
            <div
              className="w-4 h-4 rounded-full text-white flex items-center justify-center text-[8px] font-bold"
              style={{ backgroundColor: activePersona.color }}
            >
              {activePersona.sealText}
            </div>
            <span className="text-xs text-gray-400">与 {activePersona.name} 对话</span>
            {chatStreaming && (
              <span className="text-xs text-gray-300 ml-auto">正在回复...</span>
            )}
          </div>

          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={chatInput}
              onChange={(e) => {
                setChatInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendChat();
                }
              }}
              placeholder="继续聊聊… (Enter 发送，Shift+Enter 换行)"
              rows={1}
              disabled={chatStreaming}
              className="flex-1 resize-none rounded-xl border border-[#E8E4DA] bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20 focus:border-[#1A3A5C]/30 transition-all disabled:opacity-50"
              style={{ minHeight: 40, maxHeight: 100, lineHeight: '1.5' }}
            />
            <button
              onClick={chatStreaming ? () => chatAbortRef.current?.abort() : sendChat}
              disabled={!chatStreaming && !chatInput.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-30 shrink-0"
              style={{ backgroundColor: chatStreaming ? '#ef4444' : '#1A3A5C' }}
            >
              {chatStreaming ? '■' : '↑'}
            </button>
          </div>
        </div>
      )}

      {/* Persona creator modal */}
      {showCreator && (
        <PersonaCreatorModal
          editPersona={editingPersona}
          onClose={() => { setShowCreator(false); setEditingPersona(undefined); }}
          onChange={() => setCustomPersonas(loadCustomPersonas())}
        />
      )}
    </div>
  );
}

// ── Persona card (single view) ────────────────────────────────────────

function PersonaCard({
  persona, diaryMessage, cached, onCache,
}: {
  persona: AnyPersona;
  diaryMessage: string;
  cached?: string;
  onCache: (id: string, text: string) => void;
}) {
  const [text, setText] = useState(cached ?? '');
  const [loading, setLoading] = useState(!cached);
  const [streaming, setStreaming] = useState(!cached);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (cached) { setText(cached); setLoading(false); setStreaming(false); return; }

    const ac = new AbortController();
    abortRef.current = ac;
    let acc = '';

    streamAI(
      persona.systemPrompt,
      `${diaryMessage}\n\n以上是这个人今天的记录，请用你的风格给出点评。`,
      (chunk) => { acc += chunk; setText(acc); },
      ac.signal
    )
      .then(() => { onCache(persona.id, acc); setLoading(false); setStreaming(false); })
      .catch((err: unknown) => {
        const e = err as Error;
        if (e.name !== 'AbortError') { setError(e.message ?? '调用失败'); setLoading(false); }
      });

    return () => ac.abort();
  }, [persona.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        backgroundColor: persona.bgColor || '#f9f9f9',
        borderLeft: `3px solid ${persona.color}`,
      }}
    >
      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : loading && !text ? (
        <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
          <span className="animate-spin">⟳</span>
          召唤{persona.name}中...
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
          {text}
          {streaming && <span className="animate-pulse">▌</span>}
        </p>
      )}
    </div>
  );
}

// ── Summary card ──────────────────────────────────────────────────────

function SummaryCard({ summary, hasGoals }: { summary: AnalysisSummary; hasGoals: boolean }) {
  return (
    <div className="space-y-3">
      {/* Top row: mood + score */}
      <div className="flex gap-3">
        <div className="flex-1 bg-white rounded-2xl px-4 py-3 border border-gray-100">
          <div className="text-xs text-gray-400 mb-1">心情</div>
          <div className="text-sm font-medium text-gray-700">{summary.mood}</div>
        </div>
        <div className="flex-1 bg-white rounded-2xl px-4 py-3 border border-gray-100">
          <div className="text-xs text-gray-400 mb-1">评分</div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-700">{summary.score}</span>
            <span className="text-xs text-gray-300">/10</span>
            <ScoreStars score={summary.score} />
          </div>
        </div>
      </div>

      {/* Goal alignment */}
      {hasGoals && summary.goalAlignment != null && (
        <div className="bg-white rounded-2xl px-4 py-3 border border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-400">目标对齐度</span>
            <span className="text-xs font-medium text-gray-600">{summary.goalAlignment}/10</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(summary.goalAlignment / 10) * 100}%`,
                backgroundColor: summary.goalAlignment >= 7 ? '#22c55e' : summary.goalAlignment >= 4 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>
        </div>
      )}

      {/* Insights + gratitude + todos */}
      {summary.insights.length > 0 && (
        <div className="bg-white rounded-2xl px-4 py-3 border border-gray-100">
          <div className="text-xs text-gray-400 mb-2">灵感闪现</div>
          <div className="flex flex-wrap gap-1.5">
            {summary.insights.map((ins, i) => (
              <span key={i} className="bg-amber-50 border border-amber-100 text-amber-700 text-xs px-2.5 py-0.5 rounded-full">
                {ins}
              </span>
            ))}
          </div>
        </div>
      )}

      {(summary.gratitude.length > 0 || summary.todos.length > 0) && (
        <div className="flex gap-3">
          {summary.gratitude.length > 0 && (
            <div className="flex-1 bg-white rounded-2xl px-4 py-3 border border-gray-100">
              <div className="text-xs text-gray-400 mb-2">感谢</div>
              {summary.gratitude.map((g, i) => (
                <div key={i} className="text-xs text-gray-600 leading-relaxed">· {g}</div>
              ))}
            </div>
          )}
          {summary.todos.length > 0 && (
            <div className="flex-1 bg-white rounded-2xl px-4 py-3 border border-gray-100">
              <div className="text-xs text-gray-400 mb-2">待办</div>
              {summary.todos.map((t, i) => (
                <div key={i} className="text-xs text-gray-600 leading-relaxed">· {t}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
