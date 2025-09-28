'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserSettings, upsertUserSettings } from '@/lib/supabase';

type DaisyUITheme = 'light' | 'dark';

interface ThemeContextType {
  theme: DaisyUITheme;
  effectiveTheme: string;
  setTheme: (theme: DaisyUITheme) => void;
  availableThemes: DaisyUITheme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const availableThemes: DaisyUITheme[] = ['light', 'dark'];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<DaisyUITheme>('dark');
  const [effectiveTheme, setEffectiveTheme] = useState<string>('dark');

  useEffect(() => {
    const loadTheme = async () => {
      if (user?.id) {
        const settings = await getUserSettings(user.id);
        if (settings?.theme) {
          setThemeState(settings.theme);
        }
      } else {
        const savedTheme = localStorage.getItem('theme') as DaisyUITheme;
        if (savedTheme && availableThemes.includes(savedTheme)) {
          setThemeState(savedTheme);
        }
      }
    };

    loadTheme();
  }, [user?.id]);

  useEffect(() => {
    setEffectiveTheme(theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }, [effectiveTheme]);

  const setTheme = async (newTheme: DaisyUITheme) => {
    setThemeState(newTheme);

    if (user?.id) {
      try {
        const result = await upsertUserSettings(user.id, newTheme);
        if (!result) {
          console.warn('Failed to save theme to database, falling back to localStorage');
          localStorage.setItem('theme', newTheme);
        }
      } catch (error) {
        console.error('Error saving theme:', error);
        localStorage.setItem('theme', newTheme);
      }
    } else {
      localStorage.setItem('theme', newTheme);
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