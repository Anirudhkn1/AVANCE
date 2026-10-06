import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, EmptyState, ProgressBar, StatTile } from "@/components/ui";
import { ActionButton } from "@/components/school-client";
import { SubmitForm } from "@/components/forms";
import { deleteAnnouncementAction, postAnnouncementAction } from "@/actions/school";
import { levelInfo } from "@/lib/school";
import { HOMEWORK_XP_CHOICES } from "@/lib/voyage";
import type { kidStats } from "@/lib/school-stats";

export const fieldClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent";

export function fmtIst(d: Date, withTime = true) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(d);
}

export function fmtDay(day: string) {
  return fmtIst(new Date(`${day}T12:00:00+05:30`), false);
}

export function NewDot({ label = "New" }: { label?: string }) {
  return <Badge tone="accent">{label}</Badge>;
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm text-muted hover:text-foreground">
      ← {children}
    </Link>
  );
}

/** Teacher's pick of how much XP a homework is worth (1–3). */
export function XpSelect({ defaultValue = 1 }: { defaultValue?: number }) {
  return (
    <label className="block text-sm text-muted">
      XP reward
      <select name="xp" defaultValue={defaultValue} className={`${fieldClass} mt-1`}>
        {HOMEWORK_XP_CHOICES.map((n) => (
          <option key={n} value={n}>
            {"⭐".repeat(n)} {n} XP{n === 1 ? " — quick task" : n === 2 ? " — standard" : " — big effort"}
          </option>
        ))}
      </select>
    </label>
  );
}

export function LevelBar({ xp }: { xp: number }) {
  const { level, into, span, toNext } = levelInfo(xp);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">Level {level}</span>
        <span className="text-muted font-mono tabular-nums">
          {xp} XP · {toNext} to level {level + 1}
        </span>
      </div>
      <ProgressBar percent={(into / span) * 100} />
    </div>
  );
}

type AnnouncementItem = {
  id: string;
  body: string;
  createdAt: Date;
  classroomId: string | null;
  authorId: string;
  attachmentPath: string | null;
  attachmentName: string | null;
  author: { name: string };
  subject: { name: string } | null;
  classroom: { name: string } | null;
};

export function AnnouncementList({
  items,
  signed,
  newSince,
  canDelete,
  empty = "No announcements yet.",
}: {
  items: AnnouncementItem[];
  signed: Map<string, string>;
  newSince?: Date;
  canDelete?: (a: AnnouncementItem) => boolean;
  empty?: string;
}) {
  if (items.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-3">
      {items.map((a) => {
        const url = a.attachmentPath ? signed.get(a.attachmentPath) : undefined;
        return (
          <li key={a.id} className="rounded-xl border border-border bg-surface-muted px-4 py-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="font-medium text-foreground">{a.author.name}</span>
              {a.subject && <span>· {a.subject.name}</span>}
              <span>· {fmtIst(a.createdAt)}</span>
              <Badge tone={a.classroomId ? "neutral" : "warning"}>
                {a.classroomId ? `Class ${a.classroom?.name ?? ""}` : "School"}
              </Badge>
              {newSince && a.createdAt > newSince && <NewDot />}
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-sm">{a.body}</p>
            <div className="mt-2 flex items-center gap-3">
              {url && (
                <a href={url} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">
                  📎 {a.attachmentName ?? "Attachment"}
                </a>
              )}
              {canDelete?.(a) && (
                <form action={deleteAnnouncementAction.bind(null, a.id)} className="ml-auto">
                  <ActionButton variant="ghost" confirm="Delete this announcement?">
                    Delete
                  </ActionButton>
                </form>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function NotesTimeline({ notes, empty }: { notes: { id: string; day: string; body: string }[]; empty: string }) {
  if (notes.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-2">
      {notes.map((n) => (
        <li key={n.id} className="flex gap-3 text-sm">
          <span className="w-16 shrink-0 text-muted">{fmtDay(n.day)}</span>
          <span className="whitespace-pre-wrap">{n.body}</span>
        </li>
      ))}
    </ul>
  );
}

export function StudentStatsView({ stats, xp }: { stats: Awaited<ReturnType<typeof kidStats>>; xp: number }) {
  const max = Math.max(1, ...stats.last30.map((d) => d.count));
  return (
    <div className="space-y-5">
      <LevelBar xp={xp} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Completed" value={`${stats.completed}/${stats.assigned}`} />
        <StatTile label="On time" value={stats.onTimePct === null ? "—" : `${stats.onTimePct}%`} />
        <StatTile label="Streak" value={`${stats.streak}d`} hint="days in a row" />
        <StatTile label="Level" value={levelInfo(xp).level} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">By subject</h3>
        {stats.perSubject.length === 0 ? (
          <p className="text-sm text-muted">No subjects yet.</p>
        ) : (
          <ul className="space-y-2">
            {stats.perSubject.map((s) => (
              <li key={s.id} className="text-sm">
                <div className="flex justify-between">
                  <span>{s.name}</span>
                  <span className="text-muted font-mono tabular-nums">
                    {s.completed}/{s.assigned}
                    {s.late > 0 && ` · ${s.late} late`}
                  </span>
                </div>
                <ProgressBar percent={s.assigned ? (s.completed / s.assigned) * 100 : 0} tone="success" className="mt-1" />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Last 30 days</h3>
        <div className="flex h-24 items-end gap-[3px]" role="img" aria-label="Homework completed per day, last 30 days">
          {stats.last30.map((d) => (
            <div
              key={d.day}
              title={`${fmtDay(d.day)}: ${d.count}`}
              className="flex-1 rounded-sm bg-accent"
              style={{ height: `${Math.max(4, (d.count / max) * 100)}%`, opacity: d.count ? 1 : 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function StudentTable({
  rows,
  hrefFor,
}: {
  rows: { id: string; name: string; assigned: number; completed: number; onTimePct: number | null; last: Date | null }[];
  hrefFor: (kidId: string) => string;
}) {
  if (rows.length === 0) return <EmptyState title="No students yet" description="Approved students will appear here." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="py-2 pr-3 font-medium">Student</th>
            <th className="py-2 pr-3 font-medium">Done</th>
            <th className="py-2 pr-3 font-medium">On time</th>
            <th className="py-2 font-medium">Last</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="py-2 pr-3">
                <Link href={hrefFor(r.id)} className="hover:underline">
                  {r.name}
                </Link>
              </td>
              <td className="py-2 pr-3 font-mono tabular-nums">
                {r.completed}/{r.assigned}
              </td>
              <td className="py-2 pr-3 font-mono tabular-nums">{r.onTimePct === null ? "—" : `${r.onTimePct}%`}</td>
              <td className="py-2 text-muted">{r.last ? fmtIst(r.last, false) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PeriodTabs({ base, period }: { base: string; period: "daily" | "monthly" }) {
  const sep = base.includes("?") ? "&" : "?";
  return (
    <div className="inline-flex rounded-lg bg-surface-muted p-1 text-sm">
      {(["daily", "monthly"] as const).map((p) => (
        <Link
          key={p}
          href={`${base}${sep}period=${p}`}
          className={`rounded-md px-3 py-1 ${p === period ? "bg-surface font-medium shadow-sm" : "text-muted"}`}
        >
          {p === "daily" ? "Today" : "This month"}
        </Link>
      ))}
    </div>
  );
}

export function AnnouncementForm({
  classroomId,
  subjectId,
  canAnnounceSchool,
}: {
  classroomId: string;
  subjectId?: string;
  canAnnounceSchool: boolean;
}) {
  return (
    <SubmitForm action={postAnnouncementAction} submitLabel="Post announcement">
      <input type="hidden" name="classroomId" value={classroomId} />
      {subjectId && <input type="hidden" name="subjectId" value={subjectId} />}
      <textarea name="body" rows={2} required placeholder="Write an announcement…" className={fieldClass} />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {canAnnounceSchool ? (
          <select name="scope" defaultValue="classroom" className={`${fieldClass} w-auto`}>
            <option value="classroom">This class only</option>
            <option value="school">Whole school</option>
          </select>
        ) : (
          <input type="hidden" name="scope" value="classroom" />
        )}
        <input type="file" name="file" accept="application/pdf,image/*" />
      </div>
    </SubmitForm>
  );
}
