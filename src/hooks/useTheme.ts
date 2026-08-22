import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system');
  const [activeTheme, setActiveTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (currentTheme: Theme) => {
      const isDark =
        currentTheme === 'dark' || (currentTheme === 'system' && mediaQuery.matches);

      if (isDark) {
        document.documentElement.classList.add('dark');
        setActiveTheme('dark');
      } else {
        document.documentElement.classList.remove('dark');
        setActiveTheme('light');
      }
    };

    applyTheme(theme);

    const listener = () => {
      if (theme === 'system') applyTheme('system');
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = activeTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return { theme: activeTheme, toggleTheme };
}