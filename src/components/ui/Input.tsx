"use client";

import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full rounded-xl border bg-white dark:bg-slate-800
              px-4 py-3 text-sm text-slate-900 dark:text-white
              placeholder:text-slate-400 dark:placeholder:text-slate-500
              outline-none transition-all duration-150
              ${icon ? "pl-10" : ""}
              ${
                error
                  ? "border-error focus:ring-2 focus:ring-error/20"
                  : "border-slate-200 dark:border-slate-600 focus:border-primary focus:ring-2 focus:ring-primary/20"
              }
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-error font-medium">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
export default Input;
