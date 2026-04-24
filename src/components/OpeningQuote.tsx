'use client';

import { useEffect, useState } from 'react';

const QUOTES = [
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
  '双倍的努力值不如一个对的方向。',
  '你的时间去哪了，你的人生就去哪了。',
  '不要等准备好了再开始，开始了才会准备好。',
  '今天未完成的事，明天不会自动完成。',
  '每一次记录，都是一次与自己的对话。',
  '真正的自律，是在没人看的时候依然做该做的事。',
  '复利不只是钱，时间、技能、关系都复利。—— 纳瓦尔',
];

interface OpeningQuoteProps {
  onDismiss: () => void;
}

export function OpeningQuote({ onDismiss }: OpeningQuoteProps) {
  const [quote, setQuote] = useState('');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  useEffect(() => {
    const hideTimer = setTimeout(() => setVisible(false), 2000);
    const dismissTimer = setTimeout(onDismiss, 2500);
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  if (!quote) return null;

  return (
    <div
      className="fixed top-16 left-0 right-0 z-30 flex justify-center pointer-events-none"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}
    >
      <div className="mx-4 bg-[#1A3A5C] text-white text-sm px-6 py-3 rounded-xl shadow-lg max-w-lg text-center leading-relaxed">
        {quote}
      </div>
    </div>
  );
}
