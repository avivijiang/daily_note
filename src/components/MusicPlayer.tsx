'use client';

import { useEffect, useRef, useState } from 'react';
import { loadMusicPref, saveMusicPref } from '@/lib/groundhog';

// ── Scene catalogue ────────────────────────────────────────────────────

interface Scene {
  id: string;
  label: string;
  emoji: string;
  videos: string[];
}

const SCENES: Scene[] = [
  { id: 'lofi',    label: 'Lo-Fi',    emoji: '🎧', videos: ['jfKfPfyJRdk', '5qap5aO4i9A', 'DWcJFNfaw9c'] },
  { id: 'rain',    label: '雨声',     emoji: '🌧',  videos: ['mPZkdNFkNps', 'q76bMs-NwRk', 'BHACKCNDMW8'] },
  { id: 'citypop', label: 'City Pop', emoji: '🌆', videos: ['FovjQEiPatI', 'DSGyEsJ17cI', 'MV_3Dpw-BRY'] },
  { id: 'ambient', label: '自然',     emoji: '🌿', videos: ['eKFTSSKCzWA', 'ZToicYcHIOU', 'inpok4MKVLM'] },
  { id: 'jazz',    label: 'Jazz',     emoji: '🎷', videos: ['Dx5qFachd3A', 'vmDDOFXSgAs', 'neV3EPgvZ3g'] },
];

// ── YouTube IFrame types ───────────────────────────────────────────────

declare global {
  interface Window {
    YT: {
      Player: new (el: string | HTMLElement, opts: object) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  setVolume(v: number): void;
  getPlayerState(): number;
  destroy(): void;
}

// ── Component ─────────────────────────────────────────────────────────

interface MusicPlayerProps {
  onMeditationOpen: () => void;
}

export function MusicPlayer({ onMeditationOpen }: MusicPlayerProps) {
  const pref = loadMusicPref();
  const [scene, setScene] = useState<string>(pref.lastScene ?? 'lofi');
  const [videoIdx, setVideoIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(60);
  const [apiReady, setApiReady] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const playerRef = useRef<YTPlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load YT API once
  useEffect(() => {
    if (window.YT?.Player) { setApiReady(true); return; }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); setApiReady(true); };
    if (!document.getElementById('yt-api-script')) {
      const s = document.createElement('script');
      s.id = 'yt-api-script';
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    }
  }, []);

  // Create / recreate player when scene or video changes
  useEffect(() => {
    if (!apiReady || !containerRef.current) return;

    playerRef.current?.destroy();
    playerRef.current = null;

    const currentScene = SCENES.find((s) => s.id === scene) ?? SCENES[0];
    const videoId = currentScene.videos[videoIdx % currentScene.videos.length];

    const el = document.createElement('div');
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(el);

    playerRef.current = new window.YT.Player(el, {
      videoId,
      height: '1',
      width: '1',
      playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, rel: 0, origin: window.location.origin },
      events: {
        onReady: (e: { target: YTPlayer }) => {
          e.target.setVolume(volume);
          if (playing) e.target.playVideo();
        },
        onStateChange: (e: { data: number }) => {
          if (e.data === window.YT.PlayerState.ENDED) handleNext();
          if (e.data === window.YT.PlayerState.PLAYING) setPlaying(true);
          if (e.data === window.YT.PlayerState.PAUSED) setPlaying(false);
        },
      },
    });

    saveMusicPref({ ...pref, lastScene: scene, totalPlays: pref.totalPlays + 1 });

    return () => { playerRef.current?.destroy(); playerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiReady, scene, videoIdx]);

  useEffect(() => { playerRef.current?.setVolume(volume); }, [volume]);

  const handlePlayPause = () => {
    if (!playerRef.current) return;
    if (playing) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  };

  const handleNext = () => {
    const currentScene = SCENES.find((s) => s.id === scene) ?? SCENES[0];
    setVideoIdx((i) => (i + 1) % currentScene.videos.length);
  };

  const currentScene = SCENES.find((s) => s.id === scene) ?? SCENES[0];

  return (
    <div
      className="border-t border-[#E8E4DA]"
      style={{
        height: minimized ? 36 : 64,
        background: 'rgba(250,248,243,0.98)',
        backdropFilter: 'blur(8px)',
        transition: 'height 0.2s ease',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Hidden YT container */}
      <div ref={containerRef} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }} />

      {/* Minimized bar */}
      {minimized ? (
        <div className="h-full flex items-center px-4 gap-3">
          <span className="text-sm">{currentScene.emoji}</span>
          <span className="text-xs text-gray-400 flex-1">{currentScene.label}</span>
          {playing && (
            <span className="text-xs text-[#1A3A5C]/50 flex gap-0.5">
              {[1,2,3].map((i) => (
                <span key={i} className="inline-block w-0.5 bg-[#1A3A5C]/40 rounded-full"
                  style={{ height: 8 + i * 3, animation: `gh-breathe ${0.5 + i * 0.15}s ease-in-out infinite` }} />
              ))}
            </span>
          )}
          <button
            onClick={() => setMinimized(false)}
            className="text-xs text-gray-400 hover:text-gray-600 px-2"
          >
            展开
          </button>
        </div>
      ) : (
        /* Full bar */
        <div className="h-full flex items-center gap-3 px-4 max-w-[1200px] mx-auto">

          {/* Scene selector */}
          <div className="flex gap-1 shrink-0">
            {SCENES.map((s) => (
              <button
                key={s.id}
                onClick={() => { setScene(s.id); setVideoIdx(0); }}
                title={s.label}
                className="flex flex-col items-center justify-center w-10 h-10 rounded-xl transition-all text-base"
                style={{
                  backgroundColor: scene === s.id ? '#1A3A5C' : 'transparent',
                  color: scene === s.id ? '#fff' : '#aaa',
                }}
              >
                <span className="leading-none">{s.emoji}</span>
                <span className="text-[8px] mt-0.5 leading-none">{s.label}</span>
              </button>
            ))}
          </div>

          <div className="w-px h-7 bg-[#E8E4DA] shrink-0" />

          {/* Play / next */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handlePlayPause}
              disabled={!apiReady}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#1A3A5C] bg-[#1A3A5C]/10 hover:bg-[#1A3A5C]/20 transition-colors disabled:opacity-40 text-sm"
            >
              {playing ? '⏸' : '▶'}
            </button>
            <button
              onClick={handleNext}
              disabled={!apiReady}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors disabled:opacity-40 text-xs"
            >
              ⏭
            </button>
          </div>

          {/* Label */}
          <div className="flex-1 min-w-0 hidden sm:block">
            <p className="text-xs text-[#1A3A5C]/70 font-medium">
              {currentScene.emoji} {currentScene.label}
              {!apiReady && <span className="text-gray-300 ml-1 font-normal">（加载中）</span>}
            </p>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-gray-300">{volume === 0 ? '🔇' : '🔊'}</span>
            <input
              type="range" min={0} max={100} value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-16 h-1 accent-[#1A3A5C]"
            />
          </div>

          {/* Meditation */}
          <button
            onClick={onMeditationOpen}
            className="flex items-center gap-1 px-3 h-7 rounded-full text-xs font-medium border border-[#1A3A5C]/20 text-[#1A3A5C]/60 hover:text-[#1A3A5C] hover:border-[#1A3A5C]/40 transition-colors shrink-0"
          >
            🧘 冥想
          </button>

          {/* Minimize */}
          <button
            onClick={() => setMinimized(true)}
            className="w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:bg-gray-100 hover:text-gray-500 transition-colors text-xs shrink-0"
          >
            ⌃
          </button>
        </div>
      )}
    </div>
  );
}
