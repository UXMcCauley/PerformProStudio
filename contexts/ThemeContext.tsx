'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserSettings, upsertUserSettings } from '@/lib/supabase';

type DaisyUITheme = 'nord' | 'synthwave';

interface ThemeContextType {
  theme: DaisyUITheme;
  setTheme: (theme: DaisyUITheme) => void;
  availableThemes: DaisyUITheme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const availableThemes: DaisyUITheme[] = ['nord', 'synthwave'];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<DaisyUITheme>('nord');

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

  const setTheme = async (newTheme: DaisyUITheme) => {
    setThemeState(newTheme);

    if (user?.id) {
      await upsertUserSettings(user.id, newTheme);
    } else {
      localStorage.setItem('theme', newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, availableThemes }}>
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