import Link from "next/link";
import { requireSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, EmptyState, LinkButton } from "@/components/ui";

export default async function LeaderboardChooserPage() {
  const user = await requireSessionUser();
  const memberships = await prisma.organisationMembership.findMany({
    where: { userId: user.id },
    include: { organisation: true },
  });

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="text-muted text-sm mt-1">Pick an organisation to see its group leaderboards.</p>
      </div>
      {memberships.length === 0 ? (
        <Card>
          <EmptyState title="Join an organisation first" action={<LinkButton href="/dashboard">Go to your home screen</LinkButton>} />
        </Card>
      ) : (
        <div className="space-y-3">
          {memberships.map((m) => (
            <Link key={m.id} href={`/organisations/${m.organisationId}/leaderboard`}>
              <Card className="hover:border-accent/50 transition-colors">{m.organisation.name}</Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
