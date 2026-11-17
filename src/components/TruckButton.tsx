import Link from 'next/link';

/** A link dressed as a little truck. The label rides on the trailer; on
 *  hover, focus or press the wheels spin, the rig bounces, exhaust puffs
 *  rise from the exhaust stack and the road marks scroll underneath. All motion is
 *  CSS (see `.truck-cta` in globals.css) and switches off for reduced-motion
 *  users. Decoration is aria-hidden, so it's still just one plain link to a
 *  screen reader.
 *
 *  The artwork is split between SVG fills (light colours) and CSS
 *  backgrounds (dark/mid colours) on purpose, so Chrome's forced dark mode
 *  can't recolour it. The reasoning lives next to the CSS. */
export default function TruckButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="truck-cta">
      <span className="truck-cta__rig">
        <span className="truck-cta__trailer font-poppins">
          <span className="truck-cta__panel" aria-hidden="true" />
          <span className="truck-cta__label">{children}</span>
        </span>
        <span className="truck-cta__cab" aria-hidden="true">
          {/* exhaust stack (drawn first so the cab body overlaps its base) */}
          <i className="truck-cta__stack" />
          <i className="truck-cta__stack-cap" />
          <i className="truck-cta__body" />
          <i className="truck-cta__seam" />
          <i className="truck-cta__frame" />
          <svg className="truck-cta__pane" viewBox="0 0 60 46">
            <path d="M23 11.5h7c1.5 0 2.6.7 3.6 1.9L42 23H23z" fill="#bfe6f7" />
            <circle cx="53" cy="31" r="2.6" fill="#fff3b0" />
          </svg>
        </span>
      </span>
      {/* wheels: two at the back of the trailer, one under the cab */}
      <Wheel className="truck-cta__wheel--a" />
      <Wheel className="truck-cta__wheel--b" />
      <Wheel className="truck-cta__wheel--c" />
      <span className="truck-cta__puff truck-cta__puff--1" aria-hidden="true" />
      <span className="truck-cta__puff truck-cta__puff--2" aria-hidden="true" />
      <span className="truck-cta__puff truck-cta__puff--3" aria-hidden="true" />
      <span className="truck-cta__road" aria-hidden="true" />
    </Link>
  );
}

function Wheel({ className }: { className: string }) {
  return (
    <span className={`truck-cta__wheel ${className}`} aria-hidden="true">
      <span className="truck-cta__hub">
        <svg className="truck-cta__disc" viewBox="0 0 22 22">
          <circle cx="11" cy="11" r="5.6" fill="#d9dde2" />
        </svg>
        <i className="truck-cta__spoke-h" />
        <i className="truck-cta__spoke-v" />
        <i className="truck-cta__cap" />
      </span>
    </span>
  );
}
