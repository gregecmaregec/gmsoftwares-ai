import { useState, useEffect } from 'react';

// Enhanced debounced text input that's immediate on desktop but debounced on mobile
export const useDebouncedValue = (value: string, delay: number = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Check if we're on desktop for immediate search
    const isDesktop = window.innerWidth >= 768;
    const actualDelay = isDesktop ? 0 : delay; // Immediate on desktop, debounced on mobile

    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, actualDelay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}; 