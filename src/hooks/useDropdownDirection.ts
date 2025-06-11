import { useState, useEffect, useCallback } from 'react';
import type { RefObject } from 'react';

interface UseDropdownDirectionOptions {
  isOpen: boolean;
  dropdownHeight?: number;
  offset?: number;
}

export const useDropdownDirection = (
  containerRef: RefObject<HTMLElement | null>,
  options: UseDropdownDirectionOptions
) => {
  const { isOpen, dropdownHeight = 320, offset = 50 } = options;
  const [shouldOpenUpwards, setShouldOpenUpwards] = useState(false);

  const calculateDirection = useCallback(() => {
    if (!containerRef.current || !isOpen) return;

    const rect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Calculate the actual dropdown height based on viewport constraints
    // Use 40vh as max height (matching CSS), but at least 200px for usability
    const maxDropdownHeight = Math.max(viewportHeight * 0.4, 200);
    const actualDropdownHeight = Math.min(dropdownHeight, maxDropdownHeight);
    
    // Reduce offset requirement for better responsiveness
    const minOffset = Math.min(offset, 20);

    // Open upwards if:
    // 1. There's insufficient space below, OR
    // 2. There's more space above than below (when both are limited)
    const insufficientSpaceBelow = spaceBelow < (actualDropdownHeight + minOffset);
    const moreSpaceAbove = spaceAbove > spaceBelow;
    
    // Always prefer upwards when there's not enough space below and reasonable space above
    const shouldOpen = insufficientSpaceBelow && (spaceAbove >= 150 || moreSpaceAbove);
    
    setShouldOpenUpwards(shouldOpen);
  }, [containerRef, isOpen, dropdownHeight, offset]);

  // Calculate direction when dropdown opens
  useEffect(() => {
    if (isOpen) {
      calculateDirection();
    }
  }, [isOpen, calculateDirection]);

  // Recalculate on scroll and resize events
  useEffect(() => {
    if (isOpen) {
      const handleResize = () => calculateDirection();
      const handleScroll = () => calculateDirection();

      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen, calculateDirection]);

  return shouldOpenUpwards;
}; 