import { requireSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { OrgRole } from "@/lib/constants";
import { DesktopIconLink, DesktopIconPlaceholder, OrgDesktopIcon } from "@/components/desktop-icon";
import { OrgQuickActions } from "@/components/org-quick-actions";
import { DashboardBackground } from "@/components/dashboard-background";
import ClickSpark from "@/components/ClickSpark";

export default async function DashboardPage() {
  const user = await requireSessionUser();

  const memberships = await prisma.organisationMembership.findMany({
    where: { userId: user.id },
    include: { organisation: true },
    orderBy: { joinedAt: "asc" },
  });

  return (
    <div className="relative isolate flex-1">
      <DashboardBackground />
      <div className="relative z-10 mx-auto max-w-5xl w-full px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user.name}</h1>
          <p className="text-muted text-sm mt-1">Pick something to open.</p>
        </div>

        <ClickSpark sparkColor="#5850ec" sparkSize={10} sparkRadius={18} sparkCount={8} duration={400}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
            {memberships.map((m) => (
              <OrgDesktopIcon key={m.id} orgId={m.organisationId} name={m.organisation.name} role={m.role as OrgRole} />
            ))}

            <OrgQuickActions />

            <DesktopIconLink href="/habits" icon="✅" label="Habit Tracker" glyphClassName="bg-success-soft" />
            <DesktopIconLink href="/todos" icon="📝" label="To-Do List" glyphClassName="bg-accent-soft" />
            <DesktopIconLink href="/focus" icon="⏱️" label="Focus Mode" glyphClassName="bg-danger-soft" />
            <DesktopIconLink href="/how-to-use" icon="📖" label="How to Use" glyphClassName="bg-surface-muted" />

            <DesktopIconPlaceholder />
            <DesktopIconPlaceholder />
          </div>
        </ClickSpark>
      </div>
    </div>
  );
}
