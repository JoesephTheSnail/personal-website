import ContactTrigger from './ContactTrigger';
import { LINKS } from '@/lib/links';

/**
 * The two actions that close the home page, repeated in the home hero and at
 * the end of every project page: open the contact dialog, or go read the
 * newsletter. Renders the two controls only; the caller supplies the row.
 */
export default function ContactActions({ size = 'lg' }: { size?: 'md' | 'lg' }) {
  const text = size === 'md' ? 'text-[1rem]' : 'text-[1.125rem]';
  return (
    <>
      <ContactTrigger className={`tap-44 proud-link pb-1 ${text} tracking-[-0.01em]`} style={{ color: 'var(--fg)' }}>
        Get in touch <span aria-hidden="true">→</span>
      </ContactTrigger>
      <a
        href={LINKS.substack}
        target="_blank"
        rel="noopener noreferrer"
        className={`tap-44 rail-link inline-block border-b pb-1 ${text} tracking-[-0.01em]`}
        style={{ borderColor: 'var(--border-med)', color: 'var(--fg-70)' }}
      >
        Read my newsletter <span aria-hidden="true">↗</span>
      </a>
    </>
  );
}
