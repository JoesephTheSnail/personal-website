import Link from 'next/link';

/** A link dressed as a little truck. The label rides on the trailer; on
 *  hover, focus or press the wheels spin, the rig bounces, exhaust puffs
 *  rise and the road marks scroll underneath. All motion is CSS (see
 *  `.truck-cta` in globals.css) and switches off for reduced-motion users.
 *  Decoration is aria-hidden, so it's still just one plain link to a
 *  screen reader. */
export default function TruckButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="truck-cta">
      <span className="truck-cta__rig">
        <span className="truck-cta__trailer font-poppins">{children}</span>
        <svg className="truck-cta__cab" viewBox="0 0 60 46" aria-hidden="true">
          {/* exhaust stack */}
          <rect x="6" y="-8" width="5" height="16" rx="1.2" fill="#2b2e33" />
          <rect x="4.8" y="-10" width="7.4" height="3" rx="1.2" fill="#51565d" />
          {/* body */}
          <path d="M3 6h27c3.2 0 5.3 1.5 7.3 4.1l11.1 13.6c1.5 1.9 2.6 3.6 2.6 6.1V38a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" fill="#ff5d4d" />
          {/* window */}
          <path d="M23 11.5h7c1.5 0 2.6.7 3.6 1.9L42 23H23z" fill="#bfe6f7" />
          <path d="M23 11.5h7c1.5 0 2.6.7 3.6 1.9L42 23H23z" fill="none" stroke="#c23a2d" strokeWidth="1.2" />
          {/* door seam + headlight */}
          <path d="M16 12v26" stroke="#c23a2d" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="53" cy="31" r="2.6" fill="#fff3b0" />
        </svg>
      </span>
      {/* wheels: two at the back of the trailer, one under the cab */}
      <Wheel className="truck-cta__wheel truck-cta__wheel--a" />
      <Wheel className="truck-cta__wheel truck-cta__wheel--b" />
      <Wheel className="truck-cta__wheel truck-cta__wheel--c" />
      <span className="truck-cta__puff truck-cta__puff--1" aria-hidden="true" />
      <span className="truck-cta__puff truck-cta__puff--2" aria-hidden="true" />
      <span className="truck-cta__puff truck-cta__puff--3" aria-hidden="true" />
      <span className="truck-cta__road" aria-hidden="true" />
    </Link>
  );
}

function Wheel({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#15171a" />
      <g className="truck-cta__hub">
        <circle cx="12" cy="12" r="5.6" fill="#d9dde2" />
        <path d="M12 6.4v11.2M6.4 12h11.2" stroke="#8a9099" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="12" cy="12" r="1.6" fill="#15171a" />
      </g>
    </svg>
  );
}
