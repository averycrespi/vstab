import { useEffect, useState } from 'react';
import { Theme } from '@shared/types';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    // Apply theme to document root
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Determine if the current resolved theme is dark
  const isDarkTheme = () => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    // For 'system', check the actual system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  return { theme, setTheme, isDarkTheme: isDarkTheme() };
}
