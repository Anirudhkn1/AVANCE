"use client";

import { useState, type KeyboardEvent } from "react";

/** Password input with a show/hide toggle, reused by login and register. */
export function PasswordField({
  id,
  name,
  required,
  minLength,
  autoComplete,
  placeholder,
  onKeyActivity,
}: {
  id: string;
  name: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  placeholder?: string;
  onKeyActivity?: (key: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    onKeyActivity?.(e.key);
  }

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onKeyDown={handleKeyDown}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-foreground"
        tabIndex={-1}
      >
        {visible ? "🙈" : "👁️"}
      </button>
    </div>
  );
}
