import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

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
    <html className="theme-root" lang="en">
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            <ProtectedRoute>
              {children}
            </ProtectedRoute>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}