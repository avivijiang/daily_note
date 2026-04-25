'use client';

import Link from 'next/link';
import { Groundhog } from '@/components/Groundhog';

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6"
      style={{ backgroundColor: '#FAF8F3' }}
    >
      <Groundhog state="sad" size={100} />
      <div className="text-center">
        <p className="text-5xl font-light text-[#1A3A5C]/20 mb-2">404</p>
        <p className="text-base font-medium text-gray-600">土拨鼠找不到这个页面</p>
        <p className="text-sm text-gray-400 mt-1">它可能跑去挖洞了</p>
      </div>
      <Link
        href="/"
        className="px-6 py-2.5 bg-[#1A3A5C] text-white text-sm font-medium rounded-full hover:bg-[#2a4a6c] transition-colors"
      >
        回到今天
      </Link>
    </div>
  );
}
