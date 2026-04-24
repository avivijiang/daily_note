'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DiaryData, WeeklyReport, WeekStats } from '@/lib/types';
import { loadDiary } from '@/lib/storage';
import { loadGoals } from '@/lib/goals';
import { addDays, todayStr, getDuration } from '@/lib/utils';
import { getORKey, getActiveModelId } from '@/lib/ai';
import { parseWeeklyStream } from '@/lib/claude';

// ── Helpers ───────────────────────────────────────────────────────────

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = (first.getDay() + 6) % 7; // Mon = 0
  const days: Array<{ date: string; inMonth: boolean }> = [];

  for (let i = 0; i < startDow; i++) {
    const d = new Date(year, month, 1 - startDow + i);
    days.push({ date: fmt(d), inMonth: false });
  }
  for (let d = 1; d <= last.getDate(); d++) {
    days.push({ date: fmt(new Date(year, month, d)), inMonth: true });
  }
  while (days.length % 7 !== 0) {
    const prev = new Date(days[days.length - 1].date + 'T00:00:00');
    prev.setDate(prev.getDate() + 1);
    days.push({ date: fmt(prev), inMonth: false });
  }
  return days;
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekKey(date: string) {
  const d = new Date(date + 'T00:00:00');
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getWeekStart(date: string) {
  const d = new Date(date + 'T00:00:00');
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return fmt(d);
}

function calcTotalHours(data: DiaryData) {
  return data.events.reduce((sum, e) => {
    const start = e.startTime.split(':').map(Number);
    const end = e.endTime.split(':').map(Number);
    return sum + (end[0] * 60 + end[1] - start[0] * 60 - start[1]) / 60;
  }, 0);
}

const MOOD_EMOJI: Record<number, string> = { 1: '😞', 2: '😔', 3: '😐', 4: '😊', 5: '😄' };

// ── Main page ─────────────────────────────────────────────────────────

export default function HistoryPage() {
  const today = todayStr();
  const [mounted, setMounted] = useState(false);
  const todayDate = new Date(today + 'T00:00:00');
  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedData, setSelectedData] = useState<DiaryData | null>(null);

  // Weekly report state
  const [weeklyRawText, setWeeklyRawText] = useState('');
  const [weeklyPhase, setWeeklyPhase] = useState<'idle' | 'streaming' | 'done' | 'error'>('idle');
  const [weeklyError, setWeeklyError] = useState('');
  const [selectedWeekStart, setSelectedWeekStart] = useState<string | null>(null);
  const [weeklyCache, setWeeklyCache] = useState<Record<string, WeeklyReport>>({});

  useEffect(() => {
    setMounted(true);
    // Load cached weekly reports
    const raw = localStorage.getItem('weekly_reports');
    if (raw) {
      try { setWeeklyCache(JSON.parse(raw)); } catch { /* ignore */ }
    }
  }, []);

  // Load diary data for heatmap (90 days)
  const heatmapData = useMemo(() => {
    if (!mounted) return {};
    const map: Record<string, number> = {};
    for (let i = 0; i < 91; i++) {
      const date = addDays(today, -90 + i);
      const d = loadDiary(date);
      map[date] = d.events.length;
    }
    return map;
  }, [mounted, today]);

  // Calendar data for current month
  const calendarDays = useMemo(() => getMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const getDayData = (date: string): DiaryData | null => {
    if (!mounted) return null;
    const d = loadDiary(date);
    return d.events.length > 0 || d.mood || d.analysis ? d : null;
  };

  const handleDayClick = (date: string) => {
    const d = getDayData(date);
    if (!d) return;
    setSelectedDate(date);
    setSelectedData(d);
  };

  // Check if today is Monday and last week has data
  const isMonday = (new Date(today + 'T00:00:00')).getDay() === 1;
  const lastWeekStart = getWeekStart(addDays(today, -7));
  const lastWeekKey = getWeekKey(addDays(today, -7));

  const generateWeeklyReport = async (weekStart: string) => {
    const apiKey = getORKey();
    if (!apiKey) { setWeeklyError('请先填入 OpenRouter API Key'); return; }

    const weekKey = getWeekKey(weekStart);
    if (weeklyCache[weekKey]) {
      setSelectedWeekStart(weekStart);
      setWeeklyPhase('done');
      setWeeklyRawText('');
      return;
    }

    setSelectedWeekStart(weekStart);
    setWeeklyPhase('streaming');
    setWeeklyError('');
    setWeeklyRawText('');

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const d = loadDiary(date);
      const categories = d.events.map((e) => e.category);
      const topCat = categories.length > 0
        ? categories.sort((a, b) =>
            categories.filter((c) => c === b).length - categories.filter((c) => c === a).length
          )[0]
        : '';
      return {
        date,
        eventCount: d.events.length,
        totalHours: Math.round(calcTotalHours(d) * 10) / 10,
        moodScore: d.mood?.score ?? null,
        topCategory: topCat,
        analysisSummary: d.analysis?.summary ?? null,
      };
    });

    const goals = loadGoals().filter((g) => g.isActive);

    try {
      const res = await fetch('/api/weekly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
          'X-Model-Id': getActiveModelId(),
        },
        body: JSON.stringify({ weekData: weekDays, goals: goals.map((g) => ({ title: g.title })) }),
      });

      if (!res.ok) { setWeeklyError('周报生成失败'); setWeeklyPhase('error'); return; }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setWeeklyRawText(acc);
      }

      // Parse and cache
      const parsed = parseWeeklyStream(acc);
      const weekEnd = addDays(weekStart, 6);
      const report: WeeklyReport = {
        generatedAt: new Date().toISOString(),
        weekStart,
        weekEnd,
        summary: parsed.summary,
        stats: parsed.stats as WeekStats | null,
        patterns: parsed.patterns,
        insight: parsed.insight,
      };
      const updatedCache = { ...weeklyCache, [weekKey]: report };
      setWeeklyCache(updatedCache);
      localStorage.setItem('weekly_reports', JSON.stringify(updatedCache));
      setWeeklyPhase('done');
    } catch (e) {
      setWeeklyError(String(e));
      setWeeklyPhase('error');
    }
  };

  const exportWeeklyCard = async () => {
    const el = document.getElementById('weekly-report-card');
    if (!el) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(el, { scale: 2 });
      const link = document.createElement('a');
      link.download = `周报_${selectedWeekStart}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch { alert('导出失败'); }
  };

  if (!mounted) return <div style={{ backgroundColor: '#FAF8F3', minHeight: '100vh' }} />;

  // Current weekly report display
  const currentWeekKey = selectedWeekStart ? getWeekKey(selectedWeekStart) : null;
  const cachedReport = currentWeekKey ? weeklyCache[currentWeekKey] : null;
  const weeklyParsed = weeklyRawText ? parseWeeklyStream(weeklyRawText) : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF8F3' }}>
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-[#FAF8F3] border-b border-[#E8E4DA] shadow-sm">
        <div className="max-w-[1200px] mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" className="text-sm text-[#1A3A5C] hover:underline">← 返回</Link>
          <h1 className="text-base font-semibold text-[#1A3A5C]" style={{ fontFamily: 'Georgia, serif' }}>
            历史记录
          </h1>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 pt-20 pb-12">

        {/* Monday weekly report banner */}
        {isMonday && !weeklyCache[lastWeekKey] && (
          <div className="mb-6 bg-[#1A3A5C] text-white rounded-xl px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">📊 上周（{lastWeekStart} ~ {addDays(lastWeekStart, 6)}）的周报可以生成了</p>
              <p className="text-xs opacity-70 mt-0.5">基于你上周 7 天的记录，生成深度复盘</p>
            </div>
            <button
              onClick={() => generateWeeklyReport(lastWeekStart)}
              className="shrink-0 ml-4 px-4 py-2 bg-white text-[#1A3A5C] text-sm font-medium rounded-xl hover:bg-gray-100 transition-colors"
            >
              生成周报 →
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Calendar + heatmap */}
          <div className="lg:w-[55%] space-y-6">
            {/* Month calendar */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
                    else setViewMonth(m => m - 1);
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
                >‹</button>
                <h2 className="text-sm font-semibold text-gray-700">
                  {viewYear}年{viewMonth + 1}月
                </h2>
                <button
                  onClick={() => {
                    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
                    else setViewMonth(m => m + 1);
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
                >›</button>
              </div>

              {/* Weekday labels */}
              <div className="grid grid-cols-7 mb-1">
                {['一','二','三','四','五','六','日'].map((d) => (
                  <div key={d} className="text-center text-[10px] text-gray-400 py-1">{d}</div>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map(({ date, inMonth }) => {
                  const dayData = inMonth ? getDayData(date) : null;
                  const hasAnalysis = !!dayData?.analysis;
                  const mood = dayData?.mood?.score;
                  const eventCount = Math.min(dayData?.events.length ?? 0, 3);
                  const isSelected = selectedDate === date;
                  const isToday = date === today;

                  return (
                    <button
                      key={date}
                      onClick={() => inMonth && handleDayClick(date)}
                      disabled={!inMonth || !dayData}
                      className="relative flex flex-col items-center py-1.5 rounded-lg transition-colors"
                      style={{
                        backgroundColor: isSelected ? '#1A3A5C' : isToday ? '#EEF4FF' : 'transparent',
                        cursor: !inMonth || !dayData ? 'default' : 'pointer',
                        opacity: inMonth ? 1 : 0.2,
                      }}
                    >
                      <span
                        className="text-xs leading-none"
                        style={{ color: isSelected ? '#fff' : isToday ? '#1A3A5C' : '#555', fontWeight: isToday ? 600 : 400 }}
                      >
                        {new Date(date + 'T00:00:00').getDate()}
                      </span>
                      {mood && <span className="text-[10px] leading-none mt-0.5">{MOOD_EMOJI[mood]}</span>}
                      {eventCount > 0 && (
                        <div className="flex gap-0.5 mt-0.5">
                          {Array.from({ length: eventCount }).map((_, i) => (
                            <div key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: isSelected ? '#ffffff88' : '#1A3A5C88' }} />
                          ))}
                        </div>
                      )}
                      {hasAnalysis && (
                        <span className="absolute top-0.5 right-1 text-[8px] text-yellow-400">✦</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Heatmap */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">近 90 天记录热力图</h3>
              <div className="flex flex-wrap gap-0.5">
                {Array.from({ length: 91 }, (_, i) => {
                  const date = addDays(today, -90 + i);
                  const count = heatmapData[date] ?? 0;
                  const level = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : 3;
                  const colors = ['#f0f0f0', '#c7e2ff', '#7ab8ff', '#1A3A5C'];
                  return (
                    <div
                      key={date}
                      title={`${date}: ${count} 条事件`}
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: colors[level] }}
                    />
                  );
                })}
              </div>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                <span>少</span>
                {['#f0f0f0','#c7e2ff','#7ab8ff','#1A3A5C'].map((c) => (
                  <div key={c} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
                ))}
                <span>多</span>
              </div>
            </div>

            {/* Weekly report generator */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 生成周报</h3>
              <p className="text-xs text-gray-500 mb-3">选择任意一周生成 AI 深度复盘</p>
              <div className="flex items-center gap-2">
                <input
                  type="week"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20"
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const [year, week] = e.target.value.split('-W');
                    const jan1 = new Date(Number(year), 0, 1);
                    const weekStart = new Date(jan1.getTime() + (Number(week) - 1) * 7 * 86400000);
                    const dow = (weekStart.getDay() + 6) % 7;
                    weekStart.setDate(weekStart.getDate() - dow);
                    setSelectedWeekStart(fmt(weekStart));
                  }}
                />
                <button
                  onClick={() => selectedWeekStart && generateWeeklyReport(selectedWeekStart)}
                  disabled={!selectedWeekStart || weeklyPhase === 'streaming'}
                  className="px-4 py-2 bg-[#1A3A5C] text-white text-sm rounded-xl hover:bg-[#2a4a6c] transition-colors disabled:opacity-40"
                >
                  生成
                </button>
              </div>
              {weeklyError && <p className="text-xs text-red-500 mt-2">{weeklyError}</p>}
            </div>
          </div>

          {/* Right: Day detail or Weekly report */}
          <div className="lg:w-[45%]">
            {/* Weekly report view */}
            {(weeklyPhase === 'streaming' || weeklyPhase === 'done' || cachedReport) && (
              <WeeklyReportView
                parsed={weeklyParsed}
                cached={cachedReport}
                weekStart={selectedWeekStart ?? ''}
                isStreaming={weeklyPhase === 'streaming'}
                onExport={exportWeeklyCard}
              />
            )}

            {/* Day detail */}
            {selectedDate && selectedData && weeklyPhase === 'idle' && (
              <DayDetail
                date={selectedDate}
                data={selectedData}
              />
            )}

            {!selectedDate && weeklyPhase === 'idle' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                <p className="text-gray-400 text-sm">点击日历上有记录的日期查看详情</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Day detail ────────────────────────────────────────────────────────
function DayDetail({ date, data }: { date: string; data: DiaryData }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">{date}</h3>
        <Link
          href={`/?date=${date}`}
          className="text-xs text-[#1A3A5C] hover:underline"
        >
          跳转到这一天 →
        </Link>
      </div>

      {/* Events */}
      {data.events.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">时间轴事件</p>
          <div className="space-y-1.5">
            {data.events.map((e) => (
              <div key={e.id} className="flex items-center gap-2 text-xs text-gray-600">
                <span className="text-gray-400 shrink-0">{e.startTime}-{e.endTime}</span>
                <span>{e.emoji}</span>
                <span className="flex-1 truncate">{e.title}</span>
                <span className="text-gray-400 shrink-0">{getDuration(e.startTime, e.endTime)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mood */}
      {data.mood && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400">心情</span>
          <span>{MOOD_EMOJI[data.mood.score]}</span>
          <span className="text-gray-600">{data.mood.score}/5</span>
          {data.mood.note && <span className="text-gray-500 truncate">{data.mood.note}</span>}
        </div>
      )}

      {/* Analysis summary */}
      {data.analysis?.summary && (
        <div className="rounded-xl p-3 bg-[#F5F8FF] border border-[#1A3A5C]/10 space-y-1.5">
          <p className="text-xs font-medium text-[#1A3A5C]">AI 分析速览</p>
          <p className="text-xs text-gray-600">{data.analysis.summary.mood}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>评分 {data.analysis.summary.score}/10</span>
            {data.analysis.summary.goalAlignment != null && (
              <span>· 目标对齐 {data.analysis.summary.goalAlignment}/10</span>
            )}
          </div>
          {data.analysis.insight && (
            <p className="text-xs text-gray-600 line-clamp-3">{data.analysis.insight}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Weekly report view ────────────────────────────────────────────────
function WeeklyReportView({
  parsed,
  cached,
  weekStart,
  isStreaming,
  onExport,
}: {
  parsed: ReturnType<typeof parseWeeklyStream> | null;
  cached: WeeklyReport | null;
  weekStart: string;
  isStreaming: boolean;
  onExport: () => void;
}) {
  const summary = cached?.summary ?? parsed?.summary ?? '';
  const stats = cached?.stats ?? (parsed?.stats as WeekStats | null) ?? null;
  const patterns = cached?.patterns ?? parsed?.patterns ?? '';
  const insight = cached?.insight ?? parsed?.insight ?? '';

  return (
    <div id="weekly-report-card" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          📊 周报 · {weekStart}
        </h3>
        {!isStreaming && (
          <button onClick={onExport} className="text-xs text-[#1A3A5C] hover:underline">导出图片</button>
        )}
      </div>

      {isStreaming && !summary && (
        <div className="flex items-center gap-2 text-xs text-gray-400 py-4 justify-center">
          <span className="animate-spin">⟳</span> 正在生成周报...
        </div>
      )}

      {summary && (
        <p className="text-sm leading-relaxed text-gray-700">
          {summary}
          {isStreaming && !parsed?.summaryDone && <span className="animate-pulse">▌</span>}
        </p>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: '记录天数', value: `${stats.totalRecordDays} 天` },
            { label: '平均心情', value: `${stats.avgMoodScore?.toFixed(1) ?? '—'}/5` },
            { label: '目标对齐', value: stats.avgGoalAlignment ? `${stats.avgGoalAlignment.toFixed(1)}/10` : '—' },
            { label: '记录时长', value: `${stats.totalEventHours?.toFixed(1) ?? '—'} 小时` },
            { label: '最高效', value: stats.mostProductiveDay ?? '—' },
            { label: '主要分类', value: stats.topCategory ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#F5F8FF] rounded-xl px-3 py-2">
              <p className="text-[10px] text-gray-400">{label}</p>
              <p className="text-sm font-semibold text-[#1A3A5C]">{value}</p>
            </div>
          ))}
        </div>
      )}

      {patterns && (
        <div className="rounded-xl p-3 bg-amber-50 border border-amber-100">
          <p className="text-xs font-medium text-amber-700 mb-1">🔍 行为模式</p>
          <p className="text-xs text-amber-800 leading-relaxed whitespace-pre-wrap">
            {patterns}
            {isStreaming && !parsed?.patternsDone && <span className="animate-pulse">▌</span>}
          </p>
        </div>
      )}

      {insight && (
        <div className="rounded-xl p-3 bg-[#EBF2FA] border-l-4 border-[#1A3A5C]">
          <p className="text-xs font-medium text-[#1A3A5C] mb-1">💡 本周洞察</p>
          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
            {insight}
            {isStreaming && !parsed?.insightDone && <span className="animate-pulse">▌</span>}
          </p>
        </div>
      )}
    </div>
  );
}
