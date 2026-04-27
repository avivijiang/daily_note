'use client';

import { formatDate, getWeekDays, addDays, todayStr } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { UserMenu } from '@/components/UserMenu';

interface HeaderProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  onSettingsClick: () => void;
  onGoalsClick: () => void;
  activeModelName?: string;
  onLoginRequest?: () => void;
  onSyncComplete?: () => void;
}

export function Header({ currentDate, onDateChange, onSettingsClick, onGoalsClick, activeModelName, onLoginRequest, onSyncComplete }: HeaderProps) {
  const weekDays = getWeekDays(currentDate);
  const today = todayStr();
  const isToday = currentDate === today;

  return (
    <header className="sticky top-0 left-0 right-0 z-40 bg-[#FAF8F3] border-b border-[#E8E4DA] shadow-sm shrink-0">
      <div className="max-w-[1200px] mx-auto px-4 h-14 flex items-center gap-4">
        {/* Groundhog logo + date title */}
        <div className="flex items-center gap-2 shrink-0">
          <Image src="/logo.png" alt="土拨鼠日记" width={32} height={32} className="object-contain" />
          <div
            className="text-base font-semibold text-[#1A3A5C] whitespace-nowrap"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {formatDate(currentDate)}
          </div>
        </div>

        {/* Week strip */}
        <div className="flex-1 flex items-center justify-center gap-0.5 overflow-x-auto">
          {weekDays.map((day) => {
            const isSelected = day.isSelected;
            return (
              <button
                key={day.date}
                onClick={() => onDateChange(day.date)}
                className="flex flex-col items-center w-9 py-1 rounded-full transition-all shrink-0"
                style={{
                  backgroundColor: isSelected ? '#1A3A5C' : 'transparent',
                  color: isSelected ? '#fff' : day.isToday ? '#1A3A5C' : '#999',
                  fontWeight: isSelected || day.isToday ? '600' : '400',
                }}
              >
                <span className="text-[10px] leading-none mb-0.5">{day.dayLabel}</span>
                <span className="text-sm leading-none">{day.dayNum}</span>
              </button>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {!isToday && (
            <button
              onClick={() => onDateChange(today)}
              className="px-3 py-1 text-xs font-medium bg-[#1A3A5C] text-white rounded-full hover:bg-[#2a4a6c] transition-colors"
            >
              回到今天
            </button>
          )}
          <button
            onClick={() => onDateChange(addDays(currentDate, -1))}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 transition-colors text-sm"
            title="前一天"
          >
            ‹
          </button>
          <button
            onClick={() => onDateChange(addDays(currentDate, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 transition-colors text-sm"
            title="后一天"
          >
            ›
          </button>

          {/* Goals */}
          <button
            onClick={onGoalsClick}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 transition-colors text-sm"
            title="我的目标"
          >
            🎯
          </button>

          {/* History */}
          <Link
            href="/history"
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 transition-colors text-sm"
            title="历史记录"
          >
            📅
          </Link>

          {/* Model badge + settings */}
          <button
            onClick={onSettingsClick}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            title="AI 模型设置"
          >
            {activeModelName && (
              <span className="text-[10px] font-medium text-[#1A3A5C]/70 hidden sm:inline">
                {activeModelName}
              </span>
            )}
            <span className="text-sm">⚙</span>
          </button>

          {/* User auth */}
          <UserMenu
            onLoginRequest={onLoginRequest ?? (() => {})}
            onSyncComplete={onSyncComplete}
          />
        </div>
      </div>
    </header>
  );
}
