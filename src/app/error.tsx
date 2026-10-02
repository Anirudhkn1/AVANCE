"use client";

import { useEffect } from "react";
import { Button, Card, EmptyState } from "@/components/ui";

// Every page reads from the remote database, so on a weak connection a
// render can still fail after the client's own retries (src/lib/prisma.ts).
// Without this, that showed Next's blank "Application error" screen; this
// keeps the navbar and offers a retry that re-fetches just the page.
export default function PageError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16">
      <Card>
        <EmptyState
          title="Couldn't load this page"
          description="This is usually a dropped or slow internet connection. Check your connection, then try again."
          action={<Button onClick={() => retry()}>Try again</Button>}
        />
      </Card>
    </div>
  );
}
