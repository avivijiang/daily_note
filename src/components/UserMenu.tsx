'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface UserMenuProps {
  onLoginRequest: () => void;
  onSyncComplete?: () => void;
}

export function UserMenu({ onLoginRequest, onSyncComplete }: UserMenuProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // Keep latest callback in a ref so the effect never needs to re-run when it changes
  const onSyncCompleteRef = useRef(onSyncComplete);
  useEffect(() => { onSyncCompleteRef.current = onSyncComplete; });

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        onSyncCompleteRef.current?.();
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setOpen(false);
    setSigningOut(false);
  };

  if (!isSupabaseConfigured()) return null;

  if (!user) {
    return (
      <button
        onClick={onLoginRequest}
        className="flex items-center gap-1 px-2 py-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors text-sm"
        title="登录同步数据"
      >
        <span className="text-xs hidden sm:inline">登录</span>
        <span>👤</span>
      </button>
    );
  }

  const initials = user.email?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-7 h-7 flex items-center justify-center rounded-full bg-[#1A3A5C] text-white text-xs font-semibold hover:bg-[#2a4a6c] transition-colors"
        title={user.email ?? '已登录'}
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-52 bg-white rounded-xl shadow-lg border border-[#E8E4DA] z-50 py-1 text-sm">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>

          <button
            onClick={() => { setOpen(false); router.push('/settings'); }}
            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-700 transition-colors"
          >
            账户设置
          </button>

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
          >
            {signingOut ? '退出中…' : '退出登录'}
          </button>
        </div>
      )}
    </div>
  );
}
