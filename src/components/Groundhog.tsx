'use client';

import { useEffect, useState } from 'react';
import { GroundhogEmotion } from '@/lib/groundhog';

interface GroundhogProps {
  state?: GroundhogEmotion;
  size?: number;
  showBubble?: string;
  className?: string;
}

export function Groundhog({ state = 'idle', size = 80, showBubble, className = '' }: GroundhogProps) {
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubbleText, setBubbleText] = useState('');
  const [bubbleFading, setBubbleFading] = useState(false);

  useEffect(() => {
    if (!showBubble) return;
    setBubbleText(showBubble);
    setBubbleVisible(true);
    setBubbleFading(false);
    const t1 = setTimeout(() => setBubbleFading(true), 2700);
    const t2 = setTimeout(() => setBubbleVisible(false), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [showBubble]);

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`} style={{ width: size }}>
      {bubbleVisible && (
        <div
          className={`absolute bottom-full mb-2 z-10 ${bubbleFading ? 'bubble-exit' : 'bubble-enter'}`}
          style={{ width: Math.max(size * 2.2, 140) }}
        >
          <div className="bg-[#FAF6EE] border border-[#D4B896] rounded-xl px-3 py-2 text-xs text-[#5A3825] leading-relaxed shadow-md relative">
            {bubbleText}
            <div
              className="absolute bottom-[-7px] left-1/2 -translate-x-1/2 w-3 h-3 bg-[#FAF6EE] border-r border-b border-[#D4B896]"
              style={{ transform: 'translateX(-50%) rotate(45deg)' }}
            />
          </div>
        </div>
      )}
      <GroundhogSVG state={state} size={size} />
    </div>
  );
}

// ── The actual SVG ────────────────────────────────────────────────────

function GroundhogSVG({ state, size }: { state: GroundhogEmotion; size: number }) {
  // Color palette
  const C = {
    body:    '#8B6040',
    belly:   '#C49A6C',
    dark:    '#5A3825',
    nose:    '#D4857A',
    eye:     '#1A0F0A',
    eyehi:   '#FFFFFF',
    ear:     '#7A5035',
    earIn:   '#D4857A',
    brand:   '#1A3A5C',
    white:   '#FFFFFF',
    gold:    '#F4C430',
  };

  // Head rotation per state
  const headRot: Partial<Record<GroundhogEmotion, number>> = {
    thinking: -12, waving: 8, sad: 15,
  };
  const hr = headRot[state] ?? 0;

  // Eye shapes per state
  const eyeShape = (state: GroundhogEmotion) => {
    if (state === 'happy' || state === 'excited') return 'curved';
    if (state === 'sleepy') return 'half';
    if (state === 'sad') return 'sad';
    return 'normal';
  };

  const es = eyeShape(state);

  // Animation classes per state
  const bodyClass = state === 'excited' ? 'gh-jump'
    : state === 'sleepy' ? 'gh-breathe'
    : state === 'music' ? 'gh-wobble'
    : '';

  const headClass = state === 'thinking' ? 'gh-wobble'
    : state === 'music' ? 'gh-nod'
    : '';

  const eyeClass = state === 'idle' ? 'gh-blink' : '';
  const armRClass = state === 'waving' ? 'gh-wave' : '';

  return (
    <svg
      viewBox="0 0 100 120"
      width={size}
      height={size * 1.2}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`土拨鼠 - ${state}`}
    >
      {/* ── Tail ── */}
      <ellipse cx="22" cy="95" rx="11" ry="9" fill={C.body} className={bodyClass} />
      <ellipse cx="22" cy="95" rx="8"  ry="6" fill={C.belly} />

      {/* ── Body ── */}
      <g className={bodyClass}>
        <ellipse cx="50" cy="88" rx="28" ry="24" fill={C.body} />
        <ellipse cx="50" cy="92" rx="18" ry="16" fill={C.belly} />

        {/* Feet */}
        <ellipse cx="36" cy="110" rx="10" ry="5" fill={C.dark} />
        <ellipse cx="64" cy="110" rx="10" ry="5" fill={C.dark} />

        {/* Left arm (default down) */}
        <g>
          <path d="M24 82 Q18 90 20 98" stroke={C.body} strokeWidth="7" strokeLinecap="round" fill="none" />
          <circle cx="20" cy="99" r="5" fill={C.body} />
        </g>

        {/* Right arm - waving or thumbsup or default */}
        {state === 'waving' && (
          <g className={armRClass} style={{ transformOrigin: '76px 78px' }}>
            <path d="M76 78 Q86 66 82 56" stroke={C.body} strokeWidth="7" strokeLinecap="round" fill="none" />
            <circle cx="82" cy="54" r="5" fill={C.body} />
            {/* wave fingers */}
            <path d="M80 50 Q83 44 87 46" stroke={C.belly} strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M83 52 Q87 47 90 50" stroke={C.belly} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </g>
        )}
        {state === 'thumbsup' && (
          <g>
            <path d="M76 82 Q88 74 86 62" stroke={C.body} strokeWidth="7" strokeLinecap="round" fill="none" />
            <circle cx="85" cy="60" r="5" fill={C.body} />
            {/* thumb */}
            <path d="M82 58 Q78 50 81 46" stroke={C.belly} strokeWidth="3" strokeLinecap="round" fill="none" />
            <circle cx="81" cy="44" r="3.5" fill={C.belly} />
          </g>
        )}
        {state !== 'waving' && state !== 'thumbsup' && (
          <g>
            <path d="M76 82 Q82 90 80 98" stroke={C.body} strokeWidth="7" strokeLinecap="round" fill="none" />
            <circle cx="80" cy="99" r="5" fill={C.body} />
          </g>
        )}

        {/* Thinking pose: left arm raised with paw on chin */}
        {state === 'thinking' && (
          <g>
            <path d="M24 80 Q16 70 20 62" stroke={C.body} strokeWidth="7" strokeLinecap="round" fill="none" />
            <circle cx="20" cy="60" r="5.5" fill={C.body} />
          </g>
        )}

        {/* Happy: both arms raised */}
        {state === 'happy' && (
          <>
            <path d="M24 78 Q14 66 16 54" stroke={C.body} strokeWidth="7" strokeLinecap="round" fill="none" />
            <circle cx="16" cy="52" r="5" fill={C.body} />
            <path d="M76 78 Q86 66 84 54" stroke={C.body} strokeWidth="7" strokeLinecap="round" fill="none" />
            <circle cx="84" cy="52" r="5" fill={C.body} />
          </>
        )}

        {/* Excited: arms raised high */}
        {state === 'excited' && (
          <>
            <path d="M24 75 Q12 58 14 44" stroke={C.body} strokeWidth="7" strokeLinecap="round" fill="none" />
            <circle cx="14" cy="42" r="5" fill={C.body} />
            <path d="M76 75 Q88 58 86 44" stroke={C.body} strokeWidth="7" strokeLinecap="round" fill="none" />
            <circle cx="86" cy="42" r="5" fill={C.body} />
          </>
        )}
      </g>

      {/* ── Head group ── */}
      <g
        className={headClass}
        style={{ transformOrigin: '50px 56px' }}
        transform={hr !== 0 ? `rotate(${hr}, 50, 56)` : undefined}
      >
        {/* Head */}
        <circle cx="50" cy="48" r="28" fill={C.body} />
        {/* Face */}
        <ellipse cx="50" cy="52" rx="19" ry="16" fill={C.belly} />

        {/* Ears */}
        {state === 'sad' ? (
          <>
            <ellipse cx="28" cy="26" rx="8" ry="10" fill={C.ear} transform="rotate(30,28,26)" />
            <ellipse cx="28" cy="26" rx="5" ry="7" fill={C.earIn} transform="rotate(30,28,26)" />
            <ellipse cx="72" cy="26" rx="8" ry="10" fill={C.ear} transform="rotate(-30,72,26)" />
            <ellipse cx="72" cy="26" rx="5" ry="7" fill={C.earIn} transform="rotate(-30,72,26)" />
          </>
        ) : (
          <>
            <ellipse cx="28" cy="24" rx="8" ry="11" fill={C.ear} transform="rotate(-10,28,24)" />
            <ellipse cx="28" cy="24" rx="5" ry="7.5" fill={C.earIn} transform="rotate(-10,28,24)" />
            <ellipse cx="72" cy="24" rx="8" ry="11" fill={C.ear} transform="rotate(10,72,24)" />
            <ellipse cx="72" cy="24" rx="5" ry="7.5" fill={C.earIn} transform="rotate(10,72,24)" />
          </>
        )}

        {/* Excited ears extra tall */}
        {state === 'excited' && (
          <>
            <ellipse cx="28" cy="20" rx="7" ry="13" fill={C.ear} transform="rotate(-5,28,20)" />
            <ellipse cx="72" cy="20" rx="7" ry="13" fill={C.ear} transform="rotate(5,72,20)" />
          </>
        )}

        {/* Eyes */}
        {es === 'normal' && (
          <g className={eyeClass} style={{ transformOrigin: '50px 48px' }}>
            <circle cx="40" cy="46" r="5.5" fill={C.eye} />
            <circle cx="60" cy="46" r="5.5" fill={C.eye} />
            <circle cx="38.5" cy="44.5" r="1.8" fill={C.eyehi} />
            <circle cx="58.5" cy="44.5" r="1.8" fill={C.eyehi} />
          </g>
        )}
        {es === 'curved' && (
          <>
            <path d="M36 47 Q40 42 44 47" stroke={C.eye} strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M56 47 Q60 42 64 47" stroke={C.eye} strokeWidth="3" strokeLinecap="round" fill="none" />
          </>
        )}
        {es === 'half' && (
          <>
            <path d="M35 47 Q40 44 45 47" stroke={C.eye} strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <ellipse cx="40" cy="47" rx="5" ry="2.5" fill={C.eye} />
            <path d="M55 47 Q60 44 65 47" stroke={C.eye} strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <ellipse cx="60" cy="47" rx="5" ry="2.5" fill={C.eye} />
          </>
        )}
        {es === 'sad' && (
          <>
            <ellipse cx="40" cy="48" rx="5" ry="4" fill={C.eye} />
            <ellipse cx="60" cy="48" rx="5" ry="4" fill={C.eye} />
            <circle cx="38.5" cy="46.5" r="1.5" fill={C.eyehi} />
            <circle cx="58.5" cy="46.5" r="1.5" fill={C.eyehi} />
            {/* sad eyebrows */}
            <path d="M35 40 Q40 43 45 41" stroke={C.dark} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M55 41 Q60 43 65 40" stroke={C.dark} strokeWidth="2" strokeLinecap="round" fill="none" />
          </>
        )}

        {/* Nose */}
        <ellipse cx="50" cy="54" rx="4.5" ry="3" fill={C.nose} />

        {/* Mouth */}
        {state === 'happy' || state === 'excited' || state === 'thumbsup' ? (
          <path d="M43 59 Q50 65 57 59" stroke={C.dark} strokeWidth="2" strokeLinecap="round" fill="none" />
        ) : state === 'sad' ? (
          <path d="M43 62 Q50 58 57 62" stroke={C.dark} strokeWidth="2" strokeLinecap="round" fill="none" />
        ) : state === 'waving' ? (
          <path d="M44 58 Q50 63 56 58" stroke={C.dark} strokeWidth="2" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M44 59 Q50 62 56 59" stroke={C.dark} strokeWidth="1.8" strokeLinecap="round" fill="none" />
        )}

        {/* Whiskers */}
        <path d="M30 53 L44 54" stroke={C.dark} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        <path d="M30 56 L44 56.5" stroke={C.dark} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        <path d="M56 54 L70 53" stroke={C.dark} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        <path d="M56 56.5 L70 56" stroke={C.dark} strokeWidth="1" strokeLinecap="round" opacity="0.5" />

        {/* Headphones (music state) */}
        {state === 'music' && (
          <>
            <path d="M22 42 Q22 18 50 18 Q78 18 78 42" stroke={C.brand} strokeWidth="4" fill="none" strokeLinecap="round" />
            <rect x="16" y="40" width="12" height="16" rx="5" fill={C.brand} />
            <rect x="72" y="40" width="12" height="16" rx="5" fill={C.brand} />
          </>
        )}

        {/* Thinking dots */}
        {state === 'thinking' && (
          <g className="gh-pulse-anim">
            <circle cx="74" cy="28" r="3" fill={C.brand} opacity="0.7" />
            <circle cx="82" cy="20" r="2.2" fill={C.brand} opacity="0.5" />
            <circle cx="87" cy="13" r="1.5" fill={C.brand} opacity="0.3" />
          </g>
        )}

        {/* Excited stars */}
        {state === 'excited' && (
          <>
            <text x="72" y="22" fontSize="10" fill={C.gold} className="gh-pulse-anim">✦</text>
            <text x="15" y="26" fontSize="8"  fill={C.gold} className="gh-pulse-anim">✦</text>
          </>
        )}
      </g>
    </svg>
  );
}

// ── Loading variant (digging animation) ──────────────────────────────

export function GroundhogLoading({ text = '正在思考中...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg viewBox="0 0 100 80" width={80} height={64} fill="none">
          {/* Ground line */}
          <path d="M10 65 Q50 62 90 65" stroke="#8B6040" strokeWidth="3" strokeLinecap="round" />
          {/* Hole */}
          <ellipse cx="50" cy="65" rx="18" ry="6" fill="#5A3825" opacity="0.4" />
          {/* Groundhog body digging */}
          <g className="gh-dig">
            <ellipse cx="50" cy="52" rx="16" ry="18" fill="#8B6040" />
            <ellipse cx="50" cy="56" rx="10" ry="11" fill="#C49A6C" />
            <circle cx="50" cy="38" r="16" fill="#8B6040" />
            <ellipse cx="50" cy="41" rx="11" ry="9" fill="#C49A6C" />
            {/* eyes */}
            <circle cx="44" cy="38" r="3.5" fill="#1A0F0A" />
            <circle cx="56" cy="38" r="3.5" fill="#1A0F0A" />
            <circle cx="43" cy="37" r="1.2" fill="white" />
            <circle cx="55" cy="37" r="1.2" fill="white" />
            {/* nose */}
            <ellipse cx="50" cy="43" rx="3" ry="2" fill="#D4857A" />
            {/* dirt */}
            <circle cx="32" cy="58" r="3" fill="#8B6040" opacity="0.5" />
            <circle cx="68" cy="56" r="2.5" fill="#8B6040" opacity="0.4" />
            <circle cx="38" cy="60" r="2" fill="#8B6040" opacity="0.3" />
          </g>
        </svg>
      </div>
      <p className="text-xs text-gray-400">{text}</p>
    </div>
  );
}
