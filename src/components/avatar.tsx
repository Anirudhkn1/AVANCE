import { avatarDataUri } from "@/lib/avatar";

// Split out from ui.tsx so the DiceBear dependency it pulls in
// (src/lib/avatar.ts) never gets bundled into client components that only
// need ui.tsx's other exports (Button, Card, ...) — ui.tsx re-exports this
// unchanged, so every existing `import { Avatar } from "@/components/ui"`
// keeps working.

const SIZES = { sm: "h-6 w-6", md: "h-9 w-9", lg: "h-14 w-14" } as const;
const PIXELS = { sm: 48, md: 72, lg: 112 } as const; // rendered ~2x the CSS size for crispness

export function Avatar({ seed, size = "md" }: { seed: string; size?: "sm" | "md" | "lg" }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a generated SVG data: URI, not an optimizable remote/static image
    <img
      src={avatarDataUri(seed, PIXELS[size])}
      alt=""
      aria-hidden
      className={`inline-block rounded-full bg-surface-muted ${SIZES[size]}`}
    />
  );
}
