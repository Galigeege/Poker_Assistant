import { useState, useEffect } from 'react';

/**
 * Hook to detect mobile mode based on screen width
 * Uses matchMedia for efficient breakpoint detection
 * Mobile mode is triggered when width < 768px
 */
export function useMobileMode(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    // Check initial state
    if (typeof window !== 'undefined') {
      return window.matchMedia('(max-width: 767px)').matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    
    // Handler for media query changes
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    // Add listener
    mediaQuery.addEventListener('change', handleChange);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isMobile;
}

