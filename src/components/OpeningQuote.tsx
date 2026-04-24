'use client';

import { useEffect, useState } from 'react';
import { getORKey, getActiveModelId } from '@/lib/ai';
import { loadDiary } from '@/lib/storage';
import { loadGoals } from '@/lib/goals';
import { addDays, todayStr } from '@/lib/utils';

const FALLBACK_QUOTES = [
  '每一天都是新的一页，你来决定写什么。',
  '今天的专注，是明天复利的种子。',
  '不是每天都精彩，但每天都值得被记录。',
  '行动是治愈焦虑最好的药。',
  '你今天做的每一件小事，都在塑造未来的你。',
  '知道而不去做，等于不知道。—— 王阳明',
  '避免愚蠢，比追求聪明更重要。—— 芒格',
  '专注于你能控制的，放下你控制不了的。',
  '今天比昨天进步 1%，一年后你会强大 37 倍。',
  '记录是改变的第一步。',
  '土拨鼠说：今天和昨天一样，除非你做了不同的事。',
  '把今天过好，是对未来最好的投资。',
  '少即是多。—— 乔布斯',
  '你的时间去哪了，你的人生就去哪了。',
  '不要等准备好了再开始，开始了才会准备好。',
];

interface OpeningQuoteProps {
  onDismiss: () => void;
  onGreetingGenerated?: (text: string) => void;
  cachedGreeting?: string;
}

export function OpeningQuote({ onDismiss, onGreetingGenerated, cachedGreeting }: OpeningQuoteProps) {
  const [quote, setQuote] = useState<string>('');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Use cached greeting from today's diary if available
    if (cachedGreeting) {
      setQuote(cachedGreeting);
      scheduleHide();
      return;
    }

    const apiKey = getORKey();
    if (!apiKey) {
      setQuote(FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]);
      scheduleHide();
      return;
    }

    // Try to generate AI greeting
    const yesterday = addDays(todayStr(), -1);
    const yesterdayData = loadDiary(yesterday);
    const goals = loadGoals().filter((g) => g.isActive);

    fetch('/api/greeting', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
        'X-Model-Id': getActiveModelId(),
      },
      body: JSON.stringify({
        yesterdaySummary: yesterdayData.analysis?.summary ?? null,
        goals: goals.map((g) => ({ title: g.title })),
      }),
    })
      .then((r) => r.json())
      .then((json) => {
        const text = json.greeting as string;
        if (text) {
          setQuote(text);
          onGreetingGenerated?.(text);
        } else {
          setFallback();
        }
      })
      .catch(() => setFallback())
      .finally(() => scheduleHide());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setFallback = () => {
    setQuote(FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]);
  };

  const scheduleHide = () => {
    setTimeout(() => setVisible(false), 2500);
    setTimeout(onDismiss, 3000);
  };

  if (!quote) return null;

  return (
    <div
      className="fixed top-16 left-0 right-0 z-30 flex justify-center pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease' }}
    >
      <div className="mx-4 bg-[#1A3A5C] text-white text-sm px-6 py-3 rounded-xl shadow-lg max-w-lg text-center leading-relaxed">
        {quote}
      </div>
    </div>
  );
}
