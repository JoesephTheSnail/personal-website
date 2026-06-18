'use client';

import { useEffect, useRef, useState } from 'react';

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

export default function CustomCursor() {
  const svgRef         = useRef<SVGSVGElement>(null);
  const pathFgRef      = useRef<SVGPathElement>(null);   // var(--fg) layer
  const pathIndigoRef  = useRef<SVGPathElement>(null);   // var(--indigo) layer
  const dotRefs        = useRef<(HTMLDivElement | null)[]>([]);
  const dotIndigoRefs  = useRef<(HTMLDivElement | null)[]>([]);
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
    let _clicking   = false;
    let _clickScale = 1.0;
    let _hoverScale = 1.0;
    // 0 = fg color, 1 = indigo — lerps smoothly
    let colorT = 0;

    const onDown  = () => { _clicking = true; };
    const onUp    = () => { _clicking = false; };
    const onLeave = () => { _visible = false; };
    const onEnter = () => { _visible = true; };

    const onMove = (e: MouseEvent) => {
      mouse.x  = e.clientX;
      mouse.y  = e.clientY;
      _visible = true;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      _pointer = !!el?.closest('a, button, [role="button"], input, select, textarea, label');
      _hidden  = !!el?.closest('[data-hide-cursor]') && !_pointer;
    };

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

      // Smooth color lerp — slow enough to feel like a fade (~0.06 = ~300ms half-life)
      const colorTarget = _pointer && vis ? 1 : 0;
      colorT += (colorTarget - colorT) * 0.06;

      _hoverScale += ((_pointer && vis ? 1.12 : 1.0) - _hoverScale) * 0.1;
      _clickScale += ((_clicking ? 0.8 : 1.0) - _clickScale) * 0.28;
      const totalScale = _hoverScale * _clickScale;

      if (svgRef.current && pathFgRef.current && pathIndigoRef.current) {
        svgRef.current.style.transform = `translate(${cur.x}px, ${cur.y}px) scale(${totalScale.toFixed(3)})`;
        svgRef.current.style.opacity   = vis ? '1' : '0';

        // Cross-fade between fg and indigo by blending fillOpacity of each layer
        pathFgRef.current.setAttribute('fill-opacity',     String(+(1 - colorT).toFixed(3)));
        pathIndigoRef.current.setAttribute('fill-opacity', String(+colorT.toFixed(3)));
      }

      dotRefs.current.forEach((el, i) => {
        if (!el) return;
        el.style.transform = `translate(${dots[i].x}px, ${dots[i].y}px)`;
        el.style.opacity   = vis ? String(+((1 - i / TRAIL) * 0.13 * (1 - colorT)).toFixed(3)) : '0';
      });
      dotIndigoRefs.current.forEach((el, i) => {
        if (!el) return;
        el.style.transform = `translate(${dots[i].x}px, ${dots[i].y}px)`;
        el.style.opacity   = vis ? String(+((1 - i / TRAIL) * 0.13 * colorT).toFixed(3)) : '0';
      });

      rafId = requestAnimationFrame(tick);
    };

    document.addEventListener('mousemove',  onMove);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);
    document.addEventListener('mousedown',  onDown);
    document.addEventListener('mouseup',    onUp);
    rafId = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener('mousemove',  onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      document.removeEventListener('mousedown',  onDown);
      document.removeEventListener('mouseup',    onUp);
      cancelAnimationFrame(rafId);
    };
  }, [isFine]);

  if (!isFine) return null;

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
            style={{ width: size, height: size, marginLeft: -(size / 2), marginTop: -(size / 2), borderRadius: '50%', background: 'var(--indigo)', opacity: 0, willChange: 'transform, opacity' }}
          />
        );
      })}

      <svg
        ref={svgRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{ opacity: 0, willChange: 'transform, opacity', width: 22, height: 22, marginLeft: -11, marginTop: -11, overflow: 'visible' }}
        viewBox="-11 -11 22 22"
      >
        {/* fg layer */}
        <path ref={pathFgRef}     d={TRI_PATH} fill="var(--fg)"     fillOpacity={1} stroke="none" />
        {/* indigo layer fades in on hover */}
        <path ref={pathIndigoRef} d={TRI_PATH} fill="var(--indigo)" fillOpacity={0} stroke="none" />
      </svg>
    </>
  );
}
