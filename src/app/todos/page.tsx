import { requireSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createTodoAction } from "@/actions/todos";
import { formatDate } from "@/lib/format";
import { Card, SectionHeading, EmptyState } from "@/components/ui";
import { SubmitForm } from "@/components/forms";
import { ToggleTodoButton, DeleteTodoButton } from "@/components/todo-controls";

export default async function TodosPage() {
  const user = await requireSessionUser();

  const todos = await prisma.todo.findMany({
    where: { userId: user.id },
    orderBy: [{ done: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
  });
  const open = todos.filter((t) => !t.done);
  const completed = todos.filter((t) => t.done);

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">To-Do List</h1>
        <p className="text-muted text-sm mt-1">Personal and private — separate from your organisations, XP, or Fair Play.</p>
      </div>

      <Card>
        <SectionHeading title="New task" />
        <SubmitForm action={createTodoAction} submitLabel="Add task" className="flex flex-col sm:flex-row gap-2">
          <input
            name="title"
            required
            placeholder="e.g. Finish lab report"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            name="dueDate"
            type="date"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </SubmitForm>
      </Card>

      <div>
        <SectionHeading title={`Open (${open.length})`} />
        {open.length === 0 ? (
          <Card><EmptyState title="Nothing pending" description="Add a task above to get started." /></Card>
        ) : (
          <div className="space-y-2">
            {open.map((t) => (
              <Card key={t.id} className="flex items-center gap-3">
                <ToggleTodoButton todoId={t.id} done={t.done} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  {t.dueDate && <p className="text-xs text-muted">Due {formatDate(t.dueDate)}</p>}
                </div>
                <DeleteTodoButton todoId={t.id} />
              </Card>
            ))}
          </div>
        )}
      </div>

      {completed.length > 0 && (
        <div>
          <SectionHeading title={`Completed (${completed.length})`} />
          <div className="space-y-2">
            {completed.map((t) => (
              <Card key={t.id} className="flex items-center gap-3 opacity-60">
                <ToggleTodoButton todoId={t.id} done={t.done} />
                <p className="flex-1 min-w-0 text-sm font-medium line-through truncate">{t.title}</p>
                <DeleteTodoButton todoId={t.id} />
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
