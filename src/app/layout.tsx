import type { Metadata } from 'next';
import {
  Bricolage_Grotesque,
  JetBrains_Mono,
  Plus_Jakarta_Sans,
} from 'next/font/google';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PlantifyPH',
  description:
    'A modern plant care, personal collection, watering schedule, health tracking, and gardening knowledge platform for plant enthusiasts in the Philippines.',
  openGraph: {
    title: 'PlantifyPH',
    description:
      'A modern plant care, personal collection, watering schedule, health tracking, and gardening knowledge platform for plant enthusiasts in the Philippines.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${jakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-[#F7F9F7] text-[#13241B] selection:bg-[#1B4D3E] selection:text-white">
        {children}
      </body>
    </html>
  );
}
