import { notFound } from "next/navigation";
import { requireSessionUser } from "@/lib/session";
import { requireGroupHost } from "@/lib/permissions";
import { QuestBuilderWizard } from "@/components/quest-builder-wizard";

export default async function NewProjectPage({ params }: { params: Promise<{ orgId: string; groupId: string }> }) {
  const { orgId, groupId } = await params;
  const user = await requireSessionUser();

  try {
    await requireGroupHost(user.id, groupId);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl w-full px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">AI Quest Builder</h1>
        <p className="text-muted text-sm mt-1">
          Turn an assignment into a linear checkpoint quest. AI proposes a structure — nothing publishes until you
          review and approve it.
        </p>
      </div>
      <QuestBuilderWizard orgId={orgId} groupId={groupId} />
    </div>
  );
}
