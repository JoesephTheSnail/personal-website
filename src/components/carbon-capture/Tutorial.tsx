'use client';

// ---------------------------------------------------------------------------
// First-visit tutorial.
//
// Five short steps that wait for you to actually do the thing (drag, zoom,
// tap a part, press Next) instead of making you read and click "next" through
// slides. The wording and the gestures shown follow the device: touch devices
// are taught one- and two-finger gestures, mouse + keyboard devices are taught
// drag, scroll and the arrow keys.
//
//  - There is one Skip button for the whole tutorial (and Esc does the same).
//  - It shows once; the choice is remembered in localStorage.
//  - The "?" button next to the sound button replays it.
//  - If someone doesn't do a step within ~15 s it moves on by itself, so it
//    can never trap anyone.
//  - It never blocks the scene: the dimming layer ignores pointer events, so
//    dragging, pinching and tapping all still work underneath it.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

const DONE_KEY = 'cc-tutorial-done';
const STEP_TIMEOUT_MS = 15000;
const CONTROLS_TIMEOUT_MS = 20000;
const START_DELAY_MS = 1400;
const ADVANCE_DELAY_MS = 520;
const ACCENT = '#e2883f';

type Mode = 'touch' | 'mouse';
type TargetKey = 'guide' | 'nav' | 'controls';
type StepId = 'orbit' | 'zoom' | 'tap' | 'next' | 'controls';

type StepDef = {
  id: StepId;
  target?: TargetKey;
  title: string;
  body: (mode: Mode, ctx: { hasFullscreen: boolean }) => string;
};

const STEPS: StepDef[] = [
  {
    id: 'orbit',
    title: 'Look around',
    body: (m) => (m === 'touch' ? 'Drag with one finger to turn the model.' : 'Click and drag to turn the model.'),
  },
  {
    id: 'zoom',
    title: 'Zoom in and out',
    body: (m) => (m === 'touch' ? 'Pinch with two fingers to get closer or further away.' : 'Scroll to get closer or further away.'),
  },
  {
    id: 'tap',
    target: 'guide',
    title: '', // device-dependent, see TAP_TITLE
    body: (m) =>
      m === 'touch'
        ? 'Tap anything to see what it does. This guide will tell you.'
        : 'Click anything to see what it does. This guide will tell you.',
  },
  {
    id: 'next',
    target: 'nav',
    title: 'Move through the tour',
    body: (m) => (m === 'touch' ? 'Tap Next to go on to the next stage.' : 'Click Next, or press the right arrow key.'),
  },
  {
    id: 'controls',
    target: 'controls',
    title: 'Controls up here',
    body: (_m, { hasFullscreen }) =>
      hasFullscreen
        ? 'Turn the sound off, go full screen, or replay this with the ? button.'
        : 'Turn the sound off, or replay this with the ? button.',
  },
];
// the "tap a part" step's title depends on the device
const TAP_TITLE: Record<Mode, string> = { touch: 'Tap a part', mouse: 'Click a part' };

function detectMode(): Mode {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'mouse';
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches ? 'touch' : 'mouse';
}

function readDone() {
  try {
    return window.localStorage.getItem(DONE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeDone() {
  try {
    window.localStorage.setItem(DONE_KEY, '1');
  } catch {
    /* private mode: it just shows again next visit */
  }
}

type Rect = { left: number; top: number; width: number; height: number };

/** Live viewport rect of the element tagged data-tour="<key>". */
function useTargetRect(key: TargetKey | undefined, enabled: boolean) {
  const [rect, setRect] = useState<Rect | null>(null);
  useEffect(() => {
    if (!enabled || !key) {
      setRect(null);
      return;
    }
    const measure = () => {
      const el = document.querySelector(`[data-tour="${key}"]`);
      if (!el) return setRect(null);
      const r = el.getBoundingClientRect();
      setRect((prev) =>
        prev && prev.left === r.left && prev.top === r.top && prev.width === r.width && prev.height === r.height
          ? prev
          : { left: r.left, top: r.top, width: r.width, height: r.height },
      );
    };
    measure();
    const id = window.setInterval(measure, 250);
    window.addEventListener('resize', measure);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', measure);
    };
  }, [key, enabled]);
  return rect;
}

// ---- tiny looping gesture demos --------------------------------------------

// Chrome's forced dark mode darkens any CSS *background* lighter than ~205
// brightness, which would turn white knobs and pale progress dots invisible on
// this dark card. So backgrounds here stay at or below that (soft grey, not
// white); light colours are only used for text and SVG strokes, which it leaves alone.
const KNOB = '#c3c8ce';
const TRACK = '#5b6068';

const demoBox: CSSProperties = { width: 52, height: 52, flex: 'none', position: 'relative' };
const dot = (extra: CSSProperties): CSSProperties => ({
  position: 'absolute',
  width: 14,
  height: 14,
  borderRadius: '50%',
  background: KNOB,
  left: 19,
  top: 19,
  ...extra,
});

function Demo({ id, mode, done }: { id: StepId; mode: Mode; done: boolean }) {
  if (done) {
    // a thin check that draws itself, in a soft tone, instead of a green badge popping in
    return (
      <div style={{ ...demoBox, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9fe0bd" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" strokeOpacity={0.55} strokeDasharray="63" strokeDashoffset="63" data-cc-anim style={{ animation: 'cc-tut-draw 0.42s cubic-bezier(0.4, 0, 0.2, 1) forwards' }} />
          <path d="M7.6 12.4l3 3 5.8-6.6" strokeDasharray="16" strokeDashoffset="16" data-cc-anim style={{ animation: 'cc-tut-draw 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.22s forwards' }} />
        </svg>
      </div>
    );
  }
  let inner: ReactNode = null;
  if (id === 'orbit') {
    inner = (
      <>
        <div style={{ position: 'absolute', left: 6, right: 6, top: 25, height: 2, borderRadius: 1, background: TRACK }} />
        <div data-cc-anim style={dot({ animation: 'cc-tut-drag 1.6s ease-in-out infinite alternate' })} />
      </>
    );
  } else if (id === 'zoom' && mode === 'touch') {
    inner = (
      <>
        <div data-cc-anim style={dot({ width: 12, height: 12, left: 20, top: 20, animation: 'cc-tut-pinch-l 1.4s ease-in-out infinite alternate' })} />
        <div data-cc-anim style={dot({ width: 12, height: 12, left: 20, top: 20, animation: 'cc-tut-pinch-r 1.4s ease-in-out infinite alternate' })} />
      </>
    );
  } else if (id === 'zoom') {
    inner = (
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="#fff" strokeWidth={2} aria-hidden="true">
        <rect x="17" y="8" width="18" height="30" rx="9" />
        <path d="M26 8v10" strokeOpacity={0.5} />
        <rect data-cc-anim x="24.2" y="13" width="3.6" height="7" rx="1.8" fill="#fff" stroke="none" style={{ animation: 'cc-tut-wheel 1.1s ease-in-out infinite' }} />
      </svg>
    );
  } else if (id === 'tap') {
    inner = (
      <>
        <div data-cc-anim style={dot({ width: 30, height: 30, left: 11, top: 11, background: 'transparent', border: `2px solid ${KNOB}`, animation: 'cc-tut-tap 1.4s ease-out infinite' })} />
        <div style={dot({ width: 10, height: 10, left: 21, top: 21 })} />
      </>
    );
  } else if (id === 'next') {
    inner = (
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <g data-cc-anim style={{ animation: 'cc-tut-nudge 1.1s ease-in-out infinite' }}>
          <path d="M12 26h26M30 17l9 9-9 9" />
        </g>
      </svg>
    );
  } else {
    inner = (
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="26" r="8" />
        <circle cx="40" cy="26" r="8" />
        <path d="M9 24.5v3h2l2.5 2v-7L11 24.5H9z" fill="#fff" fillOpacity={0.4} strokeWidth={1.4} />
        <path d="M37 22.5h3.5v3.5M43 29.5h-3.5V26" strokeWidth={1.6} />
      </svg>
    );
  }
  return (
    <div style={demoBox} aria-hidden="true">
      {inner}
    </div>
  );
}

// ---- the component ----------------------------------------------------------

export default function Tutorial({
  compact,
  hidden,
  selectedPart,
  stepIndex,
  run,
}: {
  /** phone/tablet — tighter card */
  compact: boolean;
  /** true while something else (the rotate gate) covers the scene */
  hidden: boolean;
  selectedPart: string | null;
  stepIndex: number;
  /** bumped by the "?" button to replay */
  run: number;
}) {
  const [active, setActive] = useState(false);
  const [idx, setIdx] = useState(0);
  const [ok, setOk] = useState(false);
  const [mode, setMode] = useState<Mode>('mouse');
  const [hasFullscreen, setHasFullscreen] = useState(false);

  const advancing = useRef(false);
  const baseline = useRef({ selectedPart, stepIndex });
  const latest = useRef({ selectedPart, stepIndex });
  latest.current = { selectedPart, stepIndex };

  useEffect(() => setMode(detectMode()), []);

  // replay
  useEffect(() => {
    if (run > 0) {
      setMode(detectMode()); // re-check: a tablet may have gained/lost a keyboard
      advancing.current = false;
      setOk(false);
      setIdx(0);
      setActive(true);
    }
  }, [run]);

  // first visit: start once the scene has settled, and not under the rotate gate
  useEffect(() => {
    if (run > 0 || active || hidden || readDone()) return;
    const t = window.setTimeout(() => setActive(true), START_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [run, active, hidden]);

  const finish = () => {
    writeDone();
    advancing.current = false;
    setActive(false);
    setOk(false);
  };

  const advance = (viaTimeout = false) => {
    if (advancing.current) return;
    advancing.current = true;
    const last = idx >= STEPS.length - 1;
    const go = () => {
      advancing.current = false;
      setOk(false);
      if (last) finish();
      else setIdx((i) => i + 1);
    };
    if (viaTimeout) go();
    else {
      setOk(true);
      window.setTimeout(go, ADVANCE_DELAY_MS);
    }
  };

  const running = active && !hidden;
  const step = STEPS[idx];

  // new step: remember where things stood, and check what's on screen
  useEffect(() => {
    if (!running) return;
    baseline.current = { ...latest.current };
    setHasFullscreen(Boolean(document.querySelector('[aria-label="Enter full screen"]')));
  }, [running, idx]);

  // gestures: orbit (drag), zoom (pinch or wheel)
  useEffect(() => {
    if (!running || (step.id !== 'orbit' && step.id !== 'zoom')) return;
    const pts = new Map<number, { x: number; y: number }>();
    let travel = 0;
    let wheelTotal = 0;
    let pinch0 = 0;
    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      advance();
    };
    const onCanvas = (t: EventTarget | null) => typeof HTMLCanvasElement !== 'undefined' && t instanceof HTMLCanvasElement;
    const spread = () => {
      const [a, b] = [...pts.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const down = (e: PointerEvent) => {
      if (!onCanvas(e.target)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) pinch0 = spread();
    };
    const move = (e: PointerEvent) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (step.id === 'orbit' && pts.size === 1) {
        travel += Math.hypot(dx, dy);
        if (travel > 70) fire();
      } else if (step.id === 'zoom' && pts.size === 2 && Math.abs(spread() - pinch0) > 40) fire();
    };
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
    };
    const wheel = (e: WheelEvent) => {
      if (step.id !== 'zoom' || !onCanvas(e.target)) return;
      wheelTotal += Math.abs(e.deltaY) + Math.abs(e.deltaX);
      if (wheelTotal > 80) fire();
    };
    window.addEventListener('pointerdown', down, true);
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
    window.addEventListener('wheel', wheel, { capture: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', down, true);
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
      window.removeEventListener('wheel', wheel, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, idx]);

  // tap a part / press Next: watch the scene's own state
  useEffect(() => {
    if (!running) return;
    if (step.id === 'tap' && selectedPart && selectedPart !== baseline.current.selectedPart) advance();
    if (step.id === 'next' && stepIndex !== baseline.current.stepIndex) advance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPart, stepIndex, running, idx]);

  // never trap anyone: move on if nothing happens
  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(
      () => (step.id === 'controls' ? finish() : advance(true)),
      step.id === 'controls' ? CONTROLS_TIMEOUT_MS : STEP_TIMEOUT_MS,
    );
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, idx]);

  // Esc skips the whole thing
  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const rect = useTargetRect(step.target, running);
  // keep the last spotlight around (faded out) when a step has none, so the
  // dimming eases away instead of vanishing in one frame
  const lastRect = useRef<Rect | null>(null);
  if (rect) lastRect.current = rect;
  const ringRect = rect ?? lastRect.current;

  if (!running) return null;

  const title = step.id === 'tap' ? TAP_TITLE[mode] : step.title;
  const isLast = idx === STEPS.length - 1;
  const pad = 7;

  return (
    <>
      {ringRect && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 1490,
            opacity: rect ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        >
          <div
            data-cc-anim
            style={{
              position: 'absolute',
              left: ringRect.left - pad,
              top: ringRect.top - pad,
              width: ringRect.width + pad * 2,
              height: ringRect.height + pad * 2,
              borderRadius: 16,
              // the huge shadow dims everything outside the highlighted control
              boxShadow: `0 0 0 9999px rgba(10,12,16,0.42), 0 0 0 2px ${ACCENT}`,
              transition: 'left 0.45s cubic-bezier(0.22, 1, 0.36, 1), top 0.45s cubic-bezier(0.22, 1, 0.36, 1), width 0.45s cubic-bezier(0.22, 1, 0.36, 1), height 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
              animation: 'cc-tut-ring 1.8s ease-in-out infinite',
            }}
          />
        </div>
      )}
      {/* the wrapper does the centring: the card's own entrance animation
          sets `transform`, which would otherwise wipe out a translateX(-50%) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: compact ? 92 : 112,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 1500,
        }}
      >
      <div
        role="region"
        aria-label="Tutorial"
        aria-live="polite"
        style={{
          pointerEvents: 'auto',
          width: 'min(340px, max(244px, calc(100vw - 440px)))',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: compact ? 8 : 10,
          padding: compact ? '13px 12px 10px' : '16px 16px 13px',
          position: 'relative',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.14)',
          background: 'rgba(21,23,26,0.94)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          color: '#fff',
          fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif',
          animation: 'cc-facts-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        }}
      >
        {/* accent edge as a background, not a border: forced dark mode dims coloured borders */}
        <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 3, borderRadius: '14px 14px 0 0', background: ACCENT }} />
        <div key={idx} data-cc-anim style={{ display: 'flex', alignItems: 'center', gap: 12, animation: 'cc-tut-swap 0.38s cubic-bezier(0.22, 1, 0.36, 1) both' }}>
          <Demo id={step.id} mode={mode} done={ok} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <div style={{ fontSize: compact ? 13.5 : 15, fontWeight: 650, letterSpacing: '0.005em' }}>{title}</div>
            <div style={{ fontSize: compact ? 12 : 13, lineHeight: 1.42, color: 'rgba(255,255,255,0.8)' }}>
              {step.body(mode, { hasFullscreen })}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', gap: 5 }} aria-label={`Step ${idx + 1} of ${STEPS.length}`}>
            {STEPS.map((s, i) => (
              <span
                key={s.id}
                style={{
                  width: i === idx ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === idx ? ACCENT : i < idx ? 'rgba(226,136,63,0.5)' : TRACK,
                  transition: 'width 0.25s ease, background 0.25s ease',
                }}
              />
            ))}
          </div>
          {isLast ? (
            <button
              type="button"
              onClick={finish}
              style={{
                minHeight: 36,
                padding: '0 16px',
                borderRadius: 999,
                border: 'none',
                background: ACCENT,
                color: '#1a1206',
                fontWeight: 700,
                fontSize: 13,
                fontFamily: 'inherit',
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              Got it
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              style={{
                minHeight: 36,
                padding: '0 14px',
                borderRadius: 999,
                // a solid pill, not bare text: it has to stay visible whatever the
                // browser does to colours (see KNOB above)
                border: '1px solid #6a7078',
                background: '#2d3136',
                color: '#e9ebee',
                fontSize: 12.5,
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              Skip tutorial
            </button>
          )}
        </div>
      </div>
      </div>
    </>
  );
}

/** "?" — replays the tutorial. Sits with the sound / full-screen buttons. */
export function TutorialHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Replay tutorial"
      title="Replay tutorial"
      style={{
        flex: 'none',
        width: 40,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.14)',
        background: 'rgba(21,23,26,0.78)',
        backdropFilter: 'blur(6px)',
        color: '#fff',
        cursor: 'pointer',
        padding: 0,
        touchAction: 'manipulation',
        fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif',
        fontSize: 17,
        fontWeight: 700,
      }}
    >
      ?
    </button>
  );
}
