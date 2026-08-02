'use client';

import { startTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaStar } from 'react-icons/fa';
import { playHover } from '@/lib/sound';
import { projectCardTransitionName } from '@/lib/viewTransition';
import { useIsLight } from '@/lib/useIsLight';
import { motifStyle, type CategoryMotif } from '@/lib/categoryMeta';

// Fine grain, tiled. Sits at very low opacity over the card surface — the
// thing that keeps a large dark gradient from looking like flat vector fill.
const NOISE_BG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

// Only column width varies, never row height — every card is exactly one
// grid row tall. Mixing row-spans is what made an earlier version of this
// layout gappy: CSS grid only backfills holes when the *widths* don't add up
// to the column count, not when heights mismatch.
export type TileSize = 'sm' | 'wide';

interface PhotoTileProps {
  href?: string;
  color: string;
  lightColor?: string;
  size?: TileSize;
  icon?: React.ElementType;
  title: string;
  subtitle: string;
  /** Featured work: brighter accent, an explicit "Featured" chip, richer metadata. */
  featured?: boolean;
  /** In progress rather than a finished write-up — softened, with a live status chip. */
  inProgress?: boolean;
  /** Small uppercase chip, top-left. Date for projects, count for categories. */
  meta?: string;
  /** Second chip beside `meta` — the category a featured project belongs to. */
  chip?: string;
  /** Geometric texture for category cards. */
  motif?: CategoryMotif;
  /** Which detent to click on hover, out of a small fixed set. */
  hoverIndex?: number;
  /** Photographic artwork, faded into the card rather than sitting on top of it. */
  bgImage?: string;
}

function LiveDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: color }} />
      <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: color }} />
    </span>
  );
}

function CardFace({
  color, lightColor, size, icon: Icon, title, subtitle,
  featured, inProgress, meta, chip, motif, bgImage, isLight,
}: Omit<PhotoTileProps, 'href'> & { isLight: boolean }) {
  const wide = size === 'wide';
  const accent = isLight ? (lightColor ?? color) : color;

  return (
    <>
      {/* 1 — artwork or texture, the deepest layer */}
      {bgImage ? (
        <>
          {/* Masked, not scrimmed. A rectangle of artwork behind a flat wash
              still reads as a photo pasted onto a card — and with
              high-contrast artwork like a photo it dominates the title. The
              mask dissolves the image diagonally so it's present across most
              of the card and only fully gone right where the text lives.
              A short transition (the old 34%→62% stops) reads as a hard-edged
              photo cutout on high-contrast source images; stretching the
              fade out over most of the card's width is what removes that
              seam and lets the image bleed to every side with no border. */}
          <span
            aria-hidden="true"
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `url(${bgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: isLight ? 0.55 : 0.46,
              filter: isLight ? 'saturate(0.85)' : 'saturate(0.7)',
              maskImage: 'linear-gradient(205deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.75) 30%, rgba(0,0,0,0.32) 55%, rgba(0,0,0,0.08) 78%, transparent 96%)',
              WebkitMaskImage: 'linear-gradient(205deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.75) 30%, rgba(0,0,0,0.32) 55%, rgba(0,0,0,0.08) 78%, transparent 96%)',
            }}
          />
          {/* A light touch of tone underneath the copy only — the mask does
              most of the work, so this no longer has to be a heavy wash. */}
          <span
            aria-hidden="true"
            className="absolute inset-0 z-0"
            style={{
              background: isLight
                ? 'linear-gradient(200deg, transparent 40%, rgba(255,255,255,0.55) 100%)'
                : 'linear-gradient(200deg, transparent 40%, rgba(10,10,11,0.6) 100%)',
            }}
          />
        </>
      ) : motif ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 z-0"
          style={{
            ...motifStyle(motif, `${accent}${isLight ? '1c' : '20'}`),
            maskImage: 'radial-gradient(115% 90% at 88% 6%, black 0%, transparent 72%)',
            WebkitMaskImage: 'radial-gradient(115% 90% at 88% 6%, black 0%, transparent 72%)',
          }}
        />
      ) : null}

      {/* 2 — accent bloom (animates on hover) */}
      <span
        className="pcard__bloom"
        aria-hidden="true"
        style={{
          backgroundImage: `radial-gradient(75% 62% at 8% -8%, ${accent}${featured ? (isLight ? '26' : '32') : (isLight ? '14' : '1c')} 0%, transparent 68%)`,
          opacity: 0.9,
        }}
      />

      {/* 3 — grain */}
      <span
        aria-hidden="true"
        className="absolute inset-0 z-[2]"
        style={{ backgroundImage: NOISE_BG, backgroundSize: '150px 150px', opacity: isLight ? 0.22 : 0.4, mixBlendMode: 'overlay' }}
      />

      {/* 4 — still in progress: a wash that knocks the whole card back, plus
             faint diagonal hazard stripes. The stripes are what make it read
             as "under construction" specifically rather than just dimmed. */}
      {inProgress && (
        <>
          <span
            aria-hidden="true"
            className="absolute inset-0 z-[3]"
            style={{ background: isLight ? 'rgba(250,250,248,0.62)' : 'rgba(18,18,20,0.62)' }}
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 z-[4]"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, ${accent}${isLight ? '12' : '16'} 0 7px, transparent 7px 16px)`,
            }}
          />
        </>
      )}

      {/* 5 — content */}
      <span className="relative z-[8] flex h-full w-full flex-col justify-between p-[18px]">
        <span className="flex items-start justify-between gap-2">
          <span className="flex flex-wrap items-center gap-1.5">
            {/* Says what it means. The accent tint is reserved for this one
                chip, so "featured" is the only thing on a card allowed to
                carry a bright color — everything else stays neutral. */}
            {featured && (
              <span className="pchip pchip--accent">
                <FaStar size={8} aria-hidden="true" />
                Featured
              </span>
            )}
            {meta && <span className="pchip">{meta}</span>}
            {chip && <span className="pchip">{chip}</span>}
          </span>
          {inProgress && (
            // Theme-aware green. The bright #34d399 that works on a dark
            // card drops to ~1.6:1 against the light-mode chip, so light
            // mode takes the darkened emerald instead.
            <span className="pchip flex-shrink-0" style={{ color: isLight ? '#047857' : '#34d399' }}>
              <LiveDot color={isLight ? '#047857' : '#34d399'} />
              In progress
            </span>
          )}
        </span>

        <span className="flex flex-col">
          {Icon && (
            <span
              className="pcard__icon mb-2.5 flex items-center justify-center flex-shrink-0 rounded-[9px]"
              style={{
                width: 28,
                height: 28,
                background: `${accent}${isLight ? '1f' : '24'}`,
                border: `1px solid ${accent}${isLight ? '33' : '38'}`,
              }}
            >
              <Icon size={wide ? 14 : 13} style={{ color: accent }} aria-hidden="true" />
            </span>
          )}
          {/* Title is the focal point: heavier, tighter tracking, and a full
              step up in size from the supporting copy beneath it. */}
          {/* Clamps only apply from `sm` up, where the grid rows are a fixed
              height and overflowing copy would spill. Below that the rows
              size to their content, so clamping there would hide text for
              no reason — which it was doing to the longest description. */}
          <span
            // leading-[1.35], not 1.25/1.3: Poppins' natural line box at 17px
            // is 23px, so a 21px line-height box had the clamp's
            // overflow:hidden shaving 2px off descenders ("g", "y", "p").
            className={`font-poppins font-semibold ${wide ? 'text-[17px] leading-[1.35] line-clamp-none sm:line-clamp-2' : 'text-[15px] leading-[1.35] line-clamp-none sm:line-clamp-1'}`}
            style={{ color: 'var(--fg)', letterSpacing: '-0.012em' }}
          >
            {title}
          </span>
          {/* --fg-60 rather than --fg-45: at 45% the supporting copy measured
              3.34:1, under AA. The step down from the title is already
              carried by size, weight, and pure-foreground vs. muted — it
              doesn't need dimming past the point of legibility to read as
              secondary. */}
          <span
            className={`mt-1.5 text-[12px] leading-[1.5] ${wide ? 'line-clamp-none sm:line-clamp-2' : 'line-clamp-none sm:line-clamp-1'}`}
            style={{ color: 'var(--fg-60)' }}
          >
            {subtitle}
          </span>
        </span>
      </span>
    </>
  );
}

export default function PhotoTile({
  href, color, lightColor, size = 'sm', icon, title, subtitle,
  featured, inProgress, meta, chip, motif, hoverIndex = 0, bgImage,
}: PhotoTileProps) {
  const isLight = useIsLight();
  const router = useRouter();
  const accent = isLight ? (lightColor ?? color) : color;

  const className = `pcard ${href ? 'pcard--link' : ''} ${inProgress ? 'pcard--wip' : ''} col-span-1 ${size === 'wide' ? 'sm:col-span-2' : ''}`;

  const projectSlug = href?.startsWith('/projects/') ? href.slice('/projects/'.length) : undefined;

  const style: React.CSSProperties = {
    // Read by the hover ring/glow in globals.css. Featured cards get a
    // stronger glow so they pull ahead of the supporting cards on hover too,
    // not just at rest.
    ['--accent' as string]: accent,
    ['--accent-soft' as string]: `${accent}${featured ? '3d' : '26'}`,
    // Light mode keeps the tint fainter: the accent text sits *on* this
    // fill, so every extra percent of tint eats directly into the chip's
    // contrast ratio (11% tint pushed amber down to 4.05:1).
    ['--accent-chip-bg' as string]: `${accent}${isLight ? '10' : '22'}`,
    ['--accent-chip-border' as string]: `${accent}${isLight ? '3d' : '42'}`,
    ...(projectSlug && { viewTransitionName: projectCardTransitionName(projectSlug) }),
  };

  // No hover click on whatever's in progress — it's the one card you're
  // likely to linger over while reading, where a tick every pass reads as
  // noise rather than feedback.
  const onMouseEnter = inProgress ? undefined : () => playHover(hoverIndex);

  // View Transitions only make sense for genuine in-app navigation — a
  // modifier-click (new tab, etc.) or a browser without support falls
  // through to the plain Link navigation underneath.
  const onClick = (e: React.MouseEvent) => {
    if (!href) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    type ViewTransition = { ready?: Promise<void>; finished?: Promise<void> };
    const startViewTransition = (document as unknown as { startViewTransition?: (cb: () => Promise<void>) => ViewTransition }).startViewTransition;
    if (typeof startViewTransition !== 'function') return;
    e.preventDefault();

    const transition = startViewTransition.call(document, () => new Promise<void>((resolve) => {
      startTransition(() => router.push(href));
      // The callback only *starts* the navigation — router.push() returns
      // long before the new route renders. Resolving immediately made the
      // browser snapshot the "after" state while the old page was still up,
      // so the transition had nothing to morph into and aborted with no
      // visible animation. Wait for the destination's root (tagged with the
      // same slug) to actually mount, with a hard cutoff so a slow or failed
      // navigation can't hang the page.
      const deadline = performance.now() + 1500;
      const check = () => {
        if (document.querySelector(`[data-project-transition="${projectSlug}"]`) || performance.now() > deadline) {
          resolve();
        } else {
          requestAnimationFrame(check);
        }
      };
      requestAnimationFrame(check);
    }));
    transition?.finished?.catch(() => {});
    transition?.ready?.catch(() => {});
  };

  const face = (
    <CardFace
      color={color} lightColor={lightColor} size={size} icon={icon}
      title={title} subtitle={subtitle} featured={featured} inProgress={inProgress}
      meta={meta} chip={chip} motif={motif} bgImage={bgImage} isLight={isLight}
    />
  );

  if (href) {
    return (
      <Link href={href} className={className} style={style} onMouseEnter={onMouseEnter} onClick={onClick}>
        {face}
      </Link>
    );
  }

  return (
    <div className={className} style={style} onMouseEnter={onMouseEnter}>
      {face}
    </div>
  );
}
