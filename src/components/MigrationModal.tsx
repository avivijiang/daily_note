'use client';

import { useEffect, useState } from 'react';
import { migrateLocalDataToCloud } from '@/lib/sync';

interface MigrationModalProps {
  onDone: () => void;
}

export function MigrationModal({ onDone }: MigrationModalProps) {
  const [progress, setProgress] = useState({ done: 0, total: 0, label: '准备中…' });
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    migrateLocalDataToCloud((done, total, label) => {
      if (!cancelled) setProgress({ done, total, label });
    })
      .then(() => {
        if (!cancelled) {
          setFinished(true);
          setTimeout(onDone, 2000);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="fixed bottom-5 right-5 z-50 w-64 bg-white rounded-2xl shadow-lg border border-[#E8E4DA] p-4 slide-up">
      {finished ? (
        <div className="flex items-center gap-3">
          <span className="text-lg">✅</span>
          <div>
            <p className="text-sm font-medium text-[#1A3A5C]">数据同步完成</p>
            <p className="text-xs text-gray-400">已备份到云端</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-500">同步出错</p>
            <p className="text-xs text-gray-400 truncate">{error}</p>
            <button
              onClick={onDone}
              className="mt-2 text-xs text-[#1A3A5C] underline"
            >
              跳过
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-[#1A3A5C] animate-pulse shrink-0" />
            <p className="text-sm font-medium text-[#1A3A5C]">正在同步数据…</p>
          </div>
          <p className="text-xs text-gray-400 mb-2 truncate">{progress.label}</p>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1A3A5C] rounded-full transition-all duration-300"
              style={{ width: progress.total > 0 ? `${pct}%` : '30%' }}
            />
          </div>
          {progress.total > 0 && (
            <p className="text-xs text-gray-400 mt-1 text-right">{progress.done}/{progress.total}</p>
          )}
        </div>
      )}
    </div>
  );
}
