import { avatarSrc } from "@/lib/avatar-url";

// ui.tsx re-exports this unchanged, so every existing
// `import { Avatar } from "@/components/ui"` keeps working.

const SIZES = { sm: "h-6 w-6", md: "h-9 w-9", lg: "h-14 w-14" } as const;

export function Avatar({ seed, size = "md" }: { seed: string; size?: "sm" | "md" | "lg" }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a generated, immutably cached SVG; nothing for next/image to optimize
    <img
      src={avatarSrc(seed)}
      alt=""
      aria-hidden
      className={`inline-block rounded-full bg-surface-muted ${SIZES[size]}`}
    />
  );
}
