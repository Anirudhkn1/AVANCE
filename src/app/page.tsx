import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { Card, ProgressBar, Badge } from "@/components/ui";
import { AeroShardsBackground } from "@/components/aero-shards-background";
import { HeroPixelBlast } from "@/components/hero-pixel-blast";
import ParticleText from "@/components/ParticleText";

export default async function LandingPage() {
  const user = await getSessionUser();

  return (
    <div className="flex-1">
      {/* Hero — AeroShards renders a WebGPU background panel behind this
          section only, so the rest of the page stays the plain theme
          background; hero text is forced light since it sits on a fixed
          dark panel regardless of light/dark mode. HeroPixelBlast is a
          second, much fainter layer on top of it (transparent canvas) —
          pure texture, not a replacement for AeroShards. */}
      <section className="relative isolate overflow-hidden">
        <AeroShardsBackground backgroundColor="#0a0b10" shardColor="#8b85ff" accentColor="#5850ec" />
        <HeroPixelBlast />
        <div className="relative z-10 mx-auto max-w-5xl px-4 pt-16 pb-16 text-center">
          <div className="h-40 sm:h-56 -mb-2">
            <ParticleText
              text="Avance"
              color="#ffffff"
              highlightColor="#8b85ff"
              trigger="hover"
              glow
              className=""
              style={undefined}
            />
          </div>
          <Badge tone="accent" className="mb-5">A game layer for real-world work</Badge>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1] text-white">
            Avance turns assignments into
            <br className="hidden sm:block" /> measurable quests.
          </h1>
          <p className="mt-5 text-lg text-white/70 max-w-2xl mx-auto">
            Institutions get visibility before deadlines become a crisis. Students always know
            what to do next. Nobody discovers the problem on submission day.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="rounded-lg bg-accent text-accent-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90"
              >
                Go to your dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="rounded-lg bg-accent text-accent-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90"
                >
                  Get started
                </Link>
                <Link
                  href="/login"
                  className="rounded-lg border border-white/30 text-white px-5 py-2.5 text-sm font-medium hover:bg-white/10"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid sm:grid-cols-2 gap-6">
          <Card>
            <h2 className="font-semibold mb-3">The visibility gap</h2>
            <p className="text-sm text-muted leading-relaxed">
              Lecturer assigns work → student works independently → little visibility during the
              process → deadline approaches → student rushes or falls behind → lecturer discovers
              the problem late.
            </p>
          </Card>
          <Card>
            <h2 className="font-semibold mb-3">What Avance changes</h2>
            <p className="text-sm text-muted leading-relaxed">
              Every assignment becomes a sequence of measurable checkpoints, so students always
              know what&apos;s next and institutions can see risk before it becomes a missed
              deadline — not merely make assignments look more entertaining.
            </p>
          </Card>
        </div>
      </section>

      {/* Key experiences */}
      <section className="mx-auto max-w-5xl px-4 py-10 grid lg:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <Badge tone="accent">Student view</Badge>
          <h3 className="text-lg font-semibold">Current Quest</h3>
          <div>
            <p className="font-medium">Build the Banking System</p>
            <div className="mt-2 flex items-center gap-3">
              <ProgressBar percent={60} className="flex-1" />
              <span className="text-sm text-muted">60%</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted">Current checkpoint</p>
              <p className="font-medium">⚔ Testing</p>
            </div>
            <div>
              <p className="text-muted">Next</p>
              <p className="font-medium">Documentation</p>
            </div>
            <div>
              <p className="text-muted">Deadline</p>
              <p className="font-medium">3 days 14 hours</p>
            </div>
            <div>
              <p className="text-muted">Rank</p>
              <p className="font-medium">#12 / 58</p>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <Badge tone="accent">Institution view</Badge>
          <h3 className="text-lg font-semibold">Class Command Center</h3>
          <p className="text-sm text-muted">60 Students · Assignment 3</p>
          <div className="flex gap-4 text-sm">
            <span>🟢 41 On Track</span>
            <span>🟡 13 At Risk</span>
            <span>🔴 6 Critical</span>
          </div>
          <div className="space-y-2">
            {[
              ["Requirements", 96],
              ["Design", 91],
              ["Implementation", 78],
              ["Testing", 43],
              ["Documentation", 12],
            ].map(([label, pct]) => (
              <div key={label as string} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 text-muted">{label}</span>
                <ProgressBar percent={pct as number} tone={(pct as number) < 50 ? "warning" : "accent"} className="flex-1" />
                <span className="w-10 text-right">{pct}%</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Product loop */}
      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="text-center text-lg font-semibold mb-6">The core loop</h2>
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
          {[
            "Assignment",
            "AI-assisted decomposition",
            "Human approval",
            "Student works",
            "Checkpoint progress",
            "Real-time visibility",
            "Risk indication",
            "Human intervention",
            "Completion",
            "Organisation analytics",
          ].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-2">
              <span className="rounded-full border border-border bg-surface px-3 py-1.5">{step}</span>
              {i < arr.length - 1 && <span className="text-muted">→</span>}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20 text-center">
        <p className="text-muted italic">
          &ldquo;It&apos;s basically a game layer for real-world work.&rdquo;
        </p>
      </section>
    </div>
  );
}
