import { useState, useEffect, useCallback } from 'react';

export function useFullscreen(containerRef: React.RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false);
    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('exitFullscreen failed:', err);
    }
  }, []);

  const requestFullscreen = useCallback(async () => {
    setIsFullscreen(true);
    try {
      const elem = containerRef.current;
      if (elem && !document.fullscreenElement) {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          await (elem as any).webkitRequestFullscreen();
        }
      }
    } catch (err) {
      console.warn('requestFullscreen blocked, using CSS overlay:', err);
    }
  }, [containerRef]);

  const toggleFullscreen = useCallback(
    (canToggle: boolean = true) => {
      if (!canToggle) return;
      if (isFullscreen) {
        exitFullscreen();
      } else {
        requestFullscreen();
      }
    },
    [isFullscreen, exitFullscreen, requestFullscreen]
  );

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        exitFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, exitFullscreen]);

  return {
    isFullscreen,
    toggleFullscreen,
    exitFullscreen,
    requestFullscreen,
  };
}
