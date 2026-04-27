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
              className="absolute bottom-[-7px] left-1/2 w-3 h-3 bg-[#FAF6EE] border-r border-b border-[#D4B896]"
              style={{ transform: 'translateX(-50%) rotate(45deg)' }}
            />
          </div>
        </div>
      )}
      <GroundhogSVG state={state} size={size} />
    </div>
  );
}

// ── Color palette (matches logo) ─────────────────────────────────────

const C = {
  ring:    '#7B4721',   // circle border — matches logo ring
  body:    '#A0652A',   // main fur
  bodyDk:  '#8B5420',   // darker fur shading
  belly:   '#C89450',   // lighter face/belly
  bellyLt: '#D8AC6A',   // lightest belly
  earIn:   '#C07060',   // inner ear pink
  nose:    '#3D2010',   // nose
  eye:     '#1A0A00',   // eyes
  eyeHi:   '#FFFFFF',   // eye highlight
  teeth:   '#FFFAF0',   // front teeth
  dirt:    '#7B4721',   // dirt mound (same as ring)
  dirtDk:  '#5A3210',   // dark hole shadow
  dirtLt:  '#9B6030',   // dirt highlight
  cheek:   '#E08070',   // cheek blush
  white:   '#FFFFFF',
  brand:   '#1A3A5C',
  gold:    '#F4C430',
  dark:    '#3D2010',
};

// ── SVG ──────────────────────────────────────────────────────────────

function GroundhogSVG({ state, size }: { state: GroundhogEmotion; size: number }) {

  // ── Per-state config ──────────────────────────────────────────────

  // How high the groundhog peeks out (translateY of whole body group, lower = more hidden)
  const peekY: Partial<Record<GroundhogEmotion, number>> = {
    excited: -10,
    happy:   -4,
    waving:  -4,
    thumbsup:-4,
    idle:    0,
    thinking:0,
    music:   0,
    sleepy:  2,
    sad:     8,
  };
  const py = peekY[state] ?? 0;

  // Head tilt
  const headTilt: Partial<Record<GroundhogEmotion, number>> = {
    thinking: -14, sad: 12, waving: 6,
  };
  const ht = headTilt[state] ?? 0;

  // Body animation class
  const bodyAnim =
    state === 'excited' ? 'gh-jump'
    : state === 'sleepy' ? 'gh-breathe'
    : state === 'music'  ? 'gh-wobble'
    : state === 'sad'    ? 'gh-peek'
    : 'gh-popup';

  const headAnim =
    state === 'thinking' ? 'gh-wobble'
    : state === 'music'  ? 'gh-nod'
    : '';

  // Eye variant
  type EyeShape = 'normal' | 'happy' | 'half' | 'sad';
  const eyeShape: EyeShape =
    state === 'happy' || state === 'excited' || state === 'thumbsup' ? 'happy'
    : state === 'sleepy' ? 'half'
    : state === 'sad'    ? 'sad'
    : 'normal';

  // Mouth
  type MouthShape = 'big' | 'smile' | 'neutral' | 'down';
  const mouthShape: MouthShape =
    state === 'excited'   ? 'big'
    : state === 'happy' || state === 'waving' || state === 'thumbsup' ? 'smile'
    : state === 'sad'     ? 'down'
    : 'neutral';

  const clipId = `gh-clip-${state}`;

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`土拨鼠 - ${state}`}
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Clip everything to the circle */}
        <clipPath id={clipId}>
          <circle cx="60" cy="60" r="54" />
        </clipPath>
      </defs>

      {/* ── White circle background ── */}
      <circle cx="60" cy="60" r="55" fill={C.white} />

      {/* ── Clipped content ── */}
      <g clipPath={`url(#${clipId})`}>

        {/* ── Groundhog body group — moves up/down based on state ── */}
        <g
          className={bodyAnim}
          style={{ transform: `translateY(${py}px)`, transformOrigin: '60px 90px' }}
        >

          {/* Body (sits behind dirt, bottom portion hidden) */}
          <ellipse cx="60" cy="94" rx="30" ry="22" fill={C.body} />
          <ellipse cx="60" cy="98" rx="20" ry="14" fill={C.belly} />

          {/* Left paw (gripping hole edge) */}
          {state !== 'waving' && state !== 'excited' && state !== 'happy' && (
            <g>
              <path d="M32 84 Q26 78 28 70" stroke={C.body} strokeWidth="8" strokeLinecap="round" fill="none" />
              <ellipse cx="28" cy="68" rx="6" ry="5" fill={C.body} />
              <ellipse cx="28" cy="68" rx="4.5" ry="3.5" fill={C.bodyDk} />
            </g>
          )}
          {/* Right paw default */}
          {state !== 'waving' && state !== 'excited' && state !== 'happy' && state !== 'thumbsup' && (
            <g>
              <path d="M88 84 Q94 78 92 70" stroke={C.body} strokeWidth="8" strokeLinecap="round" fill="none" />
              <ellipse cx="92" cy="68" rx="6" ry="5" fill={C.body} />
              <ellipse cx="92" cy="68" rx="4.5" ry="3.5" fill={C.bodyDk} />
            </g>
          )}

          {/* Waving — right arm up */}
          {state === 'waving' && (
            <>
              <g>
                <path d="M32 84 Q26 78 28 70" stroke={C.body} strokeWidth="8" strokeLinecap="round" fill="none" />
                <ellipse cx="28" cy="68" rx="6" ry="5" fill={C.body} />
              </g>
              <g className="gh-wave" style={{ transformOrigin: '88px 80px' }}>
                <path d="M88 84 Q94 72 90 56" stroke={C.body} strokeWidth="8" strokeLinecap="round" fill="none" />
                <circle cx="90" cy="54" r="6" fill={C.body} />
                {/* wave fingers */}
                <path d="M87 50 Q91 44 95 47" stroke={C.belly} strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M90 52 Q95 47 98 51" stroke={C.belly} strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </g>
            </>
          )}

          {/* Happy — both arms up */}
          {state === 'happy' && (
            <>
              <g>
                <path d="M32 84 Q24 70 26 56" stroke={C.body} strokeWidth="8" strokeLinecap="round" fill="none" />
                <circle cx="26" cy="54" r="6" fill={C.body} />
              </g>
              <g>
                <path d="M88 84 Q96 70 94 56" stroke={C.body} strokeWidth="8" strokeLinecap="round" fill="none" />
                <circle cx="94" cy="54" r="6" fill={C.body} />
              </g>
            </>
          )}

          {/* Excited — arms raised high */}
          {state === 'excited' && (
            <>
              <g>
                <path d="M32 84 Q20 64 22 46" stroke={C.body} strokeWidth="8" strokeLinecap="round" fill="none" />
                <circle cx="22" cy="44" r="6" fill={C.body} />
              </g>
              <g>
                <path d="M88 84 Q100 64 98 46" stroke={C.body} strokeWidth="8" strokeLinecap="round" fill="none" />
                <circle cx="98" cy="44" r="6" fill={C.body} />
              </g>
            </>
          )}

          {/* Thumbs up */}
          {state === 'thumbsup' && (
            <>
              <g>
                <path d="M32 84 Q26 78 28 70" stroke={C.body} strokeWidth="8" strokeLinecap="round" fill="none" />
                <ellipse cx="28" cy="68" rx="6" ry="5" fill={C.body} />
              </g>
              <g>
                <path d="M88 84 Q96 74 94 60" stroke={C.body} strokeWidth="8" strokeLinecap="round" fill="none" />
                <circle cx="94" cy="58" r="6" fill={C.body} />
                {/* thumb */}
                <path d="M91 54 Q87 46 90 42" stroke={C.belly} strokeWidth="3.5" strokeLinecap="round" fill="none" />
                <circle cx="90" cy="40" r="4" fill={C.belly} />
              </g>
            </>
          )}

          {/* Thinking — left arm up, paw at chin */}
          {state === 'thinking' && (
            <g>
              <path d="M32 84 Q22 72 24 60" stroke={C.body} strokeWidth="8" strokeLinecap="round" fill="none" />
              <circle cx="24" cy="58" r="6" fill={C.body} />
            </g>
          )}

          {/* ── Head group ── */}
          <g
            className={headAnim}
            style={{
              transform: ht !== 0 ? `rotate(${ht}deg)` : undefined,
              transformOrigin: '60px 60px',
            }}
          >
            {/* Head */}
            <circle cx="60" cy="54" r="28" fill={C.body} />

            {/* Cheeks — wide round like the logo */}
            <ellipse cx="40" cy="62" rx="9" ry="7" fill={C.bodyDk} opacity="0.35" />
            <ellipse cx="80" cy="62" rx="9" ry="7" fill={C.bodyDk} opacity="0.35" />

            {/* Face / muzzle area */}
            <ellipse cx="60" cy="60" rx="20" ry="17" fill={C.belly} />

            {/* Ears */}
            {state === 'sad' ? (
              <>
                <ellipse cx="38" cy="32" rx="9" ry="11" fill={C.body} transform="rotate(20,38,32)" />
                <ellipse cx="38" cy="32" rx="6" ry="7.5" fill={C.earIn} transform="rotate(20,38,32)" />
                <ellipse cx="82" cy="32" rx="9" ry="11" fill={C.body} transform="rotate(-20,82,32)" />
                <ellipse cx="82" cy="32" rx="6" ry="7.5" fill={C.earIn} transform="rotate(-20,82,32)" />
              </>
            ) : state === 'excited' ? (
              <>
                <ellipse cx="38" cy="28" rx="8" ry="13" fill={C.body} transform="rotate(-5,38,28)" />
                <ellipse cx="38" cy="28" rx="5.5" ry="9" fill={C.earIn} transform="rotate(-5,38,28)" />
                <ellipse cx="82" cy="28" rx="8" ry="13" fill={C.body} transform="rotate(5,82,28)" />
                <ellipse cx="82" cy="28" rx="5.5" ry="9" fill={C.earIn} transform="rotate(5,82,28)" />
              </>
            ) : (
              <>
                <ellipse cx="38" cy="31" rx="9" ry="11" fill={C.body} transform="rotate(-8,38,31)" />
                <ellipse cx="38" cy="31" rx="6" ry="7.5" fill={C.earIn} transform="rotate(-8,38,31)" />
                <ellipse cx="82" cy="31" rx="9" ry="11" fill={C.body} transform="rotate(8,82,31)" />
                <ellipse cx="82" cy="31" rx="6" ry="7.5" fill={C.earIn} transform="rotate(8,82,31)" />
              </>
            )}

            {/* ── Eyes ── */}
            {eyeShape === 'normal' && (
              <g className="gh-blink" style={{ transformOrigin: '60px 52px' }}>
                <circle cx="49" cy="52" r="6.5" fill={C.eye} />
                <circle cx="71" cy="52" r="6.5" fill={C.eye} />
                <circle cx="47" cy="50" r="2.2" fill={C.eyeHi} />
                <circle cx="69" cy="50" r="2.2" fill={C.eyeHi} />
                {/* sparkle */}
                <circle cx="53" cy="55" r="1" fill={C.eyeHi} opacity="0.6" />
                <circle cx="75" cy="55" r="1" fill={C.eyeHi} opacity="0.6" />
              </g>
            )}
            {eyeShape === 'happy' && (
              <>
                {/* happy arc eyes — like logo smile */}
                <path d="M43 53 Q49 46 55 53" stroke={C.eye} strokeWidth="3.5" strokeLinecap="round" fill="none" />
                <path d="M65 53 Q71 46 77 53" stroke={C.eye} strokeWidth="3.5" strokeLinecap="round" fill="none" />
              </>
            )}
            {eyeShape === 'half' && (
              <>
                <ellipse cx="49" cy="53" rx="6.5" ry="4" fill={C.eye} />
                <ellipse cx="71" cy="53" rx="6.5" ry="4" fill={C.eye} />
                <circle cx="47" cy="51" r="1.8" fill={C.eyeHi} />
                <circle cx="69" cy="51" r="1.8" fill={C.eyeHi} />
              </>
            )}
            {eyeShape === 'sad' && (
              <>
                <circle cx="49" cy="54" r="6" fill={C.eye} />
                <circle cx="71" cy="54" r="6" fill={C.eye} />
                <circle cx="47" cy="52" r="2" fill={C.eyeHi} />
                <circle cx="69" cy="52" r="2" fill={C.eyeHi} />
                {/* sad brows */}
                <path d="M43 45 Q49 49 55 46" stroke={C.dark} strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M65 46 Q71 49 77 45" stroke={C.dark} strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </>
            )}

            {/* Blush cheeks (visible in happy/excited/waving) */}
            {(state === 'happy' || state === 'excited' || state === 'waving') && (
              <>
                <ellipse cx="42" cy="63" rx="7" ry="4.5" fill={C.cheek} opacity="0.35" />
                <ellipse cx="78" cy="63" rx="7" ry="4.5" fill={C.cheek} opacity="0.35" />
              </>
            )}

            {/* ── Nose ── */}
            <ellipse cx="60" cy="63" rx="5" ry="3.5" fill={C.nose} />
            <ellipse cx="59" cy="62" rx="2" ry="1.2" fill={C.body} opacity="0.3" />

            {/* ── Mouth ── */}
            {mouthShape === 'big' && (
              <>
                <path d="M48 68 Q60 78 72 68" stroke={C.nose} strokeWidth="2.2" strokeLinecap="round" fill="none" />
                {/* teeth */}
                <rect x="54" y="68" width="5" height="6.5" rx="1.5" fill={C.teeth} />
                <rect x="61" y="68" width="5" height="6.5" rx="1.5" fill={C.teeth} />
              </>
            )}
            {mouthShape === 'smile' && (
              <>
                <path d="M50 68 Q60 76 70 68" stroke={C.nose} strokeWidth="2" strokeLinecap="round" fill="none" />
                {/* two front teeth */}
                <rect x="55" y="68" width="4.5" height="5.5" rx="1.2" fill={C.teeth} />
                <rect x="60.5" y="68" width="4.5" height="5.5" rx="1.2" fill={C.teeth} />
              </>
            )}
            {mouthShape === 'neutral' && (
              <path d="M52 68 Q60 72 68 68" stroke={C.nose} strokeWidth="1.8" strokeLinecap="round" fill="none" />
            )}
            {mouthShape === 'down' && (
              <path d="M52 71 Q60 67 68 71" stroke={C.nose} strokeWidth="2" strokeLinecap="round" fill="none" />
            )}

            {/* ── Whiskers ── */}
            <path d="M34 62 L48 63" stroke={C.dark} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
            <path d="M34 65 L48 65.5" stroke={C.dark} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
            <path d="M72 63 L86 62" stroke={C.dark} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
            <path d="M72 65.5 L86 65" stroke={C.dark} strokeWidth="1" strokeLinecap="round" opacity="0.4" />

            {/* ── Headphones (music) ── */}
            {state === 'music' && (
              <>
                <path d="M24 48 Q24 22 60 22 Q96 22 96 48" stroke={C.brand} strokeWidth="4.5" fill="none" strokeLinecap="round" />
                <rect x="16" y="46" width="13" height="17" rx="5.5" fill={C.brand} />
                <rect x="91" y="46" width="13" height="17" rx="5.5" fill={C.brand} />
              </>
            )}

            {/* ── Thinking bubbles ── */}
            {state === 'thinking' && (
              <g className="gh-pulse-anim">
                <circle cx="78" cy="34" r="3.5" fill={C.brand} opacity="0.7" />
                <circle cx="86" cy="26" r="2.5" fill={C.brand} opacity="0.5" />
                <circle cx="91" cy="19" r="1.8" fill={C.brand} opacity="0.3" />
              </g>
            )}

            {/* ── Excited stars ── */}
            {state === 'excited' && (
              <g className="gh-pulse-anim">
                <text x="86" y="26" fontSize="12" fill={C.gold}>✦</text>
                <text x="14" y="30" fontSize="9" fill={C.gold}>✦</text>
                <text x="8" y="50" fontSize="7" fill={C.gold}>✦</text>
              </g>
            )}
          </g>
        </g>

        {/* ── Dirt mound — drawn OVER the body, creates hole illusion ── */}
        {/* Dark hole shadow */}
        <ellipse cx="60" cy="89" rx="40" ry="11" fill={C.dirtDk} opacity="0.55" />
        {/* Main dirt surface */}
        <path
          d="M4 94 Q18 80 40 84 Q60 87 80 84 Q102 80 116 94 L116 130 L4 130 Z"
          fill={C.dirt}
        />
        {/* Dirt highlight (lighter ridge at top of mound) */}
        <path
          d="M8 94 Q22 83 42 86.5 Q60 89.5 78 86.5 Q98 83 112 94"
          stroke={C.dirtLt}
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
        />
        {/* Small dirt clumps for texture */}
        <circle cx="28" cy="90" r="4" fill={C.dirtDk} opacity="0.4" />
        <circle cx="92" cy="89" r="3.5" fill={C.dirtDk} opacity="0.35" />
        <circle cx="45" cy="93" r="2.5" fill={C.dirtDk} opacity="0.3" />
        <circle cx="76" cy="92" r="2" fill={C.dirtDk} opacity="0.3" />

      </g>{/* end clipPath */}

      {/* ── Ring border (drawn last, on top of everything) ── */}
      <circle cx="60" cy="60" r="55" stroke={C.ring} strokeWidth="5.5" fill="none" />

    </svg>
  );
}

// ── Loading variant ───────────────────────────────────────────────────

export function GroundhogLoading({ text = '正在思考中...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 120 120" width={80} height={80} fill="none">
        <defs>
          <clipPath id="gh-load-clip">
            <circle cx="60" cy="60" r="54" />
          </clipPath>
        </defs>

        <circle cx="60" cy="60" r="55" fill="#FFFFFF" />
        <g clipPath="url(#gh-load-clip)">
          {/* Body digging */}
          <g className="gh-dig">
            <ellipse cx="60" cy="90" rx="26" ry="18" fill="#A0652A" />
            <ellipse cx="60" cy="94" rx="17" ry="12" fill="#C89450" />
            {/* Head */}
            <circle cx="60" cy="56" r="26" fill="#A0652A" />
            <ellipse cx="60" cy="62" rx="18" ry="15" fill="#C89450" />
            {/* Eyes */}
            <circle cx="50" cy="53" r="5.5" fill="#1A0A00" />
            <circle cx="70" cy="53" r="5.5" fill="#1A0A00" />
            <circle cx="48" cy="51" r="2" fill="white" />
            <circle cx="68" cy="51" r="2" fill="white" />
            {/* Nose */}
            <ellipse cx="60" cy="63" rx="4" ry="3" fill="#3D2010" />
            {/* Sweat drops (thinking hard) */}
            <ellipse cx="82" cy="44" rx="3" ry="4.5" fill="#7AB4E8" opacity="0.7" className="gh-pulse-anim" />
            <ellipse cx="88" cy="34" rx="2" ry="3.5" fill="#7AB4E8" opacity="0.5" className="gh-pulse-anim" />
          </g>

          {/* Dirt */}
          <ellipse cx="60" cy="89" rx="40" ry="10" fill="#5A3210" opacity="0.5" />
          <path d="M4 94 Q20 80 60 85 Q100 80 116 94 L116 130 L4 130 Z" fill="#7B4721" />
          <path d="M8 94 Q24 83 60 87 Q96 83 112 94" stroke="#9B6030" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6" />
          {/* Dirt clumps flying */}
          <circle cx="22" cy="78" r="4" fill="#7B4721" opacity="0.5" className="gh-pulse-anim" />
          <circle cx="96" cy="76" r="3" fill="#7B4721" opacity="0.4" className="gh-pulse-anim" />
          <circle cx="35" cy="72" r="2.5" fill="#7B4721" opacity="0.35" className="gh-pulse-anim" />
        </g>

        <circle cx="60" cy="60" r="55" stroke="#7B4721" strokeWidth="5.5" fill="none" />
      </svg>
      <p className="text-xs text-gray-400">{text}</p>
    </div>
  );
}
