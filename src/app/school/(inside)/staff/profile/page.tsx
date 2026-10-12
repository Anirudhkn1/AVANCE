import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { pageStaff } from "@/lib/school";
import { logoutAction } from "@/actions/auth";
import { Avatar, Badge, Card, LinkButton, SectionHeading } from "@/components/ui";

export default async function StaffProfilePage() {
  const { user, staff, school, isAdmin } = await pageStaff();

  const [classrooms, subjects] = await Promise.all([
    prisma.classroom.findMany({
      where: { schoolId: school.id, teachers: { some: { userId: user.id } } },
      include: { _count: { select: { kids: { where: { classroomStatus: "APPROVED" } } } } },
      orderBy: { name: "asc" },
    }),
    prisma.subject.findMany({
      where: { ownerId: user.id, classroom: { schoolId: school.id } },
      include: { classroom: { select: { name: true } }, _count: { select: { elixirDecks: true } } },
      orderBy: [{ classroom: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar seed={user.avatarSeed} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
          <p className="text-sm text-muted">{user.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={isAdmin ? "accent" : "neutral"}>{isAdmin ? "School admin" : "Teacher"}</Badge>
            {staff.canAnnounce && <Badge tone="warning">Can post school-wide</Badge>}
            <span className="text-sm text-muted">{school.name}</span>
          </div>
        </div>
        {isAdmin && (
          <LinkButton href="/school/staff/admin" variant="secondary">
            School admin
          </LinkButton>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <SectionHeading title="My classrooms" />
          {classrooms.length === 0 ? (
            <p className="text-sm text-muted">You haven&apos;t joined a classroom yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {classrooms.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2">
                  <Link href={`/school/staff/classrooms/${c.id}`} className="flex-1 font-medium hover:underline">
                    Class {c.name}
                  </Link>
                  <span className="text-xs text-muted">
                    {c._count.kids} student{c._count.kids === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHeading title="My subjects" />
          {subjects.length === 0 ? (
            <p className="text-sm text-muted">Add the subject you teach from a classroom page.</p>
          ) : (
            <ul className="divide-y divide-border">
              {subjects.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2">
                  <Link href={`/school/staff/classrooms/${s.classroomId}/subjects/${s.id}`} className="flex-1 font-medium hover:underline">
                    {s.name} <span className="font-normal text-muted">· Class {s.classroom.name}</span>
                  </Link>
                  <span className="text-xs text-muted">
                    {s._count.elixirDecks} Elixir deck{s._count.elixirDecks === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <SectionHeading title="Account" />
        <div className="flex flex-wrap items-center gap-3">
          <LinkButton href="/profile/avatar" variant="secondary">
            Change avatar
          </LinkButton>
          <form action={logoutAction}>
            <button type="submit" className="rounded-lg px-4 py-2 text-sm font-medium text-danger hover:bg-danger-soft">
              Sign out
            </button>
          </form>
        </div>
      </Card>
    </div>
  );
}
