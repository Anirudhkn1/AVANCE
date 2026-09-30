// Regenerates every static brand asset from the mark geometry in
// src/lib/brand.ts:
//   src/app/icon.svg              — browser tab (vector)
//   src/app/favicon.ico           — 16/32/48 fallback for older browsers
//   src/app/apple-icon.png        — iOS home screen, 180×180
//   src/app/opengraph-image.png   — link previews, 1200×630 (the intro's final frame)
//
// Run: npx tsx scripts/generate-brand-assets.ts
// The OG image needs the real webfonts, so it's screenshotted with headless
// Edge/Chrome (set BROWSER to override the path) and needs network access for
// Google Fonts. The icons only need sharp.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { BRAND_TAGLINE, MARK_PATHS } from "../src/lib/brand";

const APP = resolve(__dirname, "../src/app");
const paths = Object.values(MARK_PATHS)
  .map((d) => `<path d="${d}"/>`)
  .join("");

// The mark's ink spans x 8–56, y 7.6–55 of its 64 grid; nudge down ~0.7 so
// it sits optically centred in a square.
function tileSvg(size: number, { rounded, scale }: { rounded: boolean; scale: number }) {
  const inner = 64 * scale;
  const offset = (64 - inner) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
<defs><linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6d66ff"/><stop offset="1" stop-color="#4a42d6"/></linearGradient></defs>
<rect width="64" height="64" rx="${rounded ? 14 : 0}" fill="url(#t)"/>
<g fill="#fff" transform="translate(${offset} ${offset + 0.7}) scale(${scale})">${paths}</g>
</svg>`;
}

function ico(pngs: { size: number; data: Buffer }[]) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const entries: Buffer[] = [];
  let offset = 6 + 16 * pngs.length;
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

function ogHtml() {
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Special+Elite&family=Alegreya+Sans+SC:wght@500&display=block" rel="stylesheet">
<style>
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{background:#0a0b10;display:flex;align-items:center;justify-content:center;position:relative}
body::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 60% 70% at 50% 50%,rgba(88,80,236,.22) 0%,rgba(10,11,16,0) 62%),radial-gradient(ellipse at center,rgba(0,0,0,0) 50%,rgba(0,0,0,.7) 100%)}
.lockup{position:relative;display:flex;align-items:center;gap:38px}
svg{width:190px;height:190px;filter:drop-shadow(0 0 22px rgba(139,133,255,.5))}
.name{font-family:'Special Elite';font-size:150px;line-height:1;color:#dedbf7;text-shadow:0 0 30px rgba(139,133,255,.4)}
.tag{font-family:'Alegreya Sans SC';font-weight:500;font-size:27px;letter-spacing:.28em;color:rgba(237,238,243,.62);margin-top:20px;white-space:nowrap}
</style></head><body><div class="lockup">
<svg viewBox="0 0 64 64"><defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a9a4ff"/><stop offset="1" stop-color="#5850ec"/></linearGradient>
<filter id="w" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1"/></filter>
</defs><g fill="url(#g)" filter="url(#w)">${paths}</g></svg>
<div><div class="name">Avance</div><div class="tag">${BRAND_TAGLINE}</div></div>
</div></body></html>`;
}

function findBrowser() {
  const candidates = [
    process.env.BROWSER,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ];
  return candidates.find((p) => p && existsSync(p));
}

async function main() {
  writeFileSync(join(APP, "icon.svg"), tileSvg(64, { rounded: true, scale: 0.72 }));

  const icoPngs = await Promise.all(
    [16, 32, 48].map(async (size) => ({
      size,
      // Tiny sizes get a larger mark — the tile margin eats too much at 16px.
      data: await sharp(Buffer.from(tileSvg(size * 8, { rounded: true, scale: size <= 16 ? 0.84 : 0.76 })))
        .resize(size, size)
        .png()
        .toBuffer(),
    })),
  );
  writeFileSync(join(APP, "favicon.ico"), ico(icoPngs));

  // iOS rounds the corners itself — ship a full-bleed square.
  await sharp(Buffer.from(tileSvg(720, { rounded: false, scale: 0.64 })))
    .resize(180, 180)
    .png()
    .toFile(join(APP, "apple-icon.png"));

  const browser = findBrowser();
  if (!browser) {
    console.warn("No Edge/Chrome found — skipped opengraph-image.png (set BROWSER=/path/to/browser).");
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), "avance-og-"));
  const htmlPath = join(dir, "og.html");
  writeFileSync(htmlPath, ogHtml());
  const shot = join(dir, "og.png");
  execFileSync(
    browser,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--window-size=1200,630",
      "--virtual-time-budget=6000",
      `--screenshot=${shot}`,
      pathToFileURL(htmlPath).href,
    ],
    { stdio: "ignore" },
  );
  await sharp(shot).resize(1200, 630).png({ compressionLevel: 9 }).toFile(join(APP, "opengraph-image.png"));
  console.log("Brand assets written to src/app/.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
