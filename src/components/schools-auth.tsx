"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction } from "@/actions/auth";
import { PasswordField } from "@/components/password-field";

const inputClass =
  "w-full rounded-lg border-2 border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent";

/**
 * Sign in / sign up inside Avance Schools — same accounts and actions as the
 * main app's /login and /register, dressed as a page torn from a notebook.
 */
export function SchoolsAuthForm({ mode, next }: { mode: "login" | "register"; next: string }) {
  const [error, formAction, pending] = useActionState(mode === "login" ? loginAction : registerAction, undefined);
  const other = mode === "login" ? "/school/register" : "/school/login";

  return (
    <div className="schools-auth__card">
      <h1 className="schools-auth__heading">{mode === "login" ? "Sign in to class" : "Join Avance Schools"}</h1>
      <p className="mt-1 text-sm text-muted">
        {mode === "login" ? "Parents, teachers and school office." : "One account for your kids' homework and class notices."}
      </p>

      <form action={formAction} className="mt-5 space-y-4">
        <input type="hidden" name="next" value={next} />
        {mode === "register" && (
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="name">
              Your name
            </label>
            <input id="name" name="name" type="text" required autoComplete="name" className={inputClass} placeholder="Priya Sharma" />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} placeholder="you@gmail.com" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <PasswordField
            id="password"
            name="password"
            required
            minLength={mode === "register" ? 8 : undefined}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder={mode === "login" ? "••••••••" : "At least 8 characters"}
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" className="schools-auth__submit" disabled={pending}>
          {pending ? (mode === "login" ? "Signing in…" : "Creating account…") : mode === "login" ? "Enter class →" : "Create account →"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        {mode === "login" ? "New to Avance? " : "Already have an account? "}
        <Link href={`${other}?next=${encodeURIComponent(next)}`} className="font-medium text-accent hover:underline">
          {mode === "login" ? "Create an account" : "Sign in"}
        </Link>
      </p>

      {mode === "login" && (
        <div className="mt-5 rounded-xl border-2 border-dashed border-border px-3 py-2.5 text-xs text-muted">
          <p className="mb-1 font-medium text-foreground">Demo school (password123)</p>
          <p>
            Parent: <span className="font-typed">parent@avance.dev</span>
          </p>
          <p>
            Teacher: <span className="font-typed">teacher@avance.dev</span>
          </p>
          <p>
            Principal: <span className="font-typed">principal@avance.dev</span>
          </p>
        </div>
      )}
    </div>
  );
}
