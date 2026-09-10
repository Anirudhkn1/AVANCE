"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";

// Personal to-do list — deliberately outside the organisation hierarchy, same
// shape as src/actions/habits.ts. None of these touch OrganisationMembership,
// XP, or Fair Play.

const createTodoSchema = z.object({
  title: z.string().trim().min(1, "Enter a task.").max(140),
  dueDate: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : null)),
});

export async function createTodoAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireUser();
  const parsed = createTodoSchema.safeParse({
    title: formData.get("title"),
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid task.";

  await prisma.todo.create({
    data: { userId: user.id, title: parsed.data.title, dueDate: parsed.data.dueDate },
  });
  revalidatePath("/todos");
}

export async function toggleTodoAction(todoId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const todo = await prisma.todo.findUnique({ where: { id: todoId } });
  if (!todo || todo.userId !== user.id) return { ok: false, error: "Task not found." };

  const done = !todo.done;
  await prisma.todo.update({
    where: { id: todoId },
    data: { done, completedAt: done ? new Date() : null },
  });
  revalidatePath("/todos");
  return { ok: true };
}

export async function deleteTodoAction(todoId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const todo = await prisma.todo.findUnique({ where: { id: todoId } });
  if (!todo || todo.userId !== user.id) return { ok: false, error: "Task not found." };

  await prisma.todo.delete({ where: { id: todoId } });
  revalidatePath("/todos");
  return { ok: true };
}
