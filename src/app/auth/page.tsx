'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Groundhog } from '@/components/Groundhog';

type AuthTab = 'login' | 'register';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/';

  const [tab, setTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [ghState, setGhState] = useState<'waving' | 'excited' | 'sad'>('waving');
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setError('Supabase 未配置，请先在 .env.local 中填入项目信息');
    }
  }, []);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setError('请填写邮箱和密码');
      setLoading(false);
      return;
    }

    if (tab === 'register') {
      const { error: err } = await supabase.auth.signUp({ email, password });
      if (err) {
        setError(err.message);
        setGhState('sad');
        setLoading(false);
        return;
      }
      setMessage('注册成功！请查收验证邮件，验证后即可登录。');
      setGhState('excited');
      setLoading(false);
      return;
    }

    // Login
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message === 'Invalid login credentials' ? '邮箱或密码错误' : err.message);
      setGhState('sad');
      setLoading(false);
      return;
    }

    setGhState('excited');
    setTimeout(() => router.push(redirect), 800);
  };

  const handleGoogle = async () => {
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}` },
    });
    if (err) setError(err.message);
  };

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) { setError('请输入邮箱'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setResetSent(true);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#FAF8F3' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo + groundhog */}
        <div className="flex flex-col items-center mb-8">
          <Groundhog state={ghState} size={80} />
          <h1
            className="text-2xl font-semibold text-[#1A3A5C] mt-3"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            土拨鼠日记
          </h1>
          <p className="text-sm text-gray-400 mt-1">每天不一样，从今天开始</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8E4DA] overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-[#E8E4DA]">
            {(['login', 'register'] as AuthTab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setMessage(''); }}
                className="flex-1 py-3 text-sm font-medium transition-colors"
                style={{
                  color: tab === t ? '#1A3A5C' : '#9CA3AF',
                  borderBottom: tab === t ? '2px solid #1A3A5C' : '2px solid transparent',
                  backgroundColor: 'transparent',
                }}
              >
                {t === 'login' ? '登录' : '注册'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {showReset ? (
              /* Reset password flow */
              <div className="space-y-4">
                <p className="text-sm text-gray-600">输入邮箱，我们将发送重置链接。</p>
                {resetSent ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
                    重置邮件已发送，请查收邮件！
                  </div>
                ) : (
                  <>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20"
                    />
                    {error && <p className="text-xs text-red-500">{error}</p>}
                    <button
                      onClick={handleResetPassword}
                      disabled={loading}
                      className="w-full py-2.5 bg-[#1A3A5C] text-white text-sm font-medium rounded-xl hover:bg-[#2a4a6c] transition-colors disabled:opacity-50"
                    >
                      {loading ? '发送中...' : '发送重置邮件'}
                    </button>
                  </>
                )}
                <button
                  onClick={() => { setShowReset(false); setError(''); }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  ← 返回登录
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">邮箱</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">密码</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                    required
                    minLength={6}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                )}
                {message && (
                  <p className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">{message}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#1A3A5C] text-white text-sm font-medium rounded-xl hover:bg-[#2a4a6c] transition-colors disabled:opacity-50"
                >
                  {loading ? '处理中...' : tab === 'login' ? '登录' : '创建账户'}
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-300">或者</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <button
                  type="button"
                  onClick={handleGoogle}
                  className="w-full py-2.5 border border-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  使用 Google 登录
                </button>

                {tab === 'login' && (
                  <button
                    type="button"
                    onClick={() => setShowReset(true)}
                    className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors text-center"
                  >
                    忘记密码？
                  </button>
                )}
              </form>
            )}
          </div>
        </div>

        {/* Skip / back */}
        <div className="text-center mt-4">
          <button
            onClick={() => router.push('/')}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            暂时不了，继续本地使用 →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthContent />
    </Suspense>
  );
}
