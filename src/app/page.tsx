'use client';

import { useCallback, useEffect, useState } from 'react';
import { DiaryData, DiaryEvent } from '@/lib/types';
import { todayStr, currentTimeStr } from '@/lib/utils';
import { loadDiary, saveDiary } from '@/lib/storage';
import { Header } from '@/components/Header';
import { TimelinePanel } from '@/components/TimelinePanel';
import { EventDialog } from '@/components/EventDialog';
import { NotesPanel } from '@/components/NotesPanel';

export default function Home() {
  const [currentDate, setCurrentDate] = useState(todayStr);
  const [diaryData, setDiaryData] = useState<DiaryData>(() => loadDiary(todayStr()));

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<DiaryEvent | undefined>();
  const [defaultStartTime, setDefaultStartTime] = useState('');

  // Load diary when date changes
  useEffect(() => {
    setDiaryData(loadDiary(currentDate));
  }, [currentDate]);

  // Save whenever data changes
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF8F3' }}>
      <Header currentDate={currentDate} onDateChange={setCurrentDate} />

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

        {/* Right: Notes 40% */}
        <section className="md:w-[40%] w-full flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b border-[#E8E4DA] shrink-0">
            <h2 className="text-xs font-medium text-gray-400 tracking-widest">今日记录</h2>
          </div>
          <NotesPanel data={diaryData} onChange={updateDiary} />
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
    </div>
  );
}
