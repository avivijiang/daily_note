'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Groundhog } from '@/components/Groundhog';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [ghState, setGhState] = useState<'waving' | 'excited' | 'sad'>('waving');

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('密码至少 6 位');
      return;
    }
    if (password !== confirm) {
      setError('两次密码不一致');
      setGhState('sad');
      return;
    }

    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (err) {
      setError(err.message);
      setGhState('sad');
      return;
    }

    setGhState('excited');
    setDone(true);
    setTimeout(() => router.push('/'), 2000);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#FAF8F3' }}
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Groundhog state={ghState} size={80} />
          <h1
            className="text-2xl font-semibold text-[#1A3A5C] mt-3"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            重置密码
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#E8E4DA] p-6">
          {done ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-green-600">密码已更新！正在跳转…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">新密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 6 位"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">确认新密码</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="再输一遍"
                  autoComplete="new-password"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#1A3A5C] text-white text-sm font-medium rounded-xl hover:bg-[#2a4a6c] transition-colors disabled:opacity-50"
              >
                {loading ? '更新中…' : '确认修改'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
