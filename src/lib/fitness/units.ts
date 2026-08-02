// Formatting helpers for the Fitness dashboard.
// Everything is metric (km, meters, min/km) except body weight, which
// stays in lbs — the one deliberate exception.

export function formatKm(km: number, decimals = 1): string {
  return `${km.toFixed(decimals)} km`;
}

export function formatPacePerKm(minPerKm: number): string {
  let whole = Math.floor(minPerKm);
  let sec = Math.round((minPerKm - whole) * 60);
  // A fractional part that rounds up to a full 60 (e.g. 4.9999 min/km)
  // would otherwise print as "4:60/km" instead of carrying to "5:00/km".
  if (sec === 60) { whole += 1; sec = 0; }
  return `${whole}:${sec.toString().padStart(2, '0')}/km`;
}

export function formatElevation(meters: number): string {
  return `${Math.round(meters)} m`;
}

export function formatWeightLbs(lbs: number): string {
  return `${lbs.toFixed(1)} lbs`;
}
