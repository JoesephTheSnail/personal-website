import { notFound } from 'next/navigation';
import { FaSatelliteDish } from 'react-icons/fa';
import { getOverview, getPlanData } from '@/lib/fitness/liveData';
import { isStravaConfigured } from '@/lib/fitness/strava';
import { isGoogleCalendarConfigured } from '@/lib/fitness/googleCalendar';
import { isKvConfigured } from '@/lib/fitness/kv';
import FitnessDashboard from '@/components/fitness/FitnessDashboard';
import { Pill } from '@/components/fitness/ui';

// Hidden — the page is a work in progress. Everything underneath
// (ingestion routes, the weekly Strava import script) is untouched;
// this is just the public entry point being taken down. Delete this
// block to bring it back.
const HIDDEN = true;

export const metadata = {
  title: 'Fitness',
  description: 'Training and activity, synced from Apple Health, Strava, and Google Calendar.',
};

function connectionStatus(): { text: string; tone: 'default' | 'green' | 'accent' } {
  const connected = [isKvConfigured(), isStravaConfigured(), isGoogleCalendarConfigured()].filter(Boolean).length;
  if (connected === 0) return { text: 'Mock Data', tone: 'default' };
  if (connected === 3) return { text: 'Live: All Sources Connected', tone: 'green' };
  return { text: `Live: ${connected}/3 Sources Connected`, tone: 'accent' };
}

function formatSyncedAt(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default async function FitnessPage() {
  if (HIDDEN) notFound();

  const [overview, plan] = await Promise.all([
    getOverview(),
    getPlanData(),
  ]);
  const status = connectionStatus();
  // Mock mode has no real sync history, but the mock fixture is still
  // freshly served on every request — showing "just now" is honest here,
  // it just means "as of this page load" rather than "as of a real device sync".
  const syncedAt = overview.lastSyncedAt ?? new Date().toISOString();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--fx-fg)' }}>Fitness</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--fx-fg-dim)' }}>
            Apple Health · Strava · Google Calendar
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 justify-end">
            <FaSatelliteDish size={11} aria-hidden="true" style={{ color: 'var(--fx-fg-dimmer)' }} />
            <Pill text={status.text} tone={status.tone} />
          </div>
          <p className="text-[0.7rem] mt-1" style={{ color: 'var(--fx-fg-dimmer)' }}>
            Synced {formatSyncedAt(syncedAt)}
          </p>
        </div>
      </div>

      <FitnessDashboard overview={overview} plan={plan} />
    </div>
  );
}
