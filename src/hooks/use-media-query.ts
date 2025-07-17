import { useState, useEffect } from 'react';

// Common breakpoints
export const breakpoints = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',

  // Max-width variants
  maxSm: '(max-width: 639px)',
  maxMd: '(max-width: 767px)',
  maxLg: '(max-width: 1023px)',
  maxXl: '(max-width: 1279px)',
  max2xl: '(max-width: 1535px)',

  // Orientation
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',

  // Hover capability
  hover: '(hover: hover)',
  touch: '(hover: none)',

  // Reduced motion preference
  reducedMotion: '(prefers-reduced-motion: reduce)',

  // Dark mode preference
  darkMode: '(prefers-color-scheme: dark)',
  lightMode: '(prefers-color-scheme: light)',
};

export type BreakpointKey = keyof typeof breakpoints;

/**
 * Hook to check if a media query matches
 * @param query Media query string or predefined breakpoint key
 * @returns Boolean indicating if the media query matches
 */
export function useMediaQuery(query: string | BreakpointKey): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Handle SSR
    if (typeof window === 'undefined') return;

    // Use predefined breakpoint if provided
    const mediaQuery = breakpoints[query as BreakpointKey] || query;

    const media = window.matchMedia(mediaQuery);

    // Set initial value
    setMatches(media.matches);

    // Define callback for media query change
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener
    media.addEventListener('change', listener);

    // Clean up
    return () => {
      media.removeEventListener('change', listener);
    };
  }, [query]);

  return matches;
}

/**
 * Hook to get the current breakpoint
 * @returns Current breakpoint ('xs', 'sm', 'md', 'lg', 'xl', '2xl')
 */
export function useBreakpoint(): 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' {
  const sm = useMediaQuery('sm');
  const md = useMediaQuery('md');
  const lg = useMediaQuery('lg');
  const xl = useMediaQuery('xl');
  const xxl = useMediaQuery('2xl');

  if (xxl) return '2xl';
  if (xl) return 'xl';
  if (lg) return 'lg';
  if (md) return 'md';
  if (sm) return 'sm';
  return 'xs';
}

/**
 * Hook to check if the device is mobile
 * @returns Boolean indicating if the device is mobile
 */
export function useMobileDetect(): { isMobile: boolean; isTablet: boolean; isDesktop: boolean } {
  const md = useMediaQuery('md');
  const lg = useMediaQuery('lg');

  return {
    isMobile: !md,
    isTablet: md && !lg,
    isDesktop: lg,
  };
}