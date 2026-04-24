'use client';

import { useCallback, useEffect, useState } from 'react';
import { Analysis, DiaryData, DiaryEvent } from '@/lib/types';
import { todayStr, currentTimeStr, addDays, generateId } from '@/lib/utils';
import { loadDiary, saveDiary } from '@/lib/storage';
import { getActiveModel, hasORKey } from '@/lib/ai';
import { Header } from '@/components/Header';
import { TimelinePanel } from '@/components/TimelinePanel';
import { EventDialog } from '@/components/EventDialog';
import { NotesPanel } from '@/components/NotesPanel';
import { AnalysisView } from '@/components/AnalysisView';
import { OpeningQuote } from '@/components/OpeningQuote';
import { SealAnimation } from '@/components/SealAnimation';
import { ModelSettingsModal } from '@/components/ModelSettingsModal';
import { GoalPanel } from '@/components/GoalPanel';

const shownQuoteDates = new Set<string>();

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState(todayStr);
  const [diaryData, setDiaryData] = useState<DiaryData>(() => loadDiary(todayStr()));
  const [rightView, setRightView] = useState<'notes' | 'analysis'>('notes');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<DiaryEvent | undefined>();
  const [defaultStartTime, setDefaultStartTime] = useState('');

  const [showSeal, setShowSeal] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsHint, setSettingsHint] = useState<string | undefined>();
  const [showGoals, setShowGoals] = useState(false);

  const [activeModelName, setActiveModelName] = useState('');

  useEffect(() => {
    setMounted(true);
    setActiveModelName(getActiveModel().name);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const data = loadDiary(currentDate);

    const yesterday = addDays(currentDate, -1);
    const yesterdayData = loadDiary(yesterday);
    const undone = yesterdayData.todos.filter((t) => !t.done && t.text.trim());
    if (undone.length > 0) {
      const existingTexts = new Set(data.todos.map((t) => t.text.trim()));
      const toCarry = undone.filter((t) => !existingTexts.has(t.text.trim()));
      if (toCarry.length > 0) {
        const carried = toCarry.map((t) => ({
          id: generateId(),
          text: t.text,
          done: false,
          carriedFrom: yesterday,
        }));
        data.todos = [...carried, ...data.todos];
        saveDiary(data);
      }
    }

    setDiaryData(data);
    setRightView('notes');

    if (!shownQuoteDates.has(currentDate)) {
      shownQuoteDates.add(currentDate);
      setShowQuote(true);
    }
  }, [currentDate, mounted]);

  const updateDiary = useCallback((data: DiaryData) => {
    setDiaryData(data);
    saveDiary(data);
  }, []);

  const openAddDialog = (startTime: string) => {
    setEditingEvent(undefined);
    setDefaultStartTime(startTime);
    setDialogOpen(true);
  };

  const openEditDialog = (event: DiaryEvent) => {
    setEditingEvent(event);
    setDefaultStartTime(event.startTime);
    setDialogOpen(true);
  };

  const handleSaveEvent = (event: DiaryEvent) => {
    const events = editingEvent
      ? diaryData.events.map((e) => (e.id === event.id ? event : e))
      : [...diaryData.events, event];
    events.sort((a, b) => a.startTime.localeCompare(b.startTime));
    updateDiary({ ...diaryData, events });
  };

  const handleDeleteEvent = (id: string) => {
    updateDiary({ ...diaryData, events: diaryData.events.filter((e) => e.id !== id) });
  };

  const handleEndRecord = () => {
    if (!hasORKey()) {
      setSettingsHint('请先填入 OpenRouter API Key 才能开始分析');
      setShowSettings(true);
      return;
    }
    setShowSeal(true);
  };

  const handleSealComplete = () => {
    setShowSeal(false);
    setRightView('analysis');
  };

  const handleAnalysisUpdate = useCallback(
    (analysis: Analysis) => {
      const updated = { ...diaryData, analysis };
      setDiaryData(updated);
      saveDiary(updated);
    },
    [diaryData]
  );

  const handleSettingsSaved = () => {
    setActiveModelName(getActiveModel().name);
    setSettingsHint(undefined);
  };

  // Cache AI greeting into today's diary
  const handleGreetingGenerated = useCallback((text: string) => {
    const today = todayStr();
    if (currentDate !== today) return;
    const data = loadDiary(today);
    if (!data.greeting) {
      const updated = { ...data, greeting: text };
      setDiaryData((prev) => prev.date === today ? { ...prev, greeting: text } : prev);
      saveDiary(updated);
    }
  }, [currentDate]);

  if (!mounted) {
    return <div style={{ backgroundColor: '#FAF8F3', minHeight: '100vh' }} />;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF8F3' }}>
      <Header
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        onSettingsClick={() => { setSettingsHint(undefined); setShowSettings(true); }}
        onGoalsClick={() => setShowGoals(true)}
        activeModelName={activeModelName}
      />

      <main
        className="max-w-[1200px] mx-auto flex flex-col md:flex-row"
        style={{ height: 'calc(100vh - 56px)', marginTop: 56 }}
      >
        <section
          className="md:w-[60%] w-full flex flex-col overflow-hidden border-b md:border-b-0 md:border-r border-[#E8E4DA]"
          style={{ minHeight: 400 }}
        >
          <div className="px-4 py-2 border-b border-[#E8E4DA] shrink-0">
            <h2 className="text-xs font-medium text-gray-400 tracking-widest">时间轴</h2>
          </div>
          <TimelinePanel
            events={diaryData.events}
            onAddEvent={openAddDialog}
            onEditEvent={openEditDialog}
            onFloatingAdd={() => openAddDialog(currentTimeStr())}
          />
        </section>

        <section className="md:w-[40%] w-full flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b border-[#E8E4DA] shrink-0">
            <h2 className="text-xs font-medium text-gray-400 tracking-widest">
              {rightView === 'analysis' ? 'AI 分析' : '今日记录'}
            </h2>
          </div>

          {rightView === 'notes' ? (
            <NotesPanel
              data={diaryData}
              onChange={updateDiary}
              onEndRecord={handleEndRecord}
              hasAnalysis={!!diaryData.analysis}
            />
          ) : (
            <AnalysisView
              data={diaryData}
              onBack={() => setRightView('notes')}
              onAnalysisUpdate={handleAnalysisUpdate}
            />
          )}
        </section>
      </main>

      <EventDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        event={editingEvent}
        defaultStartTime={defaultStartTime}
      />

      {showQuote && (
        <OpeningQuote
          onDismiss={() => setShowQuote(false)}
          onGreetingGenerated={handleGreetingGenerated}
          cachedGreeting={diaryData.greeting}
        />
      )}

      {showSeal && <SealAnimation onComplete={handleSealComplete} />}

      {showSettings && (
        <ModelSettingsModal
          hint={settingsHint}
          onClose={() => { setShowSettings(false); setSettingsHint(undefined); }}
          onSaved={handleSettingsSaved}
        />
      )}

      {showGoals && (
        <GoalPanel
          onClose={() => setShowGoals(false)}
          onChange={() => {/* goals are read fresh on analysis start */}}
        />
      )}
    </div>
  );
}
