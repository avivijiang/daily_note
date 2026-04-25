'use client';

import { useEffect, useRef, useState } from 'react';
import { Groundhog } from '@/components/Groundhog';
import { loadMeditationStats, saveMeditationStats } from '@/lib/groundhog';

// 4-7-8 breathing pattern (seconds)
const PHASES: { label: string; duration: number; instruction: string }[] = [
  { label: '吸气',  duration: 4, instruction: '用鼻子慢慢吸气' },
  { label: '屏息',  duration: 7, instruction: '轻轻屏住呼吸' },
  { label: '呼气',  duration: 8, instruction: '用嘴缓缓呼出' },
];

const DURATIONS = [
  { label: '3 分钟', minutes: 3 },
  { label: '5 分钟', minutes: 5 },
  { label: '10 分钟', minutes: 10 },
];

const CIRCLE_R = 80;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R;

export function MeditationMode({ onClose }: { onClose: () => void }) {
  const [selectedMinutes, setSelectedMinutes] = useState(5);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0); // 0..1
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseElapsedRef = useRef(0); // seconds within current phase

  // slide-in
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 30); }, []);

  const start = () => {
    setPhaseIdx(0);
    setPhaseProgress(0);
    setElapsed(0);
    setTotalSeconds(selectedMinutes * 60);
    phaseElapsedRef.current = 0;
    setRunning(true);
    setDone(false);
  };

  useEffect(() => {
    if (!running) return;

    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= totalSeconds) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          setDone(true);
          // save stats
          const stats = loadMeditationStats();
          saveMeditationStats({
            totalSessions: stats.totalSessions + 1,
            totalMinutes: stats.totalMinutes + selectedMinutes,
            lastSession: new Date().toISOString().slice(0, 10),
          });
          return next;
        }
        return next;
      });

      phaseElapsedRef.current += 1;

      setPhaseIdx((pi) => {
        const phase = PHASES[pi];
        if (phaseElapsedRef.current >= phase.duration) {
          phaseElapsedRef.current = 0;
          const next = (pi + 1) % PHASES.length;
          setPhaseProgress(0);
          return next;
        }
        setPhaseProgress(phaseElapsedRef.current / phase.duration);
        return pi;
      });
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, totalSeconds]);

  const handleClose = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setVisible(false);
    setTimeout(onClose, 310);
  };

  const remaining = Math.max(0, totalSeconds - elapsed);
  const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
  const secs = String(remaining % 60).padStart(2, '0');

  const phase = PHASES[phaseIdx];

  // Circle stroke: countdown within current phase
  const strokeDash = CIRCLE_CIRCUMFERENCE * phaseProgress;

  // Circle color per phase
  const phaseColor = phaseIdx === 0 ? '#4A90D9' : phaseIdx === 1 ? '#9B59B6' : '#27AE60';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(15,25,40,0.92)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease-out',
      }}
    >
      <div className="flex flex-col items-center gap-6 px-8 text-center">

        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          ✕
        </button>

        {/* Title */}
        <div>
          <h2 className="text-lg font-semibold text-white/90">4-7-8 冥想呼吸</h2>
          <p className="text-sm text-white/40 mt-1">跟随节奏，让思绪平静</p>
        </div>

        {/* Main circle + groundhog */}
        <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
          {/* Background circle */}
          <svg viewBox="0 0 220 220" width={220} height={220} className="absolute inset-0">
            <circle cx={110} cy={110} r={CIRCLE_R} stroke="rgba(255,255,255,0.08)" strokeWidth={8} fill="none" />
            {running && (
              <circle
                cx={110}
                cy={110}
                r={CIRCLE_R}
                stroke={phaseColor}
                strokeWidth={8}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${strokeDash} ${CIRCLE_CIRCUMFERENCE}`}
                transform="rotate(-90 110 110)"
                style={{ transition: 'stroke-dasharray 1s linear, stroke 0.5s ease' }}
              />
            )}
          </svg>

          {/* Groundhog */}
          <div className="relative z-10 flex flex-col items-center gap-1">
            <Groundhog state={done ? 'thumbsup' : running ? 'sleepy' : 'idle'} size={90} />
            {running && (
              <div className="text-white/80 font-mono text-2xl font-light tracking-wider">
                {mins}:{secs}
              </div>
            )}
          </div>
        </div>

        {/* Phase label */}
        {running && !done && (
          <div className="fade-in-anim text-center">
            <p className="text-2xl font-light text-white/90">{phase.label}</p>
            <p className="text-sm text-white/40 mt-1">{phase.instruction}</p>
            <p className="text-xs text-white/25 mt-2">
              {PHASES.map((p, i) => (
                <span
                  key={p.label}
                  className="mx-1"
                  style={{ color: i === phaseIdx ? phaseColor : 'rgba(255,255,255,0.2)' }}
                >
                  {p.label} {p.duration}s
                </span>
              ))}
            </p>
          </div>
        )}

        {/* Done screen */}
        {done && (
          <div className="fade-in-anim text-center">
            <p className="text-xl font-light text-white/90">完成了！</p>
            <p className="text-sm text-white/50 mt-1">你刚刚给大脑放了个假</p>
            <button
              onClick={handleClose}
              className="mt-4 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white/80 rounded-full text-sm transition-colors"
            >
              回到日记
            </button>
          </div>
        )}

        {/* Pre-start */}
        {!running && !done && (
          <div className="flex flex-col items-center gap-4">
            {/* Duration selector */}
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.minutes}
                  onClick={() => setSelectedMinutes(d.minutes)}
                  className="px-4 py-2 rounded-full text-sm transition-all"
                  style={{
                    background: selectedMinutes === d.minutes ? 'rgba(255,255,255,0.15)' : 'transparent',
                    color: selectedMinutes === d.minutes ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
                    border: `1px solid ${selectedMinutes === d.minutes ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <button
              onClick={start}
              className="px-8 py-3 rounded-full text-sm font-medium transition-all"
              style={{
                background: 'rgba(74,144,217,0.25)',
                border: '1px solid rgba(74,144,217,0.5)',
                color: '#7EC8E3',
              }}
            >
              开始冥想
            </button>

            <p className="text-xs text-white/25 max-w-[240px]">
              吸气 4s → 屏息 7s → 呼气 8s，循环至结束
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
