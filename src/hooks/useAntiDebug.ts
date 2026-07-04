import { useEffect, useState } from 'react';

export function useAntiDebug() {
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);

  useEffect(() => {
    if (import.meta.env.VITE_ENABLE_ANTI_DEBUG === 'false') return;

    // Detect DevTools by checking difference between window outer and inner dimensions
    // This detects docked DevTools
    const checkDevTools = () => {
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      
      if (widthDiff || heightDiff) {
        setIsDevToolsOpen(true);
      } else {
        setIsDevToolsOpen(false);
      }
    };

    // Keyboard protection
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
      }
      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
      }
      // Ctrl+U
      if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
      }
    };

    const intervalId = setInterval(() => {
        checkDevTools();
    }, 1000);
    
    // Initial check
    checkDevTools();

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('resize', checkDevTools);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('resize', checkDevTools);
    };
  }, []);

  return isDevToolsOpen;
}
