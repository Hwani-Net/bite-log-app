"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";

type SnapPoint = "collapsed" | "half" | "expanded";

interface BottomSheetProps {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  title?: string;
  initialSnap?: SnapPoint;
}

const snapHeights: Record<SnapPoint, string> = {
  collapsed: "10vh",
  half: "50vh",
  expanded: "90vh",
};

export default function BottomSheet({
  children,
  open,
  onClose,
  title,
  initialSnap = "half",
}: BottomSheetProps) {
  const [snap, setSnap] = useState<SnapPoint>(initialSnap);
  const startY = useRef(0);
  const currentHeight = useRef(0);

  useEffect(() => {
    if (open) setSnap(initialSnap);
  }, [open, initialSnap]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    const el = e.currentTarget.parentElement;
    if (el) currentHeight.current = el.offsetHeight;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const deltaY = e.changedTouches[0].clientY - startY.current;
      const vh = window.innerHeight;

      if (deltaY > 80) {
        if (snap === "expanded") setSnap("half");
        else if (snap === "half") onClose();
        else onClose();
      } else if (deltaY < -80) {
        if (snap === "collapsed") setSnap("half");
        else if (snap === "half") setSnap("expanded");
      }
    },
    [snap, onClose],
  );

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-[998] transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[999] bg-white dark:bg-surface-dark rounded-t-3xl border-t border-slate-200/50 dark:border-slate-700/50 shadow-lg transition-all duration-500"
        style={{
          height: snapHeights[snap],
          maxWidth: "28rem",
          margin: "0 auto",
        }}
      >
        {/* Handle */}
        <div
          className="flex justify-center pt-2 pb-1 cursor-grab"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Content */}
        <div
          className="overflow-y-auto px-5 pb-8"
          style={{ height: "calc(100% - 56px)" }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
