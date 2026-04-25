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
  timeToMinutes,
  minutesToTime,
} from '@/lib/utils';

const HOURS = Array.from(
  { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1 },
  (_, i) => TIMELINE_START_HOUR + i
);

const TOTAL_HEIGHT = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * HOUR_HEIGHT;

// Padding inside the scroll area so 06:00 / 00:00 labels are never clipped
const PAD_TOP = 16;     // px above the 06:00 line
const PAD_BOTTOM = 96;  // px below the 00:00 line (clears the fixed + button)
const HANDLE_PX = 8; // resize handle height in pixels
const MIN_DURATION_MIN = 15;

interface TimelinePanelProps {
  events: DiaryEvent[];
  onAddEvent: (startTime: string) => void;
  onEditEvent: (event: DiaryEvent) => void;
  onResizeEvent: (id: string, patch: { startTime?: string; endTime?: string }) => void;
  onFloatingAdd: () => void;
}

export function TimelinePanel({
  events,
  onAddEvent,
  onEditEvent,
  onResizeEvent,
  onFloatingAdd,
}: TimelinePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoverY, setHoverY] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState('');

  // ── Resize state (refs = no stale-closure issues) ──────────────────
  const resizeInfoRef = useRef<{
    eventId: string;
    edge: 'top' | 'bottom';
    origStartMin: number;
    origEndMin: number;
  } | null>(null);
  const resizePatchRef = useRef<{ startTime?: string; endTime?: string }>({});
  // Suppress the click event that fires right after a drag mouseup
  const suppressNextClickRef = useRef(false);

  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizePreview, setResizePreview] = useState<{ startTime?: string; endTime?: string }>({});

  // ── Hover helpers ──────────────────────────────────────────────────

  // Returns Y relative to the content grid (0 = 06:00), accounting for PAD_TOP
  const getYFromMouse = (e: React.MouseEvent): number => {
    const scroll = scrollRef.current;
    if (!scroll) return 0;
    const rect = scroll.getBoundingClientRect();
    return e.clientY - rect.top + scroll.scrollTop - PAD_TOP;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (resizingId) return; // suppress hover indicator while resizing
    if ((e.target as HTMLElement).closest('[data-event]')) { setHoverY(null); return; }
    const y = getYFromMouse(e);
    setHoverY(y);
    setHoverTime(yToTime(y));
  };

  const handleMouseLeave = () => setHoverY(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (suppressNextClickRef.current) { suppressNextClickRef.current = false; return; }
    if (resizingId) return;
    if ((e.target as HTMLElement).closest('[data-event]')) return;
    onAddEvent(yToTime(getYFromMouse(e)));
  };

  // ── Drag-to-resize ────────────────────────────────────────────────

  const handleResizeStart = (
    e: React.MouseEvent,
    event: DiaryEvent,
    edge: 'top' | 'bottom'
  ) => {
    e.stopPropagation();
    e.preventDefault();

    resizeInfoRef.current = {
      eventId: event.id,
      edge,
      origStartMin: timeToMinutes(event.startTime),
      origEndMin: timeToMinutes(event.endTime),
    };
    resizePatchRef.current = {};
    setResizingId(event.id);
    setResizePreview({});

    const onMove = (me: MouseEvent) => {
      const info = resizeInfoRef.current;
      if (!info || !scrollRef.current) return;

      const rect = scrollRef.current.getBoundingClientRect();
      const absY = me.clientY - rect.top + scrollRef.current.scrollTop - PAD_TOP;
      const rawMin = (absY / HOUR_HEIGHT) * 60 + TIMELINE_START_HOUR * 60;
      const snapped = Math.round(rawMin / 15) * 15;

      let patch: { startTime?: string; endTime?: string };
      if (info.edge === 'bottom') {
        const m = Math.max(info.origStartMin + MIN_DURATION_MIN,
          Math.min(TIMELINE_END_HOUR * 60, snapped));
        patch = { endTime: minutesToTime(m) };
      } else {
        const m = Math.max(TIMELINE_START_HOUR * 60,
          Math.min(info.origEndMin - MIN_DURATION_MIN, snapped));
        patch = { startTime: minutesToTime(m) };
      }

      resizePatchRef.current = patch;
      setResizePreview({ ...patch });
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      const info = resizeInfoRef.current;
      const patch = resizePatchRef.current;
      if (info && Object.keys(patch).length > 0) {
        onResizeEvent(info.eventId, patch);
        // Block the click event that the browser fires immediately after mouseup
        suppressNextClickRef.current = true;
        setTimeout(() => { suppressNextClickRef.current = false; }, 0);
      }

      resizeInfoRef.current = null;
      resizePatchRef.current = {};
      setResizingId(null);
      setResizePreview({});
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    // prevent text selection & cursor flash during drag
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  };

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="relative flex flex-col h-full">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto select-none"
        style={{ cursor: resizingId ? 'ns-resize' : 'pointer' }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* PAD_TOP / PAD_BOTTOM ensure 06:00 and 00:00 labels are never clipped */}
        <div style={{ paddingTop: PAD_TOP, paddingBottom: PAD_BOTTOM }}>
        <div className="relative" style={{ height: TOTAL_HEIGHT, paddingLeft: LABEL_WIDTH }}>

          {/* Hour grid */}
          {HOURS.map((hour) => {
            const top = (hour - TIMELINE_START_HOUR) * HOUR_HEIGHT;
            return (
              <div key={hour} className="absolute left-0 right-0 pointer-events-none" style={{ top }}>
                <div
                  className="absolute top-0 text-[11px] text-gray-400 text-right pr-2 -translate-y-1/2"
                  style={{ width: LABEL_WIDTH - 4, paddingTop: 2 }}
                >
                  {hour === 24 ? '00:00' : `${String(hour).padStart(2, '0')}:00`}
                </div>
                <div className="border-t border-gray-100 w-full" />
                <div
                  className="absolute left-0 right-0 border-t border-dashed border-gray-50"
                  style={{ top: HOUR_HEIGHT / 2 }}
                />
              </div>
            );
          })}

          {/* Hover indicator */}
          {hoverY !== null && !resizingId && (
            <div className="absolute left-0 right-0 pointer-events-none z-10" style={{ top: hoverY - 1 }}>
              <div className="flex items-center" style={{ paddingLeft: LABEL_WIDTH - 4 }}>
                <span className="text-[10px] text-[#1A3A5C] bg-blue-50 rounded px-1 mr-1 font-medium">
                  {hoverTime}
                </span>
                <div className="flex-1 border-t-2 border-dashed border-blue-200" />
              </div>
            </div>
          )}

          {/* Events */}
          {events.map((event) => {
            const isResizing = resizingId === event.id;
            // Merge preview patch during resize
            const displayStart = isResizing && resizePreview.startTime
              ? resizePreview.startTime : event.startTime;
            const displayEnd = isResizing && resizePreview.endTime
              ? resizePreview.endTime : event.endTime;

            const style = getCategoryStyle(event.category);
            const top = timeToY(displayStart);
            const bottom = timeToY(displayEnd);
            const height = Math.max(bottom - top, HANDLE_PX * 2 + 8);
            const duration = getDuration(displayStart, displayEnd);
            const isShort = height < 48;

            return (
              <div
                key={event.id}
                data-event="true"
                className="absolute right-2 rounded-md overflow-hidden transition-opacity"
                style={{
                  top,
                  height,
                  left: LABEL_WIDTH + 4,
                  backgroundColor: style.bg,
                  borderLeft: `3px solid ${style.solidBorder}`,
                  opacity: isResizing ? 0.85 : 1,
                  boxShadow: isResizing ? `0 2px 12px ${style.solidBorder}44` : undefined,
                  cursor: 'pointer',
                  zIndex: isResizing ? 20 : 1,
                }}
              >
                {/* Top resize handle */}
                <div
                  data-resize="true"
                  className="absolute top-0 left-0 right-0 flex items-center justify-center group"
                  style={{ height: HANDLE_PX, cursor: 'ns-resize', zIndex: 2 }}
                  onMouseDown={(e) => handleResizeStart(e, event, 'top')}
                >
                  <div
                    className="w-8 h-0.5 rounded-full opacity-0 group-hover:opacity-60 transition-opacity"
                    style={{ backgroundColor: style.solidBorder }}
                  />
                </div>

                {/* Content — click to edit */}
                <div
                  className="px-2 py-1 h-full flex flex-col justify-center"
                  style={{ paddingTop: HANDLE_PX, paddingBottom: HANDLE_PX }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!resizingId) onEditEvent(event);
                  }}
                >
                  {isShort ? (
                    <div className="text-[11px] font-medium text-gray-800 truncate leading-tight">
                      {event.emoji} {event.title}
                      <span className="text-gray-400 font-normal ml-1 text-[10px]">
                        {displayStart}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="text-[12px] font-medium text-gray-800 truncate leading-snug">
                        {event.emoji} {event.title}
                        {duration && (
                          <span
                            className="text-gray-500 font-normal ml-1"
                            style={{ fontWeight: isResizing ? 600 : undefined, color: isResizing ? style.solidBorder : undefined }}
                          >
                            （{duration}）
                          </span>
                        )}
                      </div>
                      <div
                        className="text-[11px] text-gray-400 mt-0.5"
                        style={{ fontWeight: isResizing ? 600 : undefined, color: isResizing ? style.solidBorder : undefined }}
                      >
                        {displayStart} – {displayEnd}
                      </div>
                      {event.note && height > 72 && (
                        <div className="text-[11px] text-gray-400 mt-0.5 truncate">{event.note}</div>
                      )}
                    </>
                  )}
                </div>

                {/* Bottom resize handle */}
                <div
                  data-resize="true"
                  className="absolute bottom-0 left-0 right-0 flex items-center justify-center group"
                  style={{ height: HANDLE_PX, cursor: 'ns-resize', zIndex: 2 }}
                  onMouseDown={(e) => handleResizeStart(e, event, 'bottom')}
                >
                  <div
                    className="w-8 h-0.5 rounded-full opacity-0 group-hover:opacity-60 transition-opacity"
                    style={{ backgroundColor: style.solidBorder }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        </div> {/* PAD wrapper */}
      </div>

      {/* Floating add button */}
      <button
        onClick={(e) => { e.stopPropagation(); onFloatingAdd(); }}
        className="fixed w-12 h-12 rounded-full bg-[#1A3A5C] text-white shadow-lg hover:bg-[#2a4a6c] active:scale-95 transition-all flex items-center justify-center text-2xl font-light z-30"
        style={{ bottom: 88, right: 24 }}
        title="新增事件"
      >
        +
      </button>
    </div>
  );
}
