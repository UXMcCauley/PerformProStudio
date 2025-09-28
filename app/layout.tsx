import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lyric Teleprompter',
  description: 'Music studio lyric teleprompter with AI formatting',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}