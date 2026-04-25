'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Analysis, DiaryData, DiaryEvent } from '@/lib/types';
import { todayStr, currentTimeStr, addDays, generateId } from '@/lib/utils';
import { loadDiary, saveDiary } from '@/lib/storage';
import { getActiveModel, hasORKey } from '@/lib/ai';
import {
  calcStreak, daysSinceLastOpen,
  loadGroundhogState, saveGroundhogState,
  QUOTES,
} from '@/lib/groundhog';
import { Header } from '@/components/Header';
import { TimelinePanel } from '@/components/TimelinePanel';
import { EventDialog } from '@/components/EventDialog';
import { NotesPanel } from '@/components/NotesPanel';
import { AnalysisView } from '@/components/AnalysisView';
import { OpeningQuote } from '@/components/OpeningQuote';
import { SealAnimation } from '@/components/SealAnimation';
import { ModelSettingsModal } from '@/components/ModelSettingsModal';
import { GoalPanel } from '@/components/GoalPanel';
import { Groundhog } from '@/components/Groundhog';
import { MusicPlayer } from '@/components/MusicPlayer';
import { MeditationMode } from '@/components/MeditationMode';

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
  const [showMeditation, setShowMeditation] = useState(false);

  const [activeModelName, setActiveModelName] = useState('');

  // Groundhog state
  const [ghEmotion, setGhEmotion] = useState<import('@/lib/groundhog').GroundhogEmotion>('idle');
  const [ghBubble, setGhBubble] = useState('');
  const ghBubbleKeyRef = useRef(0);

  const showGhBubble = useCallback((text: string, emotion: import('@/lib/groundhog').GroundhogEmotion = 'happy') => {
    ghBubbleKeyRef.current += 1;
    setGhEmotion(emotion);
    setGhBubble(text + '\u200B'.repeat(ghBubbleKeyRef.current));
    // hide groundhog after bubble fades
    setTimeout(() => { setGhEmotion('idle'); setGhBubble(''); }, 3500);
  }, []);

  useEffect(() => {
    setMounted(true);
    setActiveModelName(getActiveModel().name);
  }, []);

  // Groundhog streak / miss triggers (run once after mount)
  useEffect(() => {
    if (!mounted) return;
    const today = todayStr();
    const ghState = loadGroundhogState();

    const streak = calcStreak(today);
    const missedDays = ghState.lastOpenDate ? daysSinceLastOpen(ghState.lastOpenDate) : 0;

    // Update streak & lastOpenDate
    saveGroundhogState({ ...ghState, streakDays: streak, lastOpenDate: today });

    // Trigger quote based on streak / miss
    let quote: string | undefined;
    if (streak === 0 && missedDays >= 3) {
      quote = QUOTES.find((q) => q.trigger === 'missed_3days')?.text;
    } else if (streak >= 7) {
      quote = QUOTES.find((q) => q.trigger === 'streak_7')?.text;
    } else if (streak >= 3) {
      quote = QUOTES.find((q) => q.trigger === 'streak_3')?.text;
    } else if (!ghState.lastOpenDate) {
      quote = QUOTES.find((q) => q.trigger === 'first_open')?.text;
    }

    if (quote) {
      const emotion = streak > 0 ? 'happy' : missedDays >= 3 ? 'sad' : 'waving';
      setTimeout(() => showGhBubble(quote!, emotion), 1500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

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

  const handleResizeEvent = useCallback(
    (id: string, patch: { startTime?: string; endTime?: string }) => {
      const events = diaryData.events.map((e) =>
        e.id === id ? { ...e, ...patch } : e
      );
      updateDiary({ ...diaryData, events });
    },
    [diaryData, updateDiary]
  );

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

  const handleLogoClick = () => {
    const logoQuotes = QUOTES.filter((q) => q.trigger === 'logo_click');
    const q = logoQuotes[Math.floor(Math.random() * logoQuotes.length)];
    if (q) showGhBubble(q.text, 'waving');
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
    <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: '#FAF8F3' }}>
      <Header
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        onSettingsClick={() => { setSettingsHint(undefined); setShowSettings(true); }}
        onGoalsClick={() => setShowGoals(true)}
        onLogoClick={handleLogoClick}
        activeModelName={activeModelName}
      />

      {/* Inner column: takes all height below header, splits between content and music bar */}
      <div style={{ flex: '1 1 0%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Main content */}
        <main
          style={{ flex: '1 1 0%', minHeight: 0, overflow: 'hidden', display: 'flex' }}
          className="max-w-[1200px] w-full mx-auto flex-col md:flex-row"
        >
          <section
            className="md:w-[60%] w-full flex flex-col border-b md:border-b-0 md:border-r border-[#E8E4DA]"
            style={{ minHeight: 0, overflow: 'hidden' }}
          >
            <div className="px-4 py-2 border-b border-[#E8E4DA] shrink-0">
              <h2 className="text-xs font-medium text-gray-400 tracking-widest">时间轴</h2>
            </div>
            <TimelinePanel
              events={diaryData.events}
              onAddEvent={openAddDialog}
              onEditEvent={openEditDialog}
              onResizeEvent={handleResizeEvent}
              onFloatingAdd={() => openAddDialog(currentTimeStr())}
            />
          </section>

          <section
            className="md:w-[40%] w-full flex flex-col"
            style={{ minHeight: 0, overflow: 'hidden' }}
          >
            {rightView === 'notes' && (
              <div className="px-4 py-2 border-b border-[#E8E4DA] shrink-0">
                <h2 className="text-xs font-medium text-gray-400 tracking-widest">今日记录</h2>
              </div>
            )}
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

        {/* Music player — anchored to bottom of inner column */}
        <MusicPlayer onMeditationOpen={() => setShowMeditation(true)} />
      </div>

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

      {/* Groundhog — only appears when a bubble is triggered */}
      {ghBubble && (
        <div
          className="fixed z-20 select-none pointer-events-none"
          style={{ bottom: 72, right: 20 }}
        >
          <Groundhog state={ghEmotion} size={68} showBubble={ghBubble} />
        </div>
      )}

      {/* Meditation overlay */}
      {showMeditation && (
        <MeditationMode onClose={() => setShowMeditation(false)} />
      )}
    </div>
  );
}
