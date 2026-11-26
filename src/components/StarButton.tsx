import Link from 'next/link';

export type StarVariant = 'sleep' | 'mind' | 'insu' | 'wear' | 'mail';

/**
 * The "view project" button for the star projects. Like the truck on the carbon
 * capture page, the whole button is an object from the project's world and the
 * label is printed on its main face: a bed (Pre-Sleep), a phone (MindSet), an
 * insulin pen (InsuSense), a price tag (AnyWear), an envelope (Mindset Matters).
 * Everything except the label is decoration (aria-hidden), so to a screen reader
 * it is one plain link. Motion lives in CSS (`.star-cta` in globals.css), plays
 * on hover, focus and press only, and is off under reduced motion.
 */
export default function StarButton({
  href,
  variant,
  children,
  external = false,
}: {
  href: string;
  variant: StarVariant;
  children: React.ReactNode;
  external?: boolean;
}) {
  const body = <ButtonArt variant={variant} label={children} />;
  const className = `star-cta sc-${variant}`;
  if (external || href.startsWith('#')) {
    return (
      <a href={href} className={className} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {body}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {body}
    </Link>
  );
}

const Deco = ({ className }: { className: string }) => <i className={`sx ${className}`} aria-hidden="true" />;

// The object's main face, with the label printed on it. `fx` is decoration that sits on the
// face but behind the label (the phone's breathing rings).
const Face = ({ label, fx }: { label: React.ReactNode; fx?: React.ReactNode }) => (
  <span className="sx-face">
    {fx}
    <span className="sx-label">{label}</span>
  </span>
);

function ButtonArt({ variant, label }: { variant: StarVariant; label: React.ReactNode }) {
  switch (variant) {
    // Pre-Sleep Screen Restriction: a bed seen from the side: one pillow on top of the navy duvet (the label)
    // On hover the pillow settles and the z's float up.
    case 'sleep':
      return (
        <>
          <Face label={label} />
          <Deco className="sx-pillow" />
          <i className="sx sx-z sx-z1" aria-hidden="true">z</i>
          <i className="sx sx-z sx-z2" aria-hidden="true">z</i>
          <i className="sx sx-z sx-z3" aria-hidden="true">z</i>
        </>
      );
    // MindSet: a heavy cloud that lifts as the app's orange "Affirmations" sun rises behind it. Weather is the
    // standard mood metaphor, and storm clouds clearing is the classic CBT image for reframing a thought.
    case 'mind':
      return (
        <>
          <Deco className="sx-rays" />
          <Deco className="sx-sun" />
          <Deco className="sx-bump sx-bump--a" />
          <Deco className="sx-bump sx-bump--b" />
          <Deco className="sx-bump sx-bump--c" />
          <Face label={label} />
          <Deco className="sx-rain sx-rain--a" />
          <Deco className="sx-rain sx-rain--b" />
          <Deco className="sx-rain sx-rain--c" />
        </>
      );
    // InsuSense: an insulin pen; the label is on the barrel, hover pushes the plunger and a drop forms.
    case 'insu':
      return (
        <>
          <span className="sx-plunger" aria-hidden="true">
            <i className="sx-knob" />
            <i className="sx-rod" />
          </span>
          <Face label={label} />
          <Deco className="sx-hub" />
          <Deco className="sx-needle" />
          <Deco className="sx-drop" />
        </>
      );
    // AnyWear: a garment price tag on a string looped through its eyelet; on hover it swings once and settles.
    case 'wear':
      return (
        <>
          <svg className="sx-peg" viewBox="0 0 40 30" aria-hidden="true">
            <circle cx="16" cy="5" r="4.2" />
          </svg>
          <span className="sx-hang">
            <svg className="sx-string" viewBox="0 0 40 64" aria-hidden="true">
              <path d="M16 5 C 9 22, 9 42, 16 60" />
              <path d="M16 5 C 23 22, 23 42, 16 60" />
            </svg>
            <Face label={label} />
            <Deco className="sx-eyelet" />
            <Deco className="sx-barcode" />
            <Deco className="sx-sheen" />
          </span>
        </>
      );
    // Mindset Matters: a paper envelope; on hover the flap lifts and the letter slides up.
    case 'mail':
      return (
        <>
          <svg className="sx sx-flap-open" viewBox="0 0 100 17" preserveAspectRatio="none" aria-hidden="true">
            <polygon points="0,17 100,17 50,0" />
          </svg>
          <Deco className="sx-letter" />
          <Face label={label} />
          <svg className="sx sx-flap" viewBox="0 0 100 17" preserveAspectRatio="none" aria-hidden="true">
            <polygon points="0,0 100,0 50,17" />
          </svg>
          <Deco className="sx-stamp" />
        </>
      );
  }
}
