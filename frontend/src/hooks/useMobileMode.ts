import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * 检测是否为移动端模式
 * 只在宽度 < 768px 时返回 true
 * 使用 matchMedia 监听，性能更好
 */
export function useMobileMode(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };

    // 初始检查
    handleChange(mediaQuery);

    // 监听变化
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isMobile;
}

export default useMobileMode;

