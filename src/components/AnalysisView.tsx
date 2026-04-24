'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Analysis, AnalysisSummary, CustomPersona, DiaryData, Goal } from '@/lib/types';
import {
  buildAnalysisMessage,
  ANALYSIS_SYSTEM_PROMPT,
  parseStream,
} from '@/lib/claude';
import { streamAI, getActiveModel } from '@/lib/ai';
import { PERSONAS } from '@/lib/personas';
import { loadCustomPersonas } from '@/lib/customPersonas';
import { loadGoals } from '@/lib/goals';
import { PersonaCreatorModal } from '@/components/PersonaCreatorModal';

// ── Unified persona shape for rendering ──────────────────────────────
interface AnyPersona {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  sealText: string;
  systemPrompt: string;
  isCustom?: boolean;
}

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

// ─── Typewriter hook ──────────────────────────────────────────────────
function useTypewriter(text: string, active = true) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    if (!active) { setDisplayed(text); return; }
    if (text.length > displayed.length) setDisplayed(text);
  }, [text, displayed.length, active]);

  return displayed;
}

// ─── Score stars ──────────────────────────────────────────────────────
function ScoreStars({ score }: { score: number }) {
  return (
    <span className="text-sm">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} style={{ color: i < score ? '#F4C430' : '#ddd' }}>★</span>
      ))}
    </span>
  );
}

// ─── Persona card ─────────────────────────────────────────────────────
function PersonaCard({
  persona,
  diaryMessage,
  cached,
  onCache,
}: {
  persona: AnyPersona;
  diaryMessage: string;
  cached?: string;
  onCache: (id: string, text: string) => void;
}) {
  const [text, setText] = useState(cached ?? '');
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState('');
  const [streaming, setStreaming] = useState(!cached);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (cached) {
      setText(cached); setLoading(false); setStreaming(false);
      return;
    }

    const ac = new AbortController();
    abortRef.current = ac;
    let accumulated = '';

    const userMsg = `${diaryMessage}\n\n以上是这个人今天的记录，请用你的风格给出点评。`;

    streamAI(persona.systemPrompt, userMsg, (chunk: string) => {
      accumulated += chunk;
      setText(accumulated);
    }, ac.signal)
      .then(() => {
        onCache(persona.id, accumulated);
        setLoading(false);
        setStreaming(false);
      })
      .catch((err: unknown) => {
        const e = err as Error;
        if (e.name !== 'AbortError') {
          setError(e.message ?? '调用失败');
          setLoading(false);
        }
      });

    return () => ac.abort();
  }, [persona.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="rounded-xl p-4 border"
      style={{
        backgroundColor: persona.bgColor,
        borderColor: `${persona.color}22`,
        borderLeftWidth: 4,
        borderLeftColor: persona.color,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-sm" style={{ color: persona.color }}>
          {persona.name}
        </span>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[9px] font-bold leading-none text-center"
          style={{
            background: `radial-gradient(circle at 40% 35%, ${persona.color}cc, ${persona.color})`,
            boxShadow: `0 2px 8px ${persona.color}44`,
          }}
        >
          {persona.sealText}
        </div>
      </div>

      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : loading && !text ? (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="animate-spin">⟳</span> 正在召唤{persona.name}...
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap" style={{ minHeight: 60 }}>
          {text}
          {streaming && <span className="animate-pulse">▌</span>}
        </p>
      )}
    </div>
  );
}

// ─── Main AnalysisView ────────────────────────────────────────────────
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

  // Goals (loaded once)
  const [goals] = useState<Goal[]>(() => loadGoals());

  // Custom personas (reloaded on create)
  const [customPersonas, setCustomPersonas] = useState<CustomPersona[]>(() => loadCustomPersonas());
  const [showCreator, setShowCreator] = useState(false);
  const [editingPersona, setEditingPersona] = useState<CustomPersona | undefined>();

  // All personas = presets + custom
  const allPersonas: AnyPersona[] = [
    ...PERSONAS.map((p) => ({ ...p, isCustom: false as const })),
    ...customPersonas.map(toAnyPersona),
  ];

  // Active persona tab
  const [activePersonaId, setActivePersonaId] = useState<string>(PERSONAS[0].id);

  // Persona cache
  const [personaCache, setPersonaCache] = useState<Record<string, string>>(
    cached?.personas ?? {}
  );

  // Diary message with goals injected (memoized)
  const diaryMessage = useRef(buildAnalysisMessage(data, goals)).current;

  const parsed = parseStream(rawText);

  // Start analysis
  const startAnalysis = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setRawText('');
    setPhase('streaming');
    setErrorMsg('');

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

      const finalParsed = parseStream(accumulated);
      const analysis: Analysis = {
        generatedAt: new Date().toISOString(),
        diary: finalParsed.diary,
        summary: finalParsed.summary,
        insight: finalParsed.insight,
        personas: personaCache,
      };
      onAnalysisUpdate(analysis);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setPhase('error');
      setErrorMsg(err instanceof Error ? err.message : '未知错误');
    }
  }, [diaryMessage, personaCache, onAnalysisUpdate]);

  // Auto-start if no cached analysis
  useEffect(() => {
    if (!cached) startAnalysis();
    return () => abortRef.current?.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist persona cache updates
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

  // Export diary card
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

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#E8E4DA] shrink-0">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-[#1A3A5C] hover:text-[#2a4a6c] transition-colors">
          ← 返回记录
        </button>
        <div className="flex items-center gap-2">
          {phase === 'complete' && (
            <button onClick={startAnalysis} className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded hover:bg-gray-100">
              重新分析
            </button>
          )}
          <span className="text-xs text-gray-400">{getActiveModel().name}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Error */}
        {phase === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-600 font-medium mb-1">分析失败</p>
            <p className="text-xs text-red-500">{errorMsg}</p>
            <button onClick={startAnalysis} className="mt-3 px-4 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">重试</button>
          </div>
        )}

        {/* Card 1: Diary */}
        {(parsed.diary || isStreaming) && (
          <div ref={diaryCardRef} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">📔 今天的日记</h3>
              {parsed.diaryDone && (
                <button onClick={handleExport} className="text-xs text-[#1A3A5C] hover:underline">导出图片</button>
              )}
            </div>
            <div className="text-sm leading-[1.9] text-gray-700 whitespace-pre-wrap" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {parsed.diary}
              {isStreaming && !parsed.diaryDone && <span className="animate-pulse">▌</span>}
            </div>
          </div>
        )}

        {/* Card 2: Summary */}
        {parsed.summary && (
          <SummaryCard summary={parsed.summary} hasGoals={goals.some((g) => g.isActive)} />
        )}

        {/* Card 3: Insight */}
        {(parsed.insight || (isStreaming && parsed.diaryDone && parsed.summaryDone)) && (
          <div className="rounded-xl p-4 border-l-4" style={{ backgroundColor: '#EBF2FA', borderLeftColor: '#1A3A5C' }}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">💡 今日洞察</h3>
            <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
              {parsed.insight}
              {isStreaming && !parsed.insightDone && <span className="animate-pulse">▌</span>}
            </p>
          </div>
        )}

        {/* Loading state */}
        {isStreaming && !parsed.diary && (
          <div className="flex items-center gap-3 text-sm text-gray-400 py-8 justify-center">
            <span className="animate-spin text-lg">⟳</span>
            正在整理今天的记录...
          </div>
        )}

        {/* Persona section */}
        {phase === 'complete' && parsed.insightDone && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">🎭 大佬视角点评</h3>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 overflow-x-auto pb-1 flex-wrap">
              {allPersonas.map((p) => (
                <div key={p.id} className="flex items-center gap-0.5">
                  <button
                    onClick={() => setActivePersonaId(p.id)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0"
                    style={{
                      backgroundColor: activePersonaId === p.id ? p.color : 'transparent',
                      color: activePersonaId === p.id ? '#fff' : p.color,
                      border: `1.5px solid ${p.color}`,
                    }}
                  >
                    {p.name}
                  </button>
                  {p.isCustom && (
                    <button
                      onClick={() => {
                        const cp = customPersonas.find((c) => c.id === p.id);
                        setEditingPersona(cp);
                        setShowCreator(true);
                      }}
                      className="text-[10px] text-gray-400 hover:text-gray-600 px-0.5"
                      title="编辑"
                    >
                      ✏️
                    </button>
                  )}
                </div>
              ))}

              {/* Add custom */}
              <button
                onClick={() => { setEditingPersona(undefined); setShowCreator(true); }}
                className="px-2.5 py-1.5 rounded-full text-xs text-gray-400 border border-dashed border-gray-300 hover:border-gray-400 hover:text-gray-500 transition-colors whitespace-nowrap shrink-0"
              >
                + 自定义
              </button>
            </div>

            {/* Active persona card */}
            {activePersona && (
              <PersonaCard
                key={activePersonaId}
                persona={activePersona}
                diaryMessage={diaryMessage}
                cached={personaCache[activePersonaId]}
                onCache={handlePersonaCache}
              />
            )}

            {/* Delete button for custom personas */}
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
      </div>

      {/* Custom persona creator */}
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

// ─── Summary card ─────────────────────────────────────────────────────
function SummaryCard({ summary, hasGoals }: { summary: AnalysisSummary; hasGoals: boolean }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 今日速览</h3>
      <div className="space-y-2.5 text-sm">
        <div className="flex items-start gap-2">
          <span className="text-gray-400 shrink-0 w-10">心情</span>
          <span className="text-gray-700">{summary.mood}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 shrink-0 w-10">评分</span>
          <span className="text-gray-700 mr-2">{summary.score}/10</span>
          <ScoreStars score={summary.score} />
        </div>
        {hasGoals && summary.goalAlignment != null && (
          <div className="flex items-center gap-2">
            <span className="text-gray-400 shrink-0 w-10">目标</span>
            <span className="text-gray-700 mr-2">对齐 {summary.goalAlignment}/10</span>
            <GoalBar score={summary.goalAlignment} />
          </div>
        )}
        {summary.insights.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-gray-400 shrink-0 w-10">灵感</span>
            <div className="flex flex-wrap gap-1">
              {summary.insights.map((ins, i) => (
                <span key={i} className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs px-2 py-0.5 rounded-full">{ins}</span>
              ))}
            </div>
          </div>
        )}
        {summary.gratitude.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-gray-400 shrink-0 w-10">感谢</span>
            <div className="space-y-0.5">
              {summary.gratitude.map((g, i) => <div key={i} className="text-gray-700">· {g}</div>)}
            </div>
          </div>
        )}
        {summary.todos.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-gray-400 shrink-0 w-10">待办</span>
            <div className="space-y-0.5">
              {summary.todos.map((t, i) => <div key={i} className="text-gray-700">· {t}</div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GoalBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 7 ? '#22c55e' : score >= 4 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}
