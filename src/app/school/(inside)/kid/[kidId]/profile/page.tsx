import { prisma } from "@/lib/prisma";
import { istDay, pageKid, visibleAnnouncements } from "@/lib/school";
import { kidStats } from "@/lib/school-stats";
import { signSchoolFiles } from "@/lib/school-storage";
import { elixirInfo } from "@/lib/elixir";
import { equippedCharacter, nextWaypoint } from "@/lib/voyage";
import { Card, LinkButton, SectionHeading, StatTile } from "@/components/ui";
import { AnnouncementList, LevelBar, StudentStatsView } from "@/components/school";
import { KidAvatar } from "@/components/kid-avatar";
import { CharacterStage } from "@/components/character-stage";
import { ProfilePicturePicker } from "@/components/profile-picture-picker";

export default async function KidProfilePage({ params }: PageProps<"/school/kid/[kidId]/profile">) {
  const { kidId } = await params;
  const { kid, classroom } = await pageKid(kidId);

  const [stats, todayNotes, announcements] = await Promise.all([
    classroom ? kidStats(kid.id, classroom.id) : null,
    classroom
      ? prisma.teachingNote.findMany({
          where: { day: istDay(), subject: { classroomId: classroom.id } },
          include: { subject: { select: { name: true } } },
        })
      : [],
    kid.schoolId ? visibleAnnouncements(kid.schoolId, classroom?.id ?? null, 50) : [],
  ]);
  const signed = await signSchoolFiles(announcements.map((a) => a.attachmentPath));
  const elixir = elixirInfo(kid.elixirPoints);
  const hero = equippedCharacter(kid.characterId, kid.xp);
  const nextHero = nextWaypoint(kid.xp);

  return (
    <div className="mx-auto max-w-5xl w-full px-4 py-8 grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,21rem)]">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <KidAvatar kid={kid} size="xl" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{kid.name}</h1>
            <p className="text-sm text-muted">
              {kid.school?.name ?? "No school"}
              {classroom && ` · Class ${classroom.name}`}
            </p>
          </div>
        </div>

        <Card>
          <SectionHeading title="🎭 Profile picture" subtitle="Heroes you unlock on your Voyage can be your face here." />
          <ProfilePicturePicker kidId={kid.id} xp={kid.xp} avatarSeed={kid.avatarSeed} characterId={kid.characterId} />
        </Card>

        <h2 className="text-xl font-semibold tracking-tight">👪 Parent&apos;s dashboard</h2>

        <Card>
          <SectionHeading title="Progress" />
          {stats ? <StudentStatsView stats={stats} xp={kid.xp} /> : <LevelBar xp={kid.xp} />}
        </Card>

        <Card>
          <SectionHeading title="🧪 Elixir" subtitle="Spaced-repetition practice set by the teachers" />
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Drops" value={kid.elixirPoints} />
            <StatTile label="Flasks" value={elixir.flasks} hint="brewed" />
            <StatTile label="Next flask" value={elixir.toNext} hint="drops to go" />
          </div>
        </Card>

        <Card>
          <SectionHeading title="Today in class" subtitle="What each teacher covered today" />
          {todayNotes.length === 0 ? (
            <p className="text-sm text-muted">No class notes yet today.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {todayNotes.map((n) => (
                <li key={n.id}>
                  <span className="font-medium">{n.subject.name}:</span> <span className="whitespace-pre-wrap">{n.body}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHeading title="All announcements" />
          <AnnouncementList items={announcements} signed={signed} />
        </Card>
      </div>

      <aside className="order-first md:order-none md:sticky md:top-20">
        {hero ? (
          <CharacterStage character={hero} />
        ) : (
          <Card className="space-y-3 text-center">
            <p className="text-4xl">🏴‍☠️</p>
            <h2 className="text-lg font-semibold">Your hero is waiting</h2>
            <p className="text-sm text-muted">
              {kid.characterId
                ? "Your hero is locked again — earn a little more XP to bring them back."
                : nextHero
                  ? `Keep finishing homework — the first crewmate joins at 100 XP. You're at ${kid.xp}.`
                  : "Pick a hero from the Voyage."}
            </p>
            <LinkButton href={`/school/kid/${kid.id}/homework`} variant="secondary">
              ⛵ Open my Voyage
            </LinkButton>
          </Card>
        )}
      </aside>
    </div>
  );
}
