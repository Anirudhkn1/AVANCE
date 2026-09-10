"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { registerAction } from "@/actions/auth";
import { Button } from "@/components/ui";
import { PasswordField } from "@/components/password-field";
import { CartoonKeyboard, type KeyActivity } from "@/components/cartoon-keyboard";

export default function RegisterPage() {
  const [error, formAction, pending] = useActionState(registerAction, undefined);
  const [activity, setActivity] = useState<KeyActivity>(null);

  function bump() {
    setActivity((prev) => ({ nonce: (prev?.nonce ?? 0) + 1 }));
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-center gap-6">
        <div className="w-full max-w-sm order-2 sm:order-1">
          <div className="mb-8 text-center">
            <Link href="/" className="text-xl font-semibold tracking-tight">
              Avance
            </Link>
            <p className="text-sm text-muted mt-1">Turn your next assignment into a quest.</p>
          </div>
          <form action={formAction} className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="name">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                onKeyDown={bump}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
                placeholder="Ani Kumar"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
                placeholder="you@gmail.com"
              />
              <p className="text-xs text-muted mt-1">Works for students and lecturers alike — Gmail or any email.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="password">
                Password
              </label>
              <PasswordField
                id="password"
                name="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                onKeyActivity={bump}
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-accent font-medium">
              Sign in
            </Link>
          </p>
        </div>
        <div className="order-1 sm:order-2 sm:pt-16">
          <CartoonKeyboard activity={activity} />
        </div>
      </div>
    </div>
  );
}
