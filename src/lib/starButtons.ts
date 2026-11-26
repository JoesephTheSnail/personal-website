import type { StarVariant } from '@/components/StarButton';

/**
 * The star projects get an object-style "view project" button (see StarButton.tsx)
 * at the top of their page. `linkLabel` picks which entry of the project's `links`
 * the button opens, so the URL stays in the MDX and is not repeated here.
 */
export const STAR_BUTTONS: Record<string, { variant: StarVariant; label: string; linkLabel: string }> = {
  'screens-and-sleep-report': { variant: 'sleep', label: 'Read the report', linkLabel: 'Read the Full Report' },
  'mindset-app': { variant: 'mind', label: 'View the prototype', linkLabel: 'Figma Prototype' },
  insusense: { variant: 'insu', label: 'See the pitch deck', linkLabel: 'Pitch Deck' },
  anywear: { variant: 'wear', label: 'See the pitch', linkLabel: 'Pitch Deck' },
  'mindset-matters-newsletter': { variant: 'mail', label: 'Read the newsletter', linkLabel: 'Read on Substack' },
};
