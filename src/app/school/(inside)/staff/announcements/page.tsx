import { prisma } from "@/lib/prisma";
import { pageStaff } from "@/lib/school";
import { signSchoolFiles } from "@/lib/school-storage";
import { Card, EmptyState, SectionHeading } from "@/components/ui";
import { SubmitForm } from "@/components/forms";
import { AnnouncementList, fieldClass } from "@/components/school";
import { postAnnouncementAction } from "@/actions/school";

// Everything a teacher posts and reads in one place: school-wide notices
// (if the admin let them) and notices for each classroom they teach in.
export default async function StaffAnnouncementsPage() {
  const { user, staff, school, isAdmin } = await pageStaff();

  const classrooms = await prisma.classroom.findMany({
    where: { schoolId: school.id, teachers: { some: { userId: user.id } } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const announcements = await prisma.announcement.findMany({
    where: { schoolId: school.id, OR: [{ classroomId: null }, { classroomId: { in: classrooms.map((c) => c.id) } }] },
    include: { author: { select: { name: true } }, subject: { select: { name: true } }, classroom: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const signed = await signSchoolFiles(announcements.map((a) => a.attachmentPath));
  const canPost = staff.canAnnounce || classrooms.length > 0;

  return (
    <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">📣 Announcements</h1>
        <p className="text-sm text-muted">{school.name}</p>
      </div>

      <Card>
        <SectionHeading title="Post an announcement" subtitle="Students and parents see it straight away." />
        {canPost ? (
          <SubmitForm action={postAnnouncementAction} submitLabel="Post announcement">
            <textarea name="body" rows={3} required maxLength={2000} placeholder="Write an announcement…" className={fieldClass} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-muted">
                Who is it for?
                <select name="scope" defaultValue={classrooms.length > 0 ? "classroom" : "school"} className={`${fieldClass} mt-1`}>
                  {classrooms.length > 0 && <option value="classroom">One class</option>}
                  {staff.canAnnounce && <option value="school">Whole school</option>}
                </select>
              </label>
              {classrooms.length > 0 && (
                <label className="block text-sm text-muted">
                  Class (for “One class”)
                  <select name="classroomId" className={`${fieldClass} mt-1`}>
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        Class {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <input type="file" name="file" accept="application/pdf,image/*" className="text-sm" />
          </SubmitForm>
        ) : (
          <p className="text-sm text-muted">Join a classroom to post announcements to its students.</p>
        )}
      </Card>

      <Card>
        <SectionHeading title="Recent announcements" />
        {announcements.length === 0 ? (
          <EmptyState title="Nothing posted yet" description="School-wide and class announcements will be listed here." />
        ) : (
          <AnnouncementList items={announcements} signed={signed} canDelete={(a) => a.authorId === user.id || isAdmin} />
        )}
      </Card>
    </div>
  );
}
