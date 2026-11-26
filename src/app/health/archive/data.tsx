import Link from 'next/link';
import type { HealthSection } from '@/components/HealthSections';

// What /health said until October 2026, kept as it was.
export const ARCHIVE_SECTIONS: HealthSection[] = [
  {
    id: 'training',
    title: 'Training',
    body: [
      <>In the summer I run a Push/Pull/Legs split 3 times a week, alternating with 3 runs. In winter I shift to 5 days of weights plus one run, following a PPL + Upper/Lower structure.</>,
      <>I film myself lifting when I can. Watching form on video catches things you can&apos;t feel in the moment. I also spend time researching training methodology and adjusting my program based on what I find.</>,
    ],
    facts: [
      ['Split', 'Push / Pull / Legs, Upper / Lower'],
      ['Running', '3× a week'],
      ['Form', 'Reviewed on video'],
    ],
    note: (
      <>
        I also shared my training on a gym TikTok for a while.{' '}
        <Link
          href="/projects/gym-tiktok"
          className="underline underline-offset-4 decoration-[var(--accent)] hover:decoration-2"
          style={{ color: 'var(--fg-70)' }}
        >
          Read about it
        </Link>
        .
      </>
    ),
  },
  {
    id: 'nutrition',
    title: 'Nutrition',
    body: [
      <>I aim for around 120 g of protein a day at about 2,500 calories total. I prioritize clean, unprocessed food and don&apos;t track obsessively, but I stay mindful.</>,
      <>Breakfast is usually 3 eggs, bread, and fruit, sometimes with oats. I track intake occasionally using Bevel to stay calibrated without making it a daily ritual.</>,
    ],
    facts: [
      ['Protein', '~120 g a day'],
      ['Calories', '~2,500'],
      ['Food', 'Clean, unprocessed'],
      ['Breakfast', '3 eggs, bread, fruit'],
      ['Tracking', 'Bevel, occasionally'],
    ],
  },
  {
    id: 'sleep',
    title: 'Sleep',
    body: [
      <>I target 7–9 hours. I stop eating 2–4 hours before bed and take magnesium bisglycinate 1–2 hours before sleep. On heavy training days I add casein protein before bed. Screens go off 1–2 hours before sleep, and I stay off them for the first hour after waking up.</>,
      <>I sleep in a dark room and read before bed. Planning the next day the night before reduces the mental noise that makes it hard to wind down. Mornings start with sunlight and green tea before 11 a.m..</>,
    ],
    facts: [
      ['Target', '7–9 hours'],
      ['Screens', 'Off 1–2 hr before and after'],
      ['Room', 'Dark'],
      ['Before bed', 'Reading'],
      ['Morning', 'Sunlight'],
      ['Tea', 'Green, before 11 a.m.'],
    ],
  },
  {
    id: 'mental-health',
    title: 'Mental health',
    body: [
      <>Writing my newsletter is one of the best things I do for my mental state. Organizing thoughts into something coherent creates accountability that journaling alone doesn&apos;t.</>,
      <>Planning my days the night before reduces morning decision fatigue. Consistency in training helps more than almost anything else. When the physical side is dialed in, the mental side tends to follow.</>,
    ],
  },
  {
    id: 'supplements',
    title: 'Supplements',
    body: [],
    facts: [
      ['Omega-3', 'Daily'],
      ['Vitamin D3 + K2', 'Daily'],
      ['Creatine', '5 g daily'],
      ['Protein powder', 'Post-training'],
      ['Magnesium bisglycinate', '1–2 hr before bed'],
      ['Casein powder', 'Heavy training days'],
    ],
  },
];

