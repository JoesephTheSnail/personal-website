// Formatting helpers for the Fitness dashboard.
// Everything is metric (km, meters, min/km) except body weight, which
// stays in lbs — the one deliberate exception.

export function formatKm(km: number, decimals = 1): string {
  return `${km.toFixed(decimals)} km`;
}

export function formatPacePerKm(minPerKm: number): string {
  const whole = Math.floor(minPerKm);
  const sec = Math.round((minPerKm - whole) * 60);
  return `${whole}:${sec.toString().padStart(2, '0')}/km`;
}

export function formatElevation(meters: number): string {
  return `${Math.round(meters)} m`;
}

export function formatWeightLbs(lbs: number): string {
  return `${lbs.toFixed(1)} lbs`;
}
