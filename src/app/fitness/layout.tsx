import { JetBrains_Mono } from 'next/font/google';
import './fitness.css';

const fitnessMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-fitness-mono',
});

export default function FitnessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${fitnessMono.variable} fitness-scope rounded-xl p-4 sm:p-6 -mx-1`}>
      {children}
    </div>
  );
}
