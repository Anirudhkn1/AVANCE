import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { pageStaff } from "@/lib/school";
import { Badge, Card, SectionHeading } from "@/components/ui";
import { ActionButton } from "@/components/school-client";
import { BackLink } from "@/components/school";
import { regenerateCodeAction, removeStaffAction, reviewStaffAction, setAnnouncerAction } from "@/actions/school";

export default async function SchoolAdminPage() {
  const { school, isAdmin } = await pageStaff();
  if (!isAdmin) redirect("/school/staff");

  const staff = await prisma.schoolStaff.findMany({
    where: { schoolId: school.id },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  const pending = staff.filter((s) => s.status === "PENDING");
  const approved = staff.filter((s) => s.status === "APPROVED");

  return (
    <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-6">
      <BackLink href="/school/staff?all=1">My classes</BackLink>
      <h1 className="text-2xl font-semibold tracking-tight">{school.name} · Admin</h1>

      <Card>
        <SectionHeading title="Join codes" subtitle="Share the staff code with teachers only." />
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["staff", "Staff code", school.staffCode],
              ["student", "Student code", school.studentCode],
            ] as const
          ).map(([kind, label, code]) => (
            <div key={kind} className="rounded-xl border border-border bg-surface-muted px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
              <p className="mt-1 font-mono text-xl tracking-wider">{code}</p>
              <form action={regenerateCodeAction.bind(null, kind)} className="mt-2">
                <ActionButton variant="ghost" confirm={`Make a new ${label.toLowerCase()}? The old one stops working.`}>
                  Regenerate
                </ActionButton>
              </form>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeading title="Waiting for approval" />
        {pending.length === 0 ? (
          <p className="text-sm text-muted">No one is waiting.</p>
        ) : (
          <ul className="divide-y divide-border">
            {pending.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.user.name}</p>
                  <p className="text-xs text-muted">{s.user.email}</p>
                </div>
                <form action={reviewStaffAction.bind(null, s.id, true)}>
                  <ActionButton variant="primary">Approve</ActionButton>
                </form>
                <form action={reviewStaffAction.bind(null, s.id, false)}>
                  <ActionButton variant="ghost">Reject</ActionButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionHeading title="Staff" subtitle="Announcers can post to the whole school." />
        <ul className="divide-y divide-border">
          {approved.map((s) => {
            const self = s.userId === school.adminId;
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {s.user.name} {self && <Badge tone="accent">Admin</Badge>}{" "}
                    {!self && s.canAnnounce && <Badge tone="warning">Announcer</Badge>}
                  </p>
                  <p className="text-xs text-muted">{s.user.email}</p>
                </div>
                {!self && (
                  <>
                    <form action={setAnnouncerAction.bind(null, s.id, !s.canAnnounce)}>
                      <ActionButton variant="ghost">{s.canAnnounce ? "Remove announcer" : "Make announcer"}</ActionButton>
                    </form>
                    <form action={removeStaffAction.bind(null, s.id)}>
                      <ActionButton variant="danger" confirm={`Remove ${s.user.name} from the school?`}>
                        Remove
                      </ActionButton>
                    </form>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
