'use client';

import { useRef, useCallback } from 'react';

/**
 * Custom hook enabling mouse-drag horizontal scrolling on desktop.
 * On mobile, native touch scroll works already via overflow-x: auto.
 * This hook adds click-and-drag scrolling for desktop users.
 *
 * Returns a callback ref so listeners are re-attached whenever React
 * replaces the underlying DOM element (e.g. during re-renders in PeakTimeline).
 *
 * Prevents child click events when dragging (to avoid accidental button clicks).
 */
export function useDragScroll<T extends HTMLElement = HTMLDivElement>() {
  const elRef = useRef<T | null>(null);
  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = useCallback((e: MouseEvent) => {
    const el = elRef.current;
    if (!el) return;
    isDragging.current = true;
    hasMoved.current = false;
    startX.current = e.pageX - el.offsetLeft;
    scrollLeft.current = el.scrollLeft;
    el.style.cursor = 'grabbing';
    el.style.userSelect = 'none';
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const el = elRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const diff = x - startX.current;
    if (Math.abs(diff) > 5) {
      hasMoved.current = true;
    }
    const walk = diff * 1.5;
    el.scrollLeft = scrollLeft.current - walk;
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    const el = elRef.current;
    if (el) {
      el.style.cursor = 'grab';
      el.style.removeProperty('user-select');
    }
  }, []);

  const onClick = useCallback((e: MouseEvent) => {
    if (hasMoved.current) {
      e.preventDefault();
      e.stopPropagation();
      hasMoved.current = false;
    }
  }, []);

  // Callback ref: called with the new element (or null) on every DOM replacement
  const callbackRef = useCallback(
    (el: T | null) => {
      // Detach from the previous element
      if (elRef.current) {
        const prev = elRef.current;
        prev.removeEventListener('mousedown', onMouseDown);
        prev.removeEventListener('click', onClick, true);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      }

      elRef.current = el;

      // Attach to the new element
      if (el) {
        el.style.cursor = 'grab';
        el.addEventListener('mousedown', onMouseDown);
        el.addEventListener('click', onClick, true);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      }
    },
    [onMouseDown, onMouseMove, onMouseUp, onClick],
  );

  return callbackRef;
}
