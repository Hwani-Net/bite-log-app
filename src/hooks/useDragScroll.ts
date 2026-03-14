'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook enabling mouse-drag horizontal scrolling on desktop.
 * On mobile, native touch scroll works already via overflow-x: auto.
 * 
 * Returns a callback ref so listeners are re-attached whenever React
 * replaces the underlying DOM element.
 */
export function useDragScroll<T extends HTMLElement = HTMLDivElement>() {
  const [element, setElement] = useState<T | null>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });
  const hasMoved = useRef(false);

  useEffect(() => {
    if (!element) return;

    const onMouseDown = (e: MouseEvent) => {
      // Only handle primary button
      if (e.button !== 0) return;

      isDragging.current = true;
      hasMoved.current = false;
      dragStart.current = {
        x: e.pageX - element.offsetLeft,
        scrollLeft: element.scrollLeft
      };
      
      element.style.cursor = 'grabbing';
      element.style.userSelect = 'none';

      // Attach to window only while active dragging
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      
      const x = e.pageX - element.offsetLeft;
      const walk = (x - dragStart.current.x) * 1.5;
      
      if (Math.abs(x - dragStart.current.x) > 5) {
        hasMoved.current = true;
      }
      
      element.scrollLeft = dragStart.current.scrollLeft - walk;
    };

    const onMouseUp = () => {
      isDragging.current = false;
      element.style.cursor = 'grab';
      element.style.removeProperty('user-select');
      
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    const onClick = (e: MouseEvent) => {
      if (hasMoved.current) {
        e.preventDefault();
        e.stopPropagation();
        hasMoved.current = false;
      }
    };

    element.addEventListener('mousedown', onMouseDown);
    element.addEventListener('click', onClick, true); // Use capture phase to block child clicks
    element.style.cursor = 'grab';

    return () => {
      element.removeEventListener('mousedown', onMouseDown);
      element.removeEventListener('click', onClick, true);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [element]);

  // Return a stable setter function
  return useCallback((el: T | null) => setElement(el), []);
}
