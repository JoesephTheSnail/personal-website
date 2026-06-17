import Image from 'next/image';
import ContactTrigger from '@/components/ContactTrigger';

export default function HomePage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-poppins font-semibold text-4xl mb-8 tracking-tight" style={{ color: 'var(--fg)' }}>
        Hey, I&apos;m Arnav 👋
      </h1>

      <div className="flex flex-col sm:flex-row gap-7 items-start mb-10">
        <div className="flex-shrink-0">
          <div
            className="w-28 h-28 rounded-full overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_0_3px_rgba(255,255,255,0.12)]"
            style={{ border: '1px solid var(--border-med)' }}
          >
            <Image src="/profile.jpg" alt="Arnav Chandra" width={112} height={112} className="w-full h-full object-cover transition-all duration-300 hover:brightness-110 hover:saturate-110" />
          </div>
        </div>
        <div className="space-y-4 text-[0.9375rem] leading-loose" style={{ color: 'var(--fg-70)' }}>
          <p>I&apos;m a high school student from Toronto focused on health and technology. I intern at TuffTek, research at NewGen Health, and build products on the side.</p>
          <p>Outside of that, I train, read non-fiction, and write about whatever I&apos;m learning.</p>
        </div>
      </div>

      <hr className="mb-8" style={{ borderColor: 'var(--border)' }} />

      <section className="mb-10">
        <h2 className="font-poppins font-semibold text-lg mb-4 tracking-tight" style={{ color: 'var(--fg)' }}>
          How I spend my time
        </h2>
        <ul className="space-y-2.5">
          {[
            <>Reading — mostly non-fiction on psychology, habits, and human behaviour</>,
            <>Writing <a href="https://arnav01.substack.com/" target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-2" style={{ color: 'var(--fg)' }}><strong>Mindset Matters</strong></a> — exploring mindset, growth, and the ideas I can&apos;t stop thinking about</>,
            <>Training — lifting 4–5x a week and researching optimal strategies for strength and recovery</>,
            <>Posting on my{' '}<a href="https://www.tiktok.com/@arnav.gym" target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-2" style={{ color: 'var(--fg)' }}><strong>gym page</strong></a>{' '}and documenting the process</>,
          ].map((item, i) => (
            <li key={i} className="flex gap-3 text-[0.9rem]" style={{ color: 'var(--fg-muted)' }}>
              <span className="mt-0.5 flex-shrink-0" style={{ color: 'var(--fg)' }}>→</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="font-poppins font-semibold text-lg mb-4 tracking-tight" style={{ color: 'var(--fg)' }}>
          Currently
        </h2>
        <ul className="space-y-2.5">
          {[
            <>Interning as Junior Technical Specialist at{' '}<a href="https://www.tufftek.ca/" target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-2" style={{ color: 'var(--fg)' }}><strong>TuffTek</strong></a></>,
            <>Researching at{' '}<a href="https://www.newgenhealth.ca/" target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-2" style={{ color: 'var(--fg)' }}><strong>NewGen Health</strong></a></>,
            <>VP of DECA Communications at St Judes Academy</>,
            <>CFO on Student Council</>,
            <>Swimming Instructor at the Town of Milton</>,
            <>Host on{' '}<a href="https://open.spotify.com/show/033gHGakjyhCOdgjDiLByc" target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-2" style={{ color: 'var(--fg)' }}><strong>The Huddle Podcast</strong></a>{' '}for St Judes Academy</>,
          ].map((item, i) => (
            <li key={i} className="flex gap-3 text-[0.9rem]" style={{ color: 'var(--fg-muted)' }}>
              <span className="mt-0.5 flex-shrink-0" style={{ color: 'var(--fg)' }}>→</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-[0.8125rem]" style={{ color: 'var(--fg-30)' }}>
        Want to connect?{' '}
        <ContactTrigger className="hover:underline underline-offset-2 text-[0.8125rem]" style={{ color: 'var(--fg)' }}>
          Click here
        </ContactTrigger>
      </p>
    </div>
  );
}
