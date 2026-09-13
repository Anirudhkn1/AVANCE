import { requireSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { OrganisationsBento } from "@/components/organisations-bento";
import ClickSpark from "@/components/ClickSpark";
import MagicBento from "@/components/MagicBento";

const TOOL_CARDS = [
  { href: "/habits", icon: "✅", label: "Habit Tracker", description: "Build streaks that stick", glyphClassName: "bg-success-soft", glowColor: "22, 163, 74" },
  { href: "/todos", icon: "📝", label: "To-Do List", description: "Stay on top of tasks", glyphClassName: "bg-accent-soft", glowColor: "88, 80, 236" },
  { href: "/focus", icon: "⏱️", label: "Focus Mode", description: "Timed, distraction-free work", glyphClassName: "bg-danger-soft", glowColor: "220, 38, 38" },
  { href: "/how-to-use", icon: "📖", label: "How to Use", description: "Guide & tips", glyphClassName: "bg-surface-muted", glowColor: "91, 100, 114" },
];

export default async function DashboardPage() {
  const user = await requireSessionUser();

  const memberships = await prisma.organisationMembership.findMany({
    where: { userId: user.id },
    include: { organisation: true },
    orderBy: { joinedAt: "asc" },
  });

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-5xl w-full px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user.name}</h1>
          <p className="text-muted text-sm mt-1">Pick something to open.</p>
        </div>

        <ClickSpark sparkColor="#5850ec" sparkSize={10} sparkRadius={18} sparkCount={8} duration={400}>
          <div className="space-y-8">
            <div>
              <h2 className="text-sm font-medium text-muted uppercase tracking-wide mb-3">Organisations</h2>
              <OrganisationsBento memberships={memberships} />
            </div>

            <div>
              <h2 className="text-sm font-medium text-muted uppercase tracking-wide mb-3">Tools</h2>
              <MagicBento
                items={TOOL_CARDS}
                textAutoHide
                enableStars
                enableSpotlight
                enableBorderGlow
                enableTilt
                enableMagnetism
                clickEffect
                spotlightRadius={500}
                particleCount={10}
                glowColor="88, 80, 236"
              />
            </div>
          </div>
        </ClickSpark>
      </div>
    </div>
  );
}
