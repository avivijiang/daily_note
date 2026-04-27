'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getSyncStatus, migrateLocalDataToCloud } from '@/lib/sync';
import type { User } from '@supabase/supabase-js';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  // Sync
  const [syncStatus, setSyncStatus] = useState<string>('检测中…');
  const [migrating, setMigrating] = useState(false);
  const [migrateMsg, setMigrateMsg] = useState('');

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (!isSupabaseConfigured()) { setLoading(false); return; }
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getSyncStatus().then((s) => {
      const map: Record<string, string> = {
        online: '已连接',
        offline: '离线',
        not_configured: '未配置 Supabase',
        not_logged_in: '未登录',
      };
      setSyncStatus(map[s] ?? s);
    });
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(''); setPwMsg('');
    if (newPassword.length < 6) { setPwError('密码至少 6 位'); return; }
    if (newPassword !== confirmPassword) { setPwError('两次密码不一致'); return; }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    if (error) { setPwError(error.message); return; }
    setPwMsg('密码已更新');
    setNewPassword(''); setConfirmPassword('');
  };

  const handleExport = () => {
    const keys = Object.keys(localStorage);
    const data: Record<string, unknown> = {};
    for (const k of keys) {
      try { data[k] = JSON.parse(localStorage.getItem(k)!); } catch { data[k] = localStorage.getItem(k); }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `groundhog_diary_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleMigrate = async () => {
    setMigrating(true);
    setMigrateMsg('');
    await migrateLocalDataToCloud((done, total, label) => {
      setMigrateMsg(`${label} (${done}/${total})`);
    });
    setMigrateMsg('上传完成！');
    setMigrating(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== '确认删除') { setDeleteError('请输入"确认删除"以继续'); return; }
    setDeleteLoading(true);
    setDeleteError('');
    // Call server-side delete (requires service role) via API route
    const res = await fetch('/api/account/delete', { method: 'POST' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setDeleteError(json.error ?? '删除失败，请联系支持');
      setDeleteLoading(false);
      return;
    }
    // Clear local data
    localStorage.clear();
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF8F3' }}>
      <p className="text-gray-400 text-sm">加载中…</p>
    </div>;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF8F3' }}>
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Back */}
        <button
          onClick={() => router.push('/')}
          className="text-sm text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1"
        >
          ← 返回
        </button>

        <h1
          className="text-2xl font-semibold text-[#1A3A5C] mb-6"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          账户设置
        </h1>

        {/* User info */}
        <div className="bg-white rounded-2xl border border-[#E8E4DA] p-5 mb-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-widest mb-3">账户信息</h2>
          {user ? (
            <p className="text-sm text-gray-700">{user.email}</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-400">未登录</p>
              <button
                onClick={() => router.push('/auth')}
                className="px-4 py-2 bg-[#1A3A5C] text-white text-sm rounded-xl hover:bg-[#2a4a6c] transition-colors"
              >
                前往登录
              </button>
            </div>
          )}
        </div>

        {/* Sync status */}
        <div className="bg-white rounded-2xl border border-[#E8E4DA] p-5 mb-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-widest mb-3">云端同步</h2>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">同步状态</span>
            <span className={`text-sm font-medium ${syncStatus === '已连接' ? 'text-green-600' : 'text-gray-400'}`}>
              {syncStatus}
            </span>
          </div>
          {user && (
            <div className="space-y-2">
              <button
                onClick={handleMigrate}
                disabled={migrating}
                className="w-full py-2 border border-[#1A3A5C]/30 text-[#1A3A5C] text-sm rounded-xl hover:bg-[#1A3A5C]/5 transition-colors disabled:opacity-50"
              >
                {migrating ? '上传中…' : '将本地数据上传到云端'}
              </button>
              {migrateMsg && <p className="text-xs text-gray-400">{migrateMsg}</p>}
            </div>
          )}
        </div>

        {/* Change password */}
        {user && (
          <div className="bg-white rounded-2xl border border-[#E8E4DA] p-5 mb-4">
            <h2 className="text-xs font-semibold text-gray-400 tracking-widest mb-3">修改密码</h2>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="新密码（至少 6 位）"
                autoComplete="new-password"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="确认新密码"
                autoComplete="new-password"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20"
              />
              {pwError && <p className="text-xs text-red-500">{pwError}</p>}
              {pwMsg && <p className="text-xs text-green-600">{pwMsg}</p>}
              <button
                type="submit"
                disabled={pwLoading}
                className="w-full py-2.5 bg-[#1A3A5C] text-white text-sm font-medium rounded-xl hover:bg-[#2a4a6c] transition-colors disabled:opacity-50"
              >
                {pwLoading ? '更新中…' : '修改密码'}
              </button>
            </form>
          </div>
        )}

        {/* Export data */}
        <div className="bg-white rounded-2xl border border-[#E8E4DA] p-5 mb-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-widest mb-3">数据导出</h2>
          <p className="text-xs text-gray-400 mb-3">将所有本地日记、目标、设置导出为 JSON 文件</p>
          <button
            onClick={handleExport}
            className="w-full py-2 border border-gray-200 text-gray-700 text-sm rounded-xl hover:bg-gray-50 transition-colors"
          >
            导出全部数据
          </button>
        </div>

        {/* Delete account */}
        {user && (
          <div className="bg-white rounded-2xl border border-red-100 p-5">
            <h2 className="text-xs font-semibold text-red-400 tracking-widest mb-3">危险操作</h2>
            <p className="text-xs text-gray-400 mb-3">删除账户将永久删除云端所有数据，本地数据不受影响。</p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder='输入"确认删除"以继续'
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/20 mb-3"
            />
            {deleteError && <p className="text-xs text-red-500 mb-2">{deleteError}</p>}
            <button
              onClick={handleDeleteAccount}
              disabled={deleteLoading || deleteConfirm !== '确认删除'}
              className="w-full py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-colors disabled:opacity-40"
            >
              {deleteLoading ? '删除中…' : '永久删除账户'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
