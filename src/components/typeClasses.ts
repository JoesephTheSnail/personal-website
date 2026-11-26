// The two small-caps label styles used across the pages. Kept in components/
// (not lib/) because Tailwind only scans src/app, src/components and src/pages
// for class names; a string here in lib/ would never generate its CSS.
export const eyebrow = 'text-[11px] font-semibold tracking-widest uppercase';
export const smallCaps = 'text-[10.5px] uppercase tracking-[0.14em]';
