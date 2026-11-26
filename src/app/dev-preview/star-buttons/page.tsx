import StarButton, { type StarVariant } from '@/components/StarButton';
import TruckButton from '@/components/TruckButton';
import { LINKS } from '@/lib/links';
import { eyebrow } from '@/components/typeClasses';

// Preview of every star project's "view project" button in one place. Not linked
// from the site and marked noindex (see ../layout.tsx). Tick the box to see all
// the hover states at once.
const ITEMS: { title: string; why: string; label: string; variant: StarVariant; href: string; external?: boolean; how: string }[] = [
  {
    title: 'Pre-Sleep Screen Restriction',
    why: 'A bed seen from the side: one pillow at the head of the blue face. Nothing else.',
    label: 'Read the report',
    variant: 'sleep',
    href: '/projects/screens-and-sleep-report',
    how: 'Pillow settles, z\'s float up',
  },
  {
    title: 'MindSet',
    why: 'A cloud with a sun behind it, the imagery the app itself uses. The label sits on the cloud; on hover the sun rays turn and light rain falls.',
    label: 'View the prototype',
    variant: 'mind',
    href: '/projects/mindset-app',
    how: 'Sun brightens, rain falls',
  },
  {
    title: 'InsuSense',
    why: 'An insulin pen, with the label on the barrel. On hover the plunger pushes in and a drop forms at the needle.',
    label: 'See the pitch deck',
    variant: 'insu',
    href: '/projects/insusense',
    how: 'Plunger pushes, a drop falls',
  },
  {
    title: 'AnyWear',
    why: 'A garment price tag on a string, with the label as the tag. On hover it swings once and settles, with a light sheen across it.',
    label: 'See the pitch',
    variant: 'wear',
    href: '/projects/anywear',
    how: 'One swing, then still',
  },
  {
    title: 'Mindset Matters',
    why: 'A paper envelope, with the label on its front. On hover the flap lifts and the letter slides up.',
    label: 'Read the newsletter',
    variant: 'mail',
    href: LINKS.substack,
    external: true,
    how: 'Flap opens, letter slides out',
  },
];

export default function StarButtonsPreview() {
  return (
    <div className="native-cursor star-gallery mx-auto max-w-5xl px-6 pb-24 pt-24 sm:px-10">
      <p className={eyebrow} style={{ color: 'var(--accent)' }}>Preview, not on the site</p>
      <h1 className="mt-3 text-[clamp(2.25rem,5.2vw,3.5rem)] font-medium leading-[0.98] tracking-[-0.04em]" style={{ color: 'var(--fg)' }}>
        Star project buttons
      </h1>
      <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed" style={{ color: 'var(--fg-60)' }}>
        Like the truck, each star project's button is an object from that project's world with the label printed on it. Hover or
        tab to a button, or tick the box to show every hover state at once. The truck at the bottom is the existing one.
      </p>

      <label className="mt-8 inline-flex cursor-pointer items-center gap-3 text-[0.9375rem]" style={{ color: 'var(--fg)' }}>
        <input type="checkbox" className="star-force h-4 w-4 accent-[var(--accent)]" /> Show hover state
      </label>

      <div className="mt-10 grid gap-x-12 sm:grid-cols-2">
        {ITEMS.map((item) => (
          <section key={item.title} className="border-t py-7" style={{ borderColor: 'var(--border-med)' }}>
            <h2 className="text-[1.125rem] tracking-[-0.015em]" style={{ color: 'var(--fg)' }}>{item.title}</h2>
            <p className="mb-5 mt-1 text-[0.875rem] leading-relaxed" style={{ color: 'var(--fg-60)' }}>{item.why}</p>
            <StarButton href={item.href} variant={item.variant} external={item.external}>{item.label}</StarButton>
            <p className="mt-4 text-[10.5px] uppercase tracking-[0.14em]" style={{ color: 'var(--fg-60)' }}>Hover: {item.how}</p>
          </section>
        ))}
        <section className="border-t py-7" style={{ borderColor: 'var(--border-med)' }}>
          <h2 className="text-[1.125rem] tracking-[-0.015em]" style={{ color: 'var(--fg)' }}>Truck Exhaust Carbon Capture</h2>
          <p className="mb-5 mt-1 text-[0.875rem] leading-relaxed" style={{ color: 'var(--fg-60)' }}>
            The reference, already live on its project page. Wheels spin and exhaust puffs rise on hover.
          </p>
          <TruckButton href="/projects/carbon-capture-model/demo">Explore the 3D model</TruckButton>
        </section>
      </div>
    </div>
  );
}
