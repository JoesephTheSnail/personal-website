'use client';

import { useEffect, useRef, useState } from 'react';

const TRAIL = 7;
const K = 0.5523; // cubic bezier circle approximation constant
const R = 8.5;
const RK = R * K; // ≈ 4.69

// Flat array: M(2) + 4×C(6) = 26 coords
// Triangle: right-pointing, centered around origin
const TRI: number[] = [
  6, 0,                          // M — tip
  6, 0,   0.5, -3,   0.5, -3,   // C1: tip → mid of top edge
  0.5, -3,   -6, -6,   -6, -6,  // C2: mid top → top-left vertex
  -6, -6,   -6, 6,   -6, 6,     // C3: top-left → bottom-left
  -6, 6,   6, 0,   6, 0,        // C4: bottom-left → tip
];

// Circle: radius R, centered at origin, 4 cubic bezier arcs
const CIR: number[] = [
  R, 0,                           // M — rightmost point
  R, RK,   RK, R,   0, R,        // C1: right → bottom
  -RK, R,   -R, RK,   -R, 0,     // C2: bottom → left
  -R, -RK,   -RK, -R,   0, -R,   // C3: left → top
  RK, -R,   R, -RK,   R, 0,      // C4: top → right
];

function buildPath(t: number): string {
  const p = TRI.map((v, i) => +(v + (CIR[i] - v) * t).toFixed(3));
  return (
    `M${p[0]},${p[1]} ` +
    `C${p[2]},${p[3]} ${p[4]},${p[5]} ${p[6]},${p[7]} ` +
    `C${p[8]},${p[9]} ${p[10]},${p[11]} ${p[12]},${p[13]} ` +
    `C${p[14]},${p[15]} ${p[16]},${p[17]} ${p[18]},${p[19]} ` +
    `C${p[20]},${p[21]} ${p[22]},${p[23]} ${p[24]},${p[25]}Z`
  );
}

export default function CustomCursor() {
  const svgRef        = useRef<SVGSVGElement>(null);
  const pathRef       = useRef<SVGPathElement>(null);
  const dotRefs       = useRef<(HTMLDivElement | null)[]>([]);
  const ringTrailRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isFine, setIsFine] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    setIsFine(fine);
    if (fine) {
      const s = document.createElement('style');
      s.id = 'cursor-none';
      s.textContent = '*, *::before, *::after { cursor: none !important; }';
      document.head.appendChild(s);
      return () => { document.getElementById('cursor-none')?.remove(); };
    }
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
    let mode = 0; // 0 = triangle, 1 = circle — lerped each frame

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      _visible = true;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      _pointer = !!el?.closest('a, button, [role="button"], input, select, textarea, label');
      _hidden  = !!el?.closest('[data-hide-cursor]') && !_pointer;
    };
    const onLeave = () => { _visible = false; };
    const onEnter = () => { _visible = true; };

    const tick = () => {
      cur.x += (mouse.x - cur.x) * 0.42;
      cur.y += (mouse.y - cur.y) * 0.42;

      dots[0].x += (cur.x - dots[0].x) * 0.55;
      dots[0].y += (cur.y - dots[0].y) * 0.55;
      for (let i = 1; i < TRAIL; i++) {
        dots[i].x += (dots[i - 1].x - dots[i].x) * 0.45;
        dots[i].y += (dots[i - 1].y - dots[i].y) * 0.45;
      }

      const vis = _visible && !_hidden;

      // Smooth lerp toward target mode — produces a physical morph, not a fade
      mode += ((vis && _pointer ? 1 : 0) - mode) * 0.12;
      const inv = 1 - mode;

      if (svgRef.current && pathRef.current) {
        svgRef.current.style.transform = `translate(${cur.x}px, ${cur.y}px)`;
        svgRef.current.style.opacity   = vis ? String(0.78 * inv + 0.65 * mode) : '0';

        // Morph the path between triangle and circle
        pathRef.current.setAttribute('d', buildPath(mode));
        // Triangle is filled; circle is stroked — crossfade the two representations
        pathRef.current.setAttribute('fill-opacity',   String(+inv.toFixed(3)));
        pathRef.current.setAttribute('stroke-opacity', String(+mode.toFixed(3)));
        pathRef.current.setAttribute('stroke-width',   String(+(mode * 1.5).toFixed(3)));
      }

      dotRefs.current.forEach((el, i) => {
        if (!el) return;
        el.style.transform = `translate(${dots[i].x}px, ${dots[i].y}px)`;
        el.style.opacity   = vis ? String((1 - i / TRAIL) * 0.22 * inv) : '0';
      });
      ringTrailRefs.current.forEach((el, i) => {
        if (!el) return;
        el.style.transform = `translate(${dots[i].x}px, ${dots[i].y}px)`;
        el.style.opacity   = vis ? String((1 - i / TRAIL) * 0.18 * mode) : '0';
      });

      rafId = requestAnimationFrame(tick);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);
    rafId = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      cancelAnimationFrame(rafId);
    };
  }, [isFine]);

  if (!isFine) return null;

  return (
    <>
      {/* Dot trail (triangle mode) */}
      {Array.from({ length: TRAIL }, (_, i) => {
        const size = Math.max(2, 5 - i * 0.45);
        return (
          <div
            key={`dot-${i}`}
            ref={(el) => { dotRefs.current[i] = el; }}
            className="fixed top-0 left-0 pointer-events-none z-[9997]"
            style={{ width: size, height: size, marginLeft: -(size / 2), marginTop: -(size / 2), borderRadius: '50%', background: 'var(--fg)', opacity: 0, willChange: 'transform, opacity' }}
          />
        );
      })}

      {/* Ring trail (pointer mode) */}
      {Array.from({ length: TRAIL }, (_, i) => {
        const s = Math.max(10, 22 - i * 1.5);
        return (
          <div
            key={`ring-${i}`}
            ref={(el) => { ringTrailRefs.current[i] = el; }}
            className="fixed top-0 left-0 pointer-events-none z-[9997]"
            style={{ width: s, height: s, marginLeft: -(s / 2), marginTop: -(s / 2), borderRadius: '50%', border: '1.5px solid var(--fg)', background: 'transparent', opacity: 0, willChange: 'transform, opacity' }}
          />
        );
      })}

      {/* Morphing SVG cursor — triangle reshapes into circle */}
      <svg
        ref={svgRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{ opacity: 0, willChange: 'transform, opacity', width: 22, height: 22, marginLeft: -11, marginTop: -11, overflow: 'visible' }}
        viewBox="-11 -11 22 22"
      >
        <path
          ref={pathRef}
          fill="var(--fg)"
          stroke="var(--fg)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="0"
          fillOpacity={1}
          strokeOpacity={0}
          d={buildPath(0)}
        />
      </svg>
    </>
  );
}
