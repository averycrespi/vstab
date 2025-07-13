import { useState, useEffect } from 'react';

export function useWindowVisibility() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    const checkVisibility = async () => {
      try {
        const frontmostApp = await window.vstab.getFrontmostApp();
        console.log('Frontmost app:', frontmostApp);
        const shouldShow = frontmostApp.includes('Code') || frontmostApp.includes('vstab') || frontmostApp.includes('Electron');
        console.log('Should show:', shouldShow);
        setIsVisible(shouldShow);
      } catch (error) {
        console.error('Error checking visibility:', error);
      }
    };

    // Check immediately
    checkVisibility();

    // Then check every 500ms
    intervalId = setInterval(checkVisibility, 500);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  return { isVisible };
}