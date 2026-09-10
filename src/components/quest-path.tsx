import Link from "next/link";
import { getCheckpointStates } from "@/lib/progress";
import { formatTimeRemaining } from "@/lib/format";
import type { RiskResult } from "@/lib/risk";
import { Card, Badge, ProgressBar, RiskBadge } from "@/components/ui";

interface CheckpointLike {
  id: string;
  order: number;
  title: string;
  description: string;
  xpValue: number;
}

export function QuestPath({
  orgId,
  groupId,
  projectId,
  projectTitle,
  projectDescription,
  deadline,
  checkpoints,
  completedIds,
  risk,
  completedCount,
}: {
  orgId: string;
  groupId: string;
  projectId: string;
  projectTitle: string;
  projectDescription: string;
  deadline: Date;
  checkpoints: CheckpointLike[];
  completedIds: Set<string>;
  risk: RiskResult;
  completedCount: number;
}) {
  const states = getCheckpointStates(checkpoints, completedIds);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{projectTitle}</h1>
          <RiskBadge level={risk.level} />
        </div>
        <p className="text-muted text-sm mt-2 max-w-2xl">{projectDescription}</p>
      </div>

      <Card>
        <div className="flex items-center gap-4">
          <ProgressBar
            percent={risk.actualPct}
            className="flex-1"
            tone={risk.level === "ON_TRACK" ? "success" : risk.level === "AT_RISK" ? "warning" : "danger"}
          />
          <span className="text-sm font-medium w-12 text-right">{risk.actualPct}%</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-sm text-muted">
          <span>
            {completedCount} / {checkpoints.length} checkpoints complete
          </span>
          <span>Deadline: {formatTimeRemaining(deadline)}</span>
        </div>
        <p className="text-sm text-muted mt-2">{risk.message}</p>
      </Card>

      <ol className="space-y-2">
        {checkpoints.map((cp) => {
          const state = states.get(cp.id)!;
          const href = `/organisations/${orgId}/groups/${groupId}/projects/${projectId}/checkpoints/${cp.id}`;
          return (
            <li key={cp.id}>
              <Link href={state === "locked" ? "#" : href} className={state === "locked" ? "pointer-events-none" : ""}>
                <Card
                  className={`flex items-center gap-4 ${
                    state === "current" ? "border-accent ring-1 ring-accent/30" : ""
                  } ${state === "locked" ? "opacity-50" : "hover:border-accent/50 transition-colors"}`}
                >
                  <div className="text-xl w-8 text-center shrink-0">
                    {state === "completed" ? "✅" : state === "current" ? "⚔️" : "🔒"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {cp.order}. {cp.title}
                    </p>
                    <p className="text-sm text-muted truncate">{cp.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge tone={state === "completed" ? "success" : state === "current" ? "accent" : "neutral"}>
                      {state === "completed" ? "Complete" : state === "current" ? "Current" : "Locked"}
                    </Badge>
                    <p className="text-xs text-muted mt-1">+{cp.xpValue} XP</p>
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
