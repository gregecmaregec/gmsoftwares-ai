import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'ultra-black';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  getThemeDisplayName: (theme: Theme) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check for saved theme preference or use system preference
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && ['light', 'dark', 'ultra-black'].includes(savedTheme)) {
      return savedTheme;
    }
    
    return window.matchMedia('(prefers-color-scheme: dark)').matches 
      ? 'dark' 
      : 'light';
  });

  // Update document attributes, background colors, and localStorage when theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Define background colors for each theme (same as in index.html)
    const themeColors = {
      'light': '#F7EFE6',
      'dark': '#1E1E1E',
      'ultra-black': '#000000'
    };
    
    const bgColor = themeColors[theme];
    
    // Only update theme-color meta tag for browser chrome
    // Let CSS handle all background color transitions for consistent timing
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', bgColor);
    }
    
    // Add loaded class immediately to enable transitions without flash
    // This prevents the flash of wrong theme on page load
    if (!document.documentElement.classList.contains('loaded')) {
      // Apply theme immediately without delay to prevent flash
      document.documentElement.classList.add('loaded');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => {
      // Cycle through: light → dark → ultra-black → light
      switch (prevTheme) {
        case 'light':
          return 'dark';
        case 'dark':
          return 'ultra-black';
        case 'ultra-black':
          return 'light';
        default:
          return 'light';
      }
    });
  }, []);

  const getThemeDisplayName = useCallback((theme: Theme): string => {
    switch (theme) {
      case 'light':
        return 'Light mode';
      case 'dark':
        return 'Dark mode';
      case 'ultra-black':
        return 'Ultra dark mode';
      default:
        return 'Light mode';
    }
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    theme,
    toggleTheme,
    getThemeDisplayName
  }), [theme, toggleTheme, getThemeDisplayName]);

  return (
    <ThemeContext.Provider value={contextValue}>
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