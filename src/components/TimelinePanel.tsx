'use client';

import { useRef, useState } from 'react';
import { DiaryEvent } from '@/lib/types';
import {
  TIMELINE_START_HOUR,
  TIMELINE_END_HOUR,
  HOUR_HEIGHT,
  LABEL_WIDTH,
  getCategoryStyle,
  timeToY,
  yToTime,
  getDuration,
} from '@/lib/utils';

const HOURS = Array.from(
  { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1 },
  (_, i) => TIMELINE_START_HOUR + i
);

const TOTAL_HEIGHT = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * HOUR_HEIGHT;

interface TimelinePanelProps {
  events: DiaryEvent[];
  onAddEvent: (startTime: string) => void;
  onEditEvent: (event: DiaryEvent) => void;
  onFloatingAdd: () => void;
}

export function TimelinePanel({
  events,
  onAddEvent,
  onEditEvent,
  onFloatingAdd,
}: TimelinePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoverY, setHoverY] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState('');

  const getYFromEvent = (e: React.MouseEvent): number => {
    const scroll = scrollRef.current;
    if (!scroll) return 0;
    const rect = scroll.getBoundingClientRect();
    return e.clientY - rect.top + scroll.scrollTop;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-event]')) {
      setHoverY(null);
      return;
    }
    const y = getYFromEvent(e);
    setHoverY(y);
    setHoverTime(yToTime(y));
  };

  const handleMouseLeave = () => {
    setHoverY(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-event]')) return;
    const y = getYFromEvent(e);
    onAddEvent(yToTime(y));
  };

  return (
    <div className="relative flex flex-col h-full">
      {/* Scrollable timeline area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto cursor-pointer select-none"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="relative"
          style={{ height: TOTAL_HEIGHT, paddingLeft: LABEL_WIDTH }}
        >
          {/* Hour rows */}
          {HOURS.map((hour) => {
            const top = (hour - TIMELINE_START_HOUR) * HOUR_HEIGHT;
            return (
              <div
                key={hour}
                className="absolute left-0 right-0 pointer-events-none"
                style={{ top }}
              >
                {/* Time label */}
                <div
                  className="absolute top-0 text-[11px] text-gray-400 text-right pr-2 -translate-y-1/2"
                  style={{ width: LABEL_WIDTH - 4, paddingTop: 2 }}
                >
                  {String(hour).padStart(2, '0')}:00
                </div>
                {/* Grid line */}
                <div className="border-t border-gray-100 w-full" />
                {/* Half-hour line */}
                <div
                  className="absolute left-0 right-0 border-t border-dashed border-gray-50"
                  style={{ top: HOUR_HEIGHT / 2 }}
                />
              </div>
            );
          })}

          {/* Hover indicator */}
          {hoverY !== null && (
            <div
              className="absolute left-0 right-0 pointer-events-none z-10"
              style={{ top: hoverY - 1 }}
            >
              <div
                className="flex items-center"
                style={{ paddingLeft: LABEL_WIDTH - 4 }}
              >
                <span className="text-[10px] text-[#1A3A5C] bg-blue-50 rounded px-1 mr-1 font-medium">
                  {hoverTime}
                </span>
                <div className="flex-1 border-t-2 border-dashed border-blue-200" />
              </div>
            </div>
          )}

          {/* Event cards */}
          {events.map((event) => {
            const style = getCategoryStyle(event.category);
            const top = timeToY(event.startTime);
            const height = Math.max(timeToY(event.endTime) - top, 22);
            const duration = getDuration(event.startTime, event.endTime);
            const isShort = height < 48;

            return (
              <div
                key={event.id}
                data-event="true"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditEvent(event);
                }}
                className="absolute right-2 rounded-md cursor-pointer hover:brightness-95 active:scale-[0.99] transition-all overflow-hidden"
                style={{
                  top,
                  height,
                  left: LABEL_WIDTH + 4,
                  backgroundColor: style.bg,
                  borderLeft: `3px solid ${style.solidBorder}`,
                }}
              >
                <div className="px-2 py-1 h-full flex flex-col justify-center">
                  {isShort ? (
                    <div className="text-[11px] font-medium text-gray-800 truncate leading-tight">
                      {event.emoji} {event.title}
                      <span className="text-gray-400 font-normal ml-1 text-[10px]">
                        {event.startTime}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="text-[12px] font-medium text-gray-800 truncate leading-snug">
                        {event.emoji} {event.title}
                        {duration && (
                          <span className="text-gray-500 font-normal ml-1">（{duration}）</span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {event.startTime} – {event.endTime}
                      </div>
                      {event.note && height > 72 && (
                        <div className="text-[11px] text-gray-400 mt-0.5 truncate">
                          {event.note}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating add button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onFloatingAdd();
        }}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-[#1A3A5C] text-white shadow-lg hover:bg-[#2a4a6c] active:scale-95 transition-all flex items-center justify-center text-2xl font-light z-30"
        title="新增事件"
      >
        +
      </button>
    </div>
  );
}
