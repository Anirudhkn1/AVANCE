import { MARK_PATHS, MARK_VIEWBOX } from "@/lib/brand";

// The symbol alone. Fills with currentColor, so the caller picks the colour
// with a text-* class (text-accent in the navbar, white on the icon tile).
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox={MARK_VIEWBOX} className={className} fill="currentColor" aria-hidden="true">
      {/* data-part lets CSS target one piece, e.g. the navbar nudging the arrow on hover. */}
      {Object.entries(MARK_PATHS).map(([part, d]) => (
        <path key={part} data-part={part} d={d} />
      ))}
    </svg>
  );
}

// Symbol + "Avance" wordmark in the typewriter face.
export function Logo({ className = "", markClassName = "h-6 w-6" }: { className?: string; markClassName?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className={`text-accent shrink-0 ${markClassName}`} />
      <span className="font-typewriter tracking-tight">Avance</span>
    </span>
  );
}
