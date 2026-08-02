import {
  FaMobileAlt, FaFlask, FaFilm, FaCog, FaRunning,
  FaLightbulb, FaChalkboard,
} from 'react-icons/fa';

// A faint geometric texture behind each category card, drawn with CSS
// gradients rather than image assets — nothing to download, and it tints
// itself from the category accent so the set stays cohesive. Each one is a
// loose nod to its subject (graph paper for research, sprocket holes for
// film, a technical grid for engineering) at an opacity low enough that it
// registers as texture, not decoration.
export type CategoryMotif = 'arcs' | 'dots' | 'graph' | 'diagonals' | 'film' | 'hatch' | 'chevrons';

export interface CategoryMeta {
  label: string;
  slug: string;
  icon: React.ElementType;
  color: string;
  lightColor: string; // darkened for WCAG contrast on light backgrounds
  bg: string;
  motif: CategoryMotif;
  order: number;
}

export const CATEGORIES: CategoryMeta[] = [
  // Amber is the hardest accent to keep legible on a light surface — at
  // #92660a the Featured chip measured 4.30:1, just under AA, so it runs a
  // shade darker than the palette's other light-mode accents.
  { label: 'Creative',    slug: 'creative',    icon: FaLightbulb,  color: '#fbbf24', lightColor: '#7d5708', bg: 'rgba(251,191,36,0.12)',  motif: 'arcs',      order: 1 },
  { label: 'Product',     slug: 'product',     icon: FaMobileAlt,  color: '#a78bfa', lightColor: '#6d28d9', bg: 'rgba(167,139,250,0.12)', motif: 'dots',      order: 2 },
  { label: 'Research',    slug: 'research',    icon: FaFlask,      color: '#34d399', lightColor: '#047857', bg: 'rgba(52,211,153,0.12)',  motif: 'graph',     order: 3 },
  { label: 'Pitch Deck',  slug: 'pitch-deck',  icon: FaChalkboard, color: '#818cf8', lightColor: '#3730a3', bg: 'rgba(129,140,248,0.12)', motif: 'diagonals', order: 4 },
  { label: 'Film',        slug: 'film',        icon: FaFilm,       color: '#f87171', lightColor: '#b91c1c', bg: 'rgba(248,113,113,0.12)', motif: 'film',      order: 5 },
  { label: 'Engineering', slug: 'engineering', icon: FaCog,        color: '#fb923c', lightColor: '#c2410c', bg: 'rgba(251,146,60,0.12)',  motif: 'hatch',     order: 6 },
  { label: 'Training',    slug: 'training',    icon: FaRunning,    color: '#ef4444', lightColor: '#b91c1c', bg: 'rgba(239,68,68,0.12)',   motif: 'chevrons',  order: 7 },
];

/** CSS `background-image` + `background-size` for a motif, tinted to `tint` (a color with an alpha suffix). */
export function motifStyle(motif: CategoryMotif, tint: string): { backgroundImage: string; backgroundSize: string } {
  switch (motif) {
    case 'dots':
      return { backgroundImage: `radial-gradient(${tint} 1.2px, transparent 1.2px)`, backgroundSize: '14px 14px' };
    case 'graph':
      return {
        backgroundImage: `linear-gradient(${tint} 1px, transparent 1px), linear-gradient(90deg, ${tint} 1px, transparent 1px)`,
        backgroundSize: '18px 18px, 18px 18px',
      };
    case 'diagonals':
      return { backgroundImage: `repeating-linear-gradient(45deg, ${tint} 0 1px, transparent 1px 11px)`, backgroundSize: 'auto' };
    case 'hatch':
      return {
        backgroundImage: `repeating-linear-gradient(45deg, ${tint} 0 1px, transparent 1px 10px), repeating-linear-gradient(-45deg, ${tint} 0 1px, transparent 1px 10px)`,
        backgroundSize: 'auto',
      };
    case 'film':
      return { backgroundImage: `repeating-linear-gradient(180deg, ${tint} 0 7px, transparent 7px 18px)`, backgroundSize: '12px 100%' };
    case 'chevrons':
      return { backgroundImage: `repeating-linear-gradient(118deg, ${tint} 0 1.5px, transparent 1.5px 13px)`, backgroundSize: 'auto' };
    case 'arcs':
      return { backgroundImage: `repeating-radial-gradient(circle at 92% 8%, transparent 0 17px, ${tint} 17px 18px)`, backgroundSize: 'auto' };
  }
}

export function getCategoryBySlug(slug: string): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getCategoryByLabel(label: string): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.label === label);
}

// Hex rather than rgba() deliberately: accents get an alpha suffix appended
// (`${color}22`) to derive the card's bloom and ring, which only works on a
// 6-digit hex. An rgba() fallback here would silently produce invalid colors.
const FALLBACK: CategoryMeta = {
  label: 'Other', slug: 'other', icon: FaLightbulb, color: '#9aa0a6', lightColor: '#5f6368', bg: 'rgba(255,255,255,0.08)', motif: 'dots', order: 99,
};

export function getCategoryMeta(label: string): CategoryMeta {
  return getCategoryByLabel(label) ?? { ...FALLBACK, label };
}
