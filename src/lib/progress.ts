export type CheckpointState = "completed" | "current" | "locked";

/**
 * Linear checkpoint progression (PRD §13): the first not-yet-completed
 * checkpoint (by order) is "current", everything before it is "completed",
 * everything after is "locked". No branching, no skill trees.
 */
export function getCheckpointStates<T extends { id: string; order: number }>(
  checkpoints: T[],
  completedIds: Set<string>
): Map<string, CheckpointState> {
  const sorted = [...checkpoints].sort((a, b) => a.order - b.order);
  const states = new Map<string, CheckpointState>();
  let foundCurrent = false;
  for (const cp of sorted) {
    if (completedIds.has(cp.id)) {
      states.set(cp.id, "completed");
    } else if (!foundCurrent) {
      states.set(cp.id, "current");
      foundCurrent = true;
    } else {
      states.set(cp.id, "locked");
    }
  }
  return states;
}

export function getCompletedCount(completedIds: Set<string>, checkpointIds: string[]): number {
  return checkpointIds.filter((id) => completedIds.has(id)).length;
}
