import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { pageStaff, teacherClassroom } from "@/lib/school";
import { kidStats } from "@/lib/school-stats";
import { Avatar, Card } from "@/components/ui";
import { BackLink, StudentStatsView } from "@/components/school";

export default async function StaffStudentPage({
  params,
}: PageProps<"/school/staff/classrooms/[classroomId]/students/[kidId]">) {
  const { classroomId, kidId } = await params;
  const { user, school } = await pageStaff();
  const [classroom, kid] = await Promise.all([
    teacherClassroom(user.id, school.id, classroomId),
    prisma.kidProfile.findUnique({ where: { id: kidId } }),
  ]);
  if (!classroom || !kid || kid.classroomId !== classroomId || kid.classroomStatus !== "APPROVED") notFound();

  const stats = await kidStats(kid.id, classroomId);

  return (
    <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-6">
      <BackLink href={`/school/staff/classrooms/${classroomId}`}>Class {classroom.name}</BackLink>
      <div className="flex items-center gap-4">
        <Avatar seed={kid.avatarSeed} size="lg" />
        <h1 className="text-2xl font-semibold tracking-tight">{kid.name}</h1>
      </div>
      <Card>
        <StudentStatsView stats={stats} xp={kid.xp} />
      </Card>
    </div>
  );
}
