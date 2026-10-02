"use client";

import { useEffect } from "react";

const CHANNEL = "avance:session";
const LAST_RELOAD_KEY = "avance:session-last-reload";

/**
 * Keeps every open tab on the same account. The login cookie is shared by
 * all tabs, so signing in (or out) in one tab silently changes who every
 * other tab acts as — while those tabs still show the previous account's
 * screen until their next navigation. Each tab announces the account it
 * rendered; a tab that hears a different one reloads so what it shows always
 * matches who it's actually signed in as.
 */
export function SessionSync({ userId }: { userId: string | null }) {
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event: MessageEvent<{ userId: string | null }>) => {
      const announced = event.data?.userId ?? null;
      if (announced === userId) return;
      // Guard against two tabs that momentarily disagree (e.g. a token
      // refresh failing in one) reloading each other forever: don't reload
      // twice in a row for the same announced account. A genuinely new
      // change (sign in, then sign out) still goes through.
      try {
        const last = JSON.parse(sessionStorage.getItem(LAST_RELOAD_KEY) ?? "null") as { for: string | null; at: number } | null;
        if (last && last.for === announced && Date.now() - last.at < 10_000) return;
        sessionStorage.setItem(LAST_RELOAD_KEY, JSON.stringify({ for: announced, at: Date.now() }));
      } catch {}
      window.location.reload();
    };
    channel.postMessage({ userId });
    return () => channel.close();
  }, [userId]);

  return null;
}
