import { kidViewer, pageKid, touchSeen, visibleAnnouncements } from "@/lib/school";
import { signSchoolFiles } from "@/lib/school-storage";
import { Card, EmptyState, SectionHeading } from "@/components/ui";
import { AnnouncementList, BackLink } from "@/components/school";

export default async function KidAnnouncementsPage({ params }: PageProps<"/school/kid/[kidId]/announcements">) {
  const { kidId } = await params;
  const { kid, classroom } = await pageKid(kidId);
  const back = <BackLink href={`/school/kid/${kid.id}`}>Back home</BackLink>;

  if (!kid.school) {
    return (
      <Page>
        {back}
        <Card>
          <EmptyState title="Join your school first" description="Announcements from your school show up here." />
        </Card>
      </Page>
    );
  }

  // Opening this page is what clears the "new" count on the home tile.
  const announcementsSeen = await touchSeen(kidViewer(kid.id), "announcements");
  const announcements = await visibleAnnouncements(kid.school.id, classroom?.id ?? null);
  const signed = await signSchoolFiles(announcements.map((a) => a.attachmentPath));

  return (
    <Page>
      {back}
      <Card>
        <SectionHeading title="📣 Announcements" />
        <AnnouncementList items={announcements} signed={signed} newSince={announcementsSeen} />
      </Card>
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-6">{children}</div>;
}
