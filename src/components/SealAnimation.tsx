'use client';

import { useEffect } from 'react';

interface SealAnimationProps {
  onComplete: () => void;
}

export function SealAnimation({ onComplete }: SealAnimationProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1100);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="seal-stamp">
        <span>✦ 今日<br />已封存 ✦</span>
      </div>
    </div>
  );
}
