'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type DaisyUITheme = 'light' | 'dark';

interface ThemeContextType {
  theme: DaisyUITheme;
  effectiveTheme: string;
  setTheme: (theme: DaisyUITheme) => void;
  availableThemes: DaisyUITheme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const availableThemes: DaisyUITheme[] = ['light', 'dark'];

// Get initial theme from localStorage to avoid flash
function getInitialTheme(): DaisyUITheme {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('theme') as DaisyUITheme;
    if (savedTheme && availableThemes.includes(savedTheme)) {
      return savedTheme;
    }
  }
  return 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [theme, setThemeState] = useState<DaisyUITheme>(getInitialTheme);
  const [effectiveTheme, setEffectiveTheme] = useState<string>(getInitialTheme);
  const hasFetchedFromDb = useRef(false);

  // Load theme from database once user is authenticated
  useEffect(() => {
    const loadThemeFromDb = async () => {
      // Only fetch from DB if user is logged in and we haven't fetched yet
      if (user?.id && !hasFetchedFromDb.current) {
        hasFetchedFromDb.current = true;
        try {
          const response = await fetch('/api/settings');
          if (response.ok) {
            const settings = await response.json();
            if (settings?.theme && availableThemes.includes(settings.theme)) {
              setThemeState(settings.theme);
              // Sync localStorage with database
              localStorage.setItem('theme', settings.theme);
            }
          }
        } catch (error) {
          console.error('Error loading theme from database:', error);
        }
      }
    };

    // Wait for auth to settle before fetching
    if (!authLoading) {
      loadThemeFromDb();
    }
  }, [user?.id, authLoading]);

  // Reset the fetch flag when user logs out
  useEffect(() => {
    if (!user?.id) {
      hasFetchedFromDb.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    setEffectiveTheme(theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }, [effectiveTheme]);

  const setTheme = async (newTheme: DaisyUITheme) => {
    setThemeState(newTheme);
    // Always save to localStorage for quick loading on next visit
    localStorage.setItem('theme', newTheme);

    if (user?.id) {
      try {
        const response = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme: newTheme }),
        });
        if (!response.ok) {
          console.warn('Failed to save theme to database');
        }
      } catch (error) {
        console.error('Error saving theme:', error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme, availableThemes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}