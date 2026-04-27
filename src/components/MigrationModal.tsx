'use client';

import { useEffect, useState } from 'react';
import { migrateLocalDataToCloud } from '@/lib/sync';
import { Groundhog } from '@/components/Groundhog';

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
          setTimeout(onDone, 1800);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-[#E8E4DA] w-80 p-6 text-center">
        <div className="flex justify-center mb-4">
          <Groundhog state={finished ? 'excited' : 'waving'} size={72} />
        </div>

        {finished ? (
          <>
            <p className="font-semibold text-[#1A3A5C]">同步完成！</p>
            <p className="text-sm text-gray-400 mt-1">你的数据已安全备份到云端</p>
          </>
        ) : error ? (
          <>
            <p className="font-semibold text-red-500">上传出错</p>
            <p className="text-xs text-gray-400 mt-1 break-all">{error}</p>
            <button
              onClick={onDone}
              className="mt-4 px-4 py-2 bg-[#1A3A5C] text-white text-sm rounded-xl"
            >
              跳过
            </button>
          </>
        ) : (
          <>
            <p className="font-semibold text-[#1A3A5C]">正在上传本地数据</p>
            <p className="text-xs text-gray-400 mt-1">{progress.label}</p>
            <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1A3A5C] rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            {progress.total > 0 && (
              <p className="text-xs text-gray-400 mt-1">{progress.done} / {progress.total}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
