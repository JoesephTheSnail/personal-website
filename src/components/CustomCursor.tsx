'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const TRAIL = 6;

const TRI: number[] = [
  6, 0,
  6, 0,   0.5, -3,   0.5, -3,
  0.5, -3,   -6, -6,   -6, -6,
  -6, -6,   -6, 6,   -6, 6,
  -6, 6,   6, 0,   6, 0,
];

function buildTriangle(): string {
  return (
    `M${TRI[0]},${TRI[1]} ` +
    `C${TRI[2]},${TRI[3]} ${TRI[4]},${TRI[5]} ${TRI[6]},${TRI[7]} ` +
    `C${TRI[8]},${TRI[9]} ${TRI[10]},${TRI[11]} ${TRI[12]},${TRI[13]} ` +
    `C${TRI[14]},${TRI[15]} ${TRI[16]},${TRI[17]} ${TRI[18]},${TRI[19]} ` +
    `C${TRI[20]},${TRI[21]} ${TRI[22]},${TRI[23]} ${TRI[24]},${TRI[25]}Z`
  );
}

const TRI_PATH = buildTriangle();

// A serif "I" — the classic text-insertion glyph — built the same way as
// the triangle above: one static path, positioned by transform at runtime.
// Native cursor is hidden sitewide (see globals.css `cursor: none`), which
// had been silently swallowing the I-beam over every text field and every
// line of body copy — the triangle just sat there over an input as if it
// were a button. This is what replaces it.
const IBEAM_PATH = 'M-3.5,-9 L3.5,-9 L3.5,-7.2 L0.9,-7.2 L0.9,7.2 L3.5,7.2 L3.5,9 L-3.5,9 L-3.5,7.2 L-0.9,7.2 L-0.9,-7.2 L-3.5,-7.2 Z';

// Elements a person can click, not read or type into — these keep the
// pointer (triangle) treatment. `input`/`textarea` are deliberately absent:
// they're where you type, so they fall through to the text-caret check
// below instead of being treated as a button.
const POINTER_SELECTOR = 'a, button, [role="button"], select, label';
const EDITABLE_SELECTOR =
  'textarea, [contenteditable="true"], [contenteditable=""], ' +
  'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button])' +
  ':not([type=submit]):not([type=reset]):not([type=file]):not([type=color]):not([type=image])';

export default function CustomCursor() {
  const pathname = usePathname();
  const svgRef         = useRef<SVGSVGElement>(null);
  const pathFgRef      = useRef<SVGPathElement>(null);   // var(--fg) layer
  const pathIndigoRef  = useRef<SVGPathElement>(null);   // var(--accent) layer
  const ibeamRef       = useRef<SVGSVGElement>(null);
  const dotRefs        = useRef<(HTMLDivElement | null)[]>([]);
  const dotIndigoRefs  = useRef<(HTMLDivElement | null)[]>([]);
  const [isFine, setIsFine] = useState(false);

  // Native cursor hiding lives once in globals.css (`@media (pointer:
  // fine)`), which is always live — so this listens for the query
  // itself changing (e.g. a 2-in-1 laptop switching between touch and
  // mouse) rather than checking it only once at mount. A stale one-time
  // check here was the cause of the cursor going fully invisible on
  // those devices: the CSS hid the native cursor (still live/correct),
  // but this component had already decided isFine=false at mount and
  // never rendered the replacement.
  useEffect(() => {
    const mql = window.matchMedia('(pointer: fine)');
    setIsFine(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsFine(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!isFine) return;

    const mouse = { x: 0, y: 0 };
    const cur   = { x: 0, y: 0 };
    const dots: { x: number; y: number }[] = Array.from({ length: TRAIL }, () => ({ x: 0, y: 0 }));
    let rafId: number;
    let _visible = false;
    let _pointer = false;
    let _hidden  = false;
    let _text    = false;
    let _clicking   = false;
    let _clickScale = 1.0;
    let _hoverScale = 1.0;
    // 0 = fg color, 1 = indigo — lerps smoothly
    let colorT = 0;
    // 0 = pointer/arrow glyph, 1 = I-beam — lerps a bit faster than colorT:
    // this is a mode switch (point vs. type), not a hover tint, and should
    // read as responsive rather than dreamy.
    let textT = 0;

    // Reused per move rather than allocated fresh each time.
    const caretDetect: (x: number, y: number) => boolean = (() => {
      const withPosition = document as unknown as {
        caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node } | null;
      };
      const withRange = document as unknown as {
        caretRangeFromPoint?: (x: number, y: number) => Range | null;
      };
      if (typeof withPosition.caretPositionFromPoint === 'function') {
        return (x, y) => {
          const node = withPosition.caretPositionFromPoint!(x, y)?.offsetNode;
          return node?.nodeType === Node.TEXT_NODE && !!node.textContent?.trim();
        };
      }
      if (typeof withRange.caretRangeFromPoint === 'function') {
        return (x, y) => {
          const node = withRange.caretRangeFromPoint!(x, y)?.startContainer;
          return node?.nodeType === Node.TEXT_NODE && !!node.textContent?.trim();
        };
      }
      // Neither API exists (very old browser) — never claim a text cursor.
      return () => false;
    })();

    const onDown  = () => { _clicking = true; };
    const onUp    = () => { _clicking = false; };
    const onLeave = () => { _visible = false; };
    const onEnter = () => { _visible = true; };

    // Hit-testing (elementFromPoint + caret lookup) forces style/layout, and
    // a high-polling mouse fires mousemove far faster than the screen can
    // paint. Doing it per event meant that while a new page was mounting
    // the handler piled layout work onto an already-busy main thread — and
    // since the native cursor is hidden, a stalled thread reads as a frozen
    // mouse. The event now only records the position; the hit test runs at
    // most once per frame, from `tick`.
    let _needsHitTest = false;

    const onMove = (e: MouseEvent) => {
      mouse.x  = e.clientX;
      mouse.y  = e.clientY;
      _visible = true;
      _needsHitTest = true;
    };

    const hitTest = () => {
      _needsHitTest = false;
      const el = document.elementFromPoint(mouse.x, mouse.y);
      _pointer = !!el?.closest(POINTER_SELECTOR);
      _hidden  = !!el?.closest('[data-hide-cursor]') && !_pointer;

      // Text mode never applies over something clickable or explicitly
      // hidden — a link made of text still gets the pointer treatment.
      _text = !_pointer && !_hidden && (
        !!el?.closest(EDITABLE_SELECTOR) || caretDetect(mouse.x, mouse.y)
      );
    };

    const tick = () => {
      if (_needsHitTest) hitTest();

      // The pointer itself (triangle / I-beam, below) is pinned to the real
      // mouse position every frame — any easing on the thing you're aiming
      // with reads as input lag. Only the trailing dots ease toward it, which
      // is what keeps the comet-tail feel without delaying the pointer.

      cur.x += (mouse.x - cur.x) * 0.42;
      cur.y += (mouse.y - cur.y) * 0.42;

      dots[0].x += (cur.x - dots[0].x) * 0.55;
      dots[0].y += (cur.y - dots[0].y) * 0.55;
      for (let i = 1; i < TRAIL; i++) {
        dots[i].x += (dots[i - 1].x - dots[i].x) * 0.45;
        dots[i].y += (dots[i - 1].y - dots[i].y) * 0.45;
      }

      const vis = _visible && !_hidden;

      // Smooth color lerp — slow enough to feel like a fade (~0.06 = ~300ms half-life)
      const colorTarget = _pointer && vis ? 1 : 0;
      colorT += (colorTarget - colorT) * 0.06;

      // Mode switch, not a tint — settles in ~5-6 frames rather than colorT's
      // ~15-20, so swapping to the I-beam reads as immediate feedback.
      textT += ((_text && vis ? 1 : 0) - textT) * 0.22;

      _hoverScale += ((_pointer && vis ? 1.12 : 1.0) - _hoverScale) * 0.1;
      _clickScale += ((_clicking ? 0.8 : 1.0) - _clickScale) * 0.28;
      const totalScale = _hoverScale * _clickScale;

      if (svgRef.current && pathFgRef.current && pathIndigoRef.current) {
        svgRef.current.style.transform = `translate(${mouse.x}px, ${mouse.y}px) scale(${totalScale.toFixed(3)})`;
        svgRef.current.style.opacity   = vis ? String(+(1 - textT).toFixed(3)) : '0';

        // Cross-fade between fg and indigo by blending fillOpacity of each layer
        pathFgRef.current.setAttribute('fill-opacity',     String(+(1 - colorT).toFixed(3)));
        pathIndigoRef.current.setAttribute('fill-opacity', String(+colorT.toFixed(3)));
      }

      if (ibeamRef.current) {
        ibeamRef.current.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;
        ibeamRef.current.style.opacity   = vis ? String(+textT.toFixed(3)) : '0';
      }

      // The comet trail is a pointer-personality flourish — it fades out
      // alongside the triangle rather than trailing behind an I-beam, which
      // would read as decorative noise while reading or typing.
      dotRefs.current.forEach((el, i) => {
        if (!el) return;
        el.style.transform = `translate(${dots[i].x}px, ${dots[i].y}px)`;
        el.style.opacity   = vis ? String(+((1 - i / TRAIL) * 0.13 * (1 - colorT) * (1 - textT)).toFixed(3)) : '0';
      });
      dotIndigoRefs.current.forEach((el, i) => {
        if (!el) return;
        el.style.transform = `translate(${dots[i].x}px, ${dots[i].y}px)`;
        el.style.opacity   = vis ? String(+((1 - i / TRAIL) * 0.13 * colorT * (1 - textT)).toFixed(3)) : '0';
      });

      // Everything has eased onto its target (sub-pixel, sub-0.2% opacity): stop
      // the loop instead of rewriting identical styles 60 times a second while
      // the pointer is still. Any pointer event wakes it again.
      const near = (a: number, b: number, eps: number) => Math.abs(a - b) < eps;
      const settled =
        !_needsHitTest &&
        near(mouse.x, cur.x, 0.05) && near(mouse.y, cur.y, 0.05) &&
        dots.every((d, i) => near(d.x, i === 0 ? cur.x : dots[i - 1].x, 0.05) && near(d.y, i === 0 ? cur.y : dots[i - 1].y, 0.05)) &&
        near(colorT, colorTarget, 0.002) &&
        near(textT, _text && vis ? 1 : 0, 0.002) &&
        near(_hoverScale, _pointer && vis ? 1.12 : 1.0, 0.002) &&
        near(_clickScale, _clicking ? 0.8 : 1.0, 0.002);
      if (settled) {
        running = false;
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    let running = true;
    const wake = () => {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(tick);
    };
    const onMoveWake  = (e: MouseEvent) => { onMove(e); wake(); };
    const onLeaveWake = () => { onLeave(); wake(); };
    const onEnterWake = () => { onEnter(); wake(); };
    const onDownWake  = () => { onDown(); wake(); };
    const onUpWake    = () => { onUp(); wake(); };

    document.addEventListener('mousemove',  onMoveWake);
    document.addEventListener('mouseleave', onLeaveWake);
    document.addEventListener('mouseenter', onEnterWake);
    document.addEventListener('mousedown',  onDownWake);
    document.addEventListener('mouseup',    onUpWake);
    rafId = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener('mousemove',  onMoveWake);
      document.removeEventListener('mouseleave', onLeaveWake);
      document.removeEventListener('mouseenter', onEnterWake);
      document.removeEventListener('mousedown',  onDownWake);
      document.removeEventListener('mouseup',    onUpWake);
      running = true; // block a late wake() from restarting a torn-down loop
      cancelAnimationFrame(rafId);
    };
  }, [isFine]);

  // The trailing-dot animation reads as laggy/"bugged" against a WebGL
  // canvas being drag-orbited — the native cursor's grab/grabbing feedback
  // is what that interaction actually needs, so full-bleed 3D previews opt
  // out the same way they already opt out of the sidebar nav.
  if (!isFine || pathname?.startsWith('/dev-preview') || /^\/projects\/[^/]+\/demo\/?$/.test(pathname ?? '')) return null;

  return (
    <>
      {/* fg-colored dot trail */}
      {Array.from({ length: TRAIL }, (_, i) => {
        const size = Math.max(2, 4.5 - i * 0.5);
        return (
          <div
            key={`dot-fg-${i}`}
            ref={(el) => { dotRefs.current[i] = el; }}
            className="fixed top-0 left-0 pointer-events-none z-[9997]"
            style={{ width: size, height: size, marginLeft: -(size / 2), marginTop: -(size / 2), borderRadius: '50%', background: 'var(--fg)', opacity: 0, willChange: 'transform, opacity' }}
          />
        );
      })}

      {/* indigo-colored dot trail */}
      {Array.from({ length: TRAIL }, (_, i) => {
        const size = Math.max(2, 4.5 - i * 0.5);
        return (
          <div
            key={`dot-indigo-${i}`}
            ref={(el) => { dotIndigoRefs.current[i] = el; }}
            className="fixed top-0 left-0 pointer-events-none z-[9997]"
            style={{ width: size, height: size, marginLeft: -(size / 2), marginTop: -(size / 2), borderRadius: '50%', background: 'var(--accent)', opacity: 0, willChange: 'transform, opacity' }}
          />
        );
      })}

      <svg
        ref={svgRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{ opacity: 0, willChange: 'transform, opacity', width: 22, height: 22, marginLeft: -11, marginTop: -11, overflow: 'visible', filter: 'drop-shadow(0 0 1.5px rgba(0,0,0,0.9))' }}
        viewBox="-11 -11 22 22"
      >
        {/* fg layer */}
        <path ref={pathFgRef}     d={TRI_PATH} fill="var(--fg)"     fillOpacity={1} stroke="none" />
        {/* indigo layer fades in on hover */}
        <path ref={pathIndigoRef} d={TRI_PATH} fill="var(--accent)" fillOpacity={0} stroke="none" />
      </svg>

      {/* Text-insertion cursor — cross-fades with the triangle above rather
          than sitting inside the same <svg>, since it never needs the
          indigo/hover treatment and never scales on hover/click. */}
      <svg
        ref={ibeamRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{ opacity: 0, willChange: 'transform, opacity', width: 12, height: 22, marginLeft: -6, marginTop: -11, overflow: 'visible', filter: 'drop-shadow(0 0 1.5px rgba(0,0,0,0.9))' }}
        viewBox="-6 -11 12 22"
      >
        <path d={IBEAM_PATH} fill="var(--fg)" fillOpacity={0.85} stroke="none" />
      </svg>
    </>
  );
}
