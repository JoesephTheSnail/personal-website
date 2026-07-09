// Shared recharts tooltip styling for the Fitness dashboard (the only
// chart left on Overview is the Time by Sport donut — its colors come
// straight from each sport's data, not from constants here). Every
// value is a CSS custom property (fitness.css, both the dark default
// and the html.light override) so it follows the site's theme toggle.

export const tooltipStyle = {
  background: 'var(--fx-tooltip-bg)',
  border: '1px solid var(--fx-tooltip-border)',
  borderRadius: 4,
  fontSize: 11,
  fontFamily: 'var(--font-fitness-mono)',
  color: 'var(--fx-fg)',
  padding: '6px 10px',
};

export const tooltipLabelStyle = { color: 'var(--fx-fg-dim)', marginBottom: 2 };

// Recharts colors the value line by the series' own stroke/fill unless
// overridden — on a dark tooltip bg that meant slate/blue/green series
// text rendering with poor contrast. Force it to the readable foreground.
export const tooltipItemStyle = { color: 'var(--fx-fg)' };
