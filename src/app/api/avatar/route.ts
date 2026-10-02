import { avatarSvg } from "@/lib/avatar";

// Avatars are a pure function of the stored avatarSeed value, so each URL can
// be cached forever: the browser fetches a given avatar once, instead of every
// page inlining ~14KB of SVG per avatar (twice — HTML plus RSC payload).
export function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("v") ?? "";
  return new Response(avatarSvg(value), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
