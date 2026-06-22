import { FaDumbbell, FaAppleAlt, FaBed, FaBrain, FaCapsules } from 'react-icons/fa';

export const metadata = {
  title: 'Health',
  description:
    'How Arnav Chandra approaches health — training, nutrition, sleep, and the habits behind long-term performance.',
  alternates: { canonical: 'https://arnavchandra.com/health' },
};

function Section({
  icon: Icon,
  color,
  bg,
  title,
  children,
}: {
  icon: React.ElementType;
  color: string;
  bg: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="mb-4 rounded-2xl p-6"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
          <Icon size={16} style={{ color }} />
        </div>
        <h2 className="font-poppins font-semibold text-base tracking-tight" style={{ color: 'var(--fg)' }}>
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Pill({ text }: { text: string }) {
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
      style={{ background: 'var(--hover-bg)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}
    >
      {text}
    </span>
  );
}

export default function HealthPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-poppins font-semibold text-4xl mb-2 tracking-tight" style={{ color: 'var(--fg)' }}>
        Health
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--fg-dim)' }}>
        My personal health protocol — what I do, why I do it, and what I&apos;ve learned.
      </p>

      <Section icon={FaDumbbell} color="#60a5fa" bg="rgba(96,165,250,0.12)" title="Training">
        <div className="space-y-4 text-[0.9rem] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          <p>
            In the summer I run a Push/Pull/Legs split 3 times a week, alternating with 3 runs. In winter I shift to 5 days of weights plus one run, running a PPL + Upper/Lower structure.
          </p>
          <p>
            I film myself lifting when I can. Watching form on video catches things you can&apos;t feel in the moment. I also spend time researching training methodology and adjusting my program based on what I find.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {['Push / Pull / Legs', 'Upper / Lower', 'Running 3×/week', 'Form review on video'].map(t => <Pill key={t} text={t} />)}
          </div>
        </div>
      </Section>

      <Section icon={FaAppleAlt} color="#34d399" bg="rgba(52,211,153,0.12)" title="Nutrition">
        <div className="space-y-4 text-[0.9rem] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          <p>
            I aim for around 120g of protein a day at about 2,500 calories total. I prioritize clean, unprocessed food and don&apos;t track obsessively, but I stay mindful.
          </p>
          <p>
            Breakfast is usually 3 eggs, bread, and fruit, sometimes with oats. I track intake occasionally using Bevel to stay calibrated without making it a daily ritual.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {['~120g protein / day', '~2500 kcal', 'Clean / unprocessed', '3 eggs + bread + fruit', 'Bevel for tracking'].map(t => <Pill key={t} text={t} />)}
          </div>
        </div>
      </Section>

      <Section icon={FaBed} color="#a78bfa" bg="rgba(167,139,250,0.12)" title="Sleep">
        <div className="space-y-4 text-[0.9rem] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          <p>
            I target 7–9 hours. I stop eating 2–4 hours before bed and take magnesium bisglycinate 1–2 hours before sleep. On heavy training days I add casein protein before bed. Screens go off 1–2 hours before sleep, and I stay off them for the first hour after waking up.
          </p>
          <p>
            I sleep in a dark room and read before bed. Planning the next day the night before reduces the mental noise that makes it hard to wind down. Mornings start with sunlight and green tea before 11am.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {['7–9 hrs', 'No screens 1–2hr before/after', 'Dark room', 'Reading before bed', 'Morning sunlight', 'Green tea before 11am'].map(t => <Pill key={t} text={t} />)}
          </div>
        </div>
      </Section>

      <Section icon={FaBrain} color="#f472b6" bg="rgba(244,114,182,0.12)" title="Mental Health">
        <div className="space-y-4 text-[0.9rem] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          <p>
            Writing my newsletter is genuinely one of the best things I do for my mental state. Organizing thoughts into something coherent creates accountability that journaling alone doesn&apos;t.
          </p>
          <p>
            Planning my days the night before reduces morning decision fatigue. Consistency in training helps more than almost anything else — when the physical side is dialed in, the mental side tends to follow.
          </p>
        </div>
      </Section>

      <Section icon={FaCapsules} color="#fbbf24" bg="rgba(251,191,36,0.12)" title="Supplements">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { name: 'Omega-3', note: 'Daily' },
            { name: 'Vitamin D3 + K2', note: 'Daily' },
            { name: 'Creatine', note: '5g daily' },
            { name: 'Protein Powder', note: 'Post-training' },
            { name: 'Magnesium Bisglycinate', note: '1–2hr before bed' },
            { name: 'Casein Powder', note: 'Heavy training days' },
          ].map(({ name, note }) => (
            <div key={name} className="rounded-xl p-3.5" style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)' }}>
              <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--fg)' }}>{name}</p>
              <p className="text-xs" style={{ color: 'var(--fg-dim)' }}>{note}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
