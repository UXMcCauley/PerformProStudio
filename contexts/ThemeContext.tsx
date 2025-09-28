'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type DaisyUITheme =
  | 'nord'
  | 'synthwave'

interface ThemeContextType {
  theme: DaisyUITheme;
  effectiveTheme: string;
  setTheme: (theme: DaisyUITheme) => void;
  availableThemes: DaisyUITheme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const availableThemes: DaisyUITheme[] = [
  'nord',
  'synthwave',
];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<DaisyUITheme>('synthwave');
  const [effectiveTheme, setEffectiveTheme] = useState<string>('synthwave');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as DaisyUITheme;
    if (savedTheme && availableThemes.includes(savedTheme)) {
      setThemeState(savedTheme);
    }
  }, []);

  useEffect(() => {
    const updateEffectiveTheme = () => {
      setEffectiveTheme(theme);
    };

    updateEffectiveTheme();

    return () => {
      document.documentElement.setAttribute('data-theme', theme);
    };
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }, [effectiveTheme]);

  const setTheme = (newTheme: DaisyUITheme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
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