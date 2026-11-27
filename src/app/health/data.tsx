import type { HealthSection } from '@/components/HealthSections';
import { LINKS } from '@/lib/links';

// What I follow right now (from my notes, October 2026). The previous version lives at /health/archive.
const macros = (kcal: number, protein: number, carbs: number, fat: number) => (
  <>
    {kcal} kcal · {protein} g protein · {carbs} g carbs · {fat} g fat
  </>
);

const meal = (what: string, kcal: number, protein: number, carbs: number, fat: number) => (
  <>
    {what}
    <br />
    <span style={{ color: 'var(--fg-60)' }}>{macros(kcal, protein, carbs, fat)}</span>
  </>
);

export const SECTIONS: HealthSection[] = [
  {
    id: 'morning',
    title: 'Morning',
    body: [
      <>I get up at 6 am every day. Getting up at the same time improves sleep, because your body thrives on consistency.</>,
      <>The first hour is a fasted study block. It is easiest to focus when your mind is fresh and looking forward to its first meal.</>,
    ],
    facts: [
      ['Wake up', '6 am, every day'],
      ['First hour', 'Study block, fasted'],
    ],
  },
  {
    id: 'training',
    title: 'Training',
    body: [
      <>Truthfully, right now it is mostly the gym. School has taken over, so I have not been running, cycling or swimming, and I hate the treadmill. The bike, run and swim plans are what I follow when I am back on them.</>,
      <>I now train upper, anterior and posterior days. It helps balance out the running and cycling.</>,
    ],
    factGroups: [
      { label: 'Doing now', facts: [['Gym', 'Upper × Anterior × Posterior']] },
      {
        label: 'On pause',
        facts: [
          ['Bike, VO2 max', '5 × 130% FTP (135 W), rest at 60% FTP'],
          ['Bike, long ride', '50 km, +10% mileage a week'],
          ['Bike, zone 2', '1 hour at 80% FTP'],
          ['Run, VO2 max', 'Norwegian 4×4'],
          ['Run, long run', '15 km, +5% mileage'],
          ['Swim', 'Laps until I get bored'],
        ],
      },
    ],
    note: (
      <>
        I share my training on a gym TikTok,{' '}
        <a
          href={LINKS.tiktok}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 decoration-[var(--accent)] hover:decoration-2"
          style={{ color: 'var(--fg-70)' }}
        >
          @arnav.gym<span className="sr-only"> (opens in a new tab)</span> <span aria-hidden="true">↗</span>
        </a>
        .
      </>
    ),
  },
  {
    id: 'evening',
    title: 'Evening',
    body: [
      <>No screens for the hour before bed. Blue light disrupts melatonin production, which makes sleep worse.</>,
      <>A red lamp gives me the least blue light while still letting me see. Stretching calms me down and lets my brain know we are about to sleep.</>,
    ],
    facts: [
      ['Screens', 'Off 1 hour before bed'],
      ['Lamp', 'Red light'],
      ['Wind down', 'Lights dim over 30 minutes, red about 15 minutes before sleep (2500K)'],
      ['Stretching', 'Before bed'],
      ['Tomorrow', 'Planned on paper'],
      ['Breathing', 'Boxed, when I feel stressed or not fully calm'],
    ],
  },
  {
    id: 'nutrition',
    title: 'Nutrition',
    body: [<>I aim for over 3,000 kcal a day.</>],
    facts: [
      ['Morning', meal('Overnight oats with a banana', 877, 44, 119, 28)],
      ['Lunch', meal('Normally chicken thighs and rice', 834, 45, 110, 23)],
      ['Dinner', meal('Salmon or chicken, sweet potatoes, rice and a glass of milk', 992, 59, 106, 37)],
      ['Snack', meal('Peanut butter and honey sandwich with an apple', 418, 14, 67, 13)],
    ],
  },
  {
    id: 'learning',
    title: 'Learning',
    body: [<>I aim to read 10 pages a day, though I have not finished a book in a while. I have moved to more podcasts and articles.</>],
    facts: [
      ['Podcasts', 'My First Million, The Huberman Lab'],
      ['Reading', '10 pages a day, when I am on a book'],
    ],
  },
  {
    id: 'mental-health',
    title: 'Mental health',
    body: [<>I journal every day, sometimes several times a day, to ground my thoughts. It actually helps a lot.</>],
  },
];
