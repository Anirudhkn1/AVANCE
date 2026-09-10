"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui";
import { PasswordField } from "@/components/password-field";
import { CartoonKeyboard, type KeyActivity } from "@/components/cartoon-keyboard";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(loginAction, undefined);
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
            <p className="text-sm text-muted mt-1">Sign in to continue your quest.</p>
          </div>
          <form action={formAction} className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
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
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="password">
                Password
              </label>
              <PasswordField
                id="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                onKeyActivity={bump}
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted">
            New to Avance?{" "}
            <Link href="/register" className="text-accent font-medium">
              Create an account
            </Link>
          </p>
          <div className="mt-6 rounded-xl border border-border bg-surface-muted p-3 text-xs text-muted">
            <p className="font-medium text-foreground mb-1">Demo accounts</p>
            <p>Host: host@avance.dev</p>
            <p>Student: student1@avance.dev</p>
            <p>Password (all): password123</p>
          </div>
        </div>
        <div className="order-1 sm:order-2 sm:pt-16">
          <CartoonKeyboard activity={activity} />
        </div>
      </div>
    </div>
  );
}
