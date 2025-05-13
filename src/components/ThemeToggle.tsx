import { useTheme } from '../ThemeContext';
import '../styles/ThemeToggle.css';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button 
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' 
        ? <Moon size={20} strokeWidth={2} className="theme-icon" /> 
        : <Sun size={20} strokeWidth={2} className="theme-icon" />
      }
    </button>
  );
} 