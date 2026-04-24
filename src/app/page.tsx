'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Analysis, DiaryData, DiaryEvent } from '@/lib/types';
import { todayStr, currentTimeStr, addDays, generateId } from '@/lib/utils';
import { loadDiary, saveDiary } from '@/lib/storage';
import { getApiKey } from '@/lib/claude';
import { Header } from '@/components/Header';
import { TimelinePanel } from '@/components/TimelinePanel';
import { EventDialog } from '@/components/EventDialog';
import { NotesPanel } from '@/components/NotesPanel';
import { AnalysisView } from '@/components/AnalysisView';
import { OpeningQuote } from '@/components/OpeningQuote';
import { SealAnimation } from '@/components/SealAnimation';
import { ApiKeyModal } from '@/components/ApiKeyModal';

// Track which dates have shown the opening quote this session
const shownQuoteDates = new Set<string>();

export default function Home() {
  const [currentDate, setCurrentDate] = useState(todayStr);
  const [diaryData, setDiaryData] = useState<DiaryData>(() => loadDiary(todayStr()));

  // View: 'notes' | 'analysis'
  const [rightView, setRightView] = useState<'notes' | 'analysis'>('notes');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<DiaryEvent | undefined>();
  const [defaultStartTime, setDefaultStartTime] = useState('');

  // Overlay states
  const [showSeal, setShowSeal] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyModalMode, setApiKeyModalMode] = useState<'setup' | 'settings'>('setup');

  // ── Load diary + carry-over todos when date changes ──
  useEffect(() => {
    const data = loadDiary(currentDate);

    // Carry undone todos from yesterday
    const yesterday = addDays(currentDate, -1);
    const yesterdayData = loadDiary(yesterday);
    const undone = yesterdayData.todos.filter(
      (t) => !t.done && t.text.trim()
    );
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

    // Show opening quote once per date per session
    if (!shownQuoteDates.has(currentDate)) {
      shownQuoteDates.add(currentDate);
      setShowQuote(true);
    }
  }, [currentDate]);

  // ── Save ──
  const updateDiary = useCallback((data: DiaryData) => {
    setDiaryData(data);
    saveDiary(data);
  }, []);

  // ── Event handlers ──
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

  // ── End record → show seal → switch to analysis ──
  const handleEndRecord = () => {
    if (!getApiKey()) {
      setApiKeyModalMode('setup');
      setShowApiKeyModal(true);
      return;
    }
    setShowSeal(true);
  };

  const handleSealComplete = () => {
    setShowSeal(false);
    setRightView('analysis');
  };

  // ── Analysis update (persist) ──
  const handleAnalysisUpdate = useCallback(
    (analysis: Analysis) => {
      const updated = { ...diaryData, analysis };
      setDiaryData(updated);
      saveDiary(updated);
    },
    [diaryData]
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF8F3' }}>
      <Header
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        onSettingsClick={() => {
          setApiKeyModalMode('settings');
          setShowApiKeyModal(true);
        }}
      />

      <main
        className="max-w-[1200px] mx-auto flex flex-col md:flex-row"
        style={{ height: 'calc(100vh - 56px)', marginTop: 56 }}
      >
        {/* Left: Timeline 60% */}
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

        {/* Right: Notes or Analysis 40% */}
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

      {/* Event dialog */}
      <EventDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        event={editingEvent}
        defaultStartTime={defaultStartTime}
      />

      {/* Opening quote */}
      {showQuote && <OpeningQuote onDismiss={() => setShowQuote(false)} />}

      {/* Seal animation */}
      {showSeal && <SealAnimation onComplete={handleSealComplete} />}

      {/* API Key modal */}
      {showApiKeyModal && (
        <ApiKeyModal
          mode={apiKeyModalMode}
          onSave={() => {
            setShowApiKeyModal(false);
            if (apiKeyModalMode === 'setup') {
              // Retry end record after key saved
              setShowSeal(true);
            }
          }}
          onCancel={() => setShowApiKeyModal(false)}
        />
      )}
    </div>
  );
}
