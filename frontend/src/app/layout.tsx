import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900']
});

export const metadata: Metadata = {
  title: 'SmartGrid+ | AI Electricity Management',
  description: 'AI-powered electricity bill management — monitor consumption, detect anomalies, predict usage.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-animated`}>
        {children}
      </body>
    </html>
  );
}
