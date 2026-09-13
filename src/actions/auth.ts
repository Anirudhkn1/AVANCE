"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomAvatarSeed } from "@/lib/avatar";

export async function loginAction(_prevState: string | undefined, formData: FormData): Promise<string | undefined> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return "Enter your email and password.";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return "Incorrect email or password.";

  redirect("/dashboard");
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function registerAction(_prevState: string | undefined, formData: FormData): Promise<string | undefined> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return "An account with that email already exists.";

  // Create the Supabase Auth user via the admin client with email_confirm
  // true, so registration never depends on the project's "Confirm email"
  // dashboard setting — preserves the existing auto-signed-in-after-register UX.
  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (createError || !created.user) {
    return createError?.message.toLowerCase().includes("already")
      ? "An account with that email already exists."
      : "Something went wrong creating your account.";
  }

  try {
    await prisma.user.create({
      data: { id: created.user.id, name, email, avatarSeed: randomAvatarSeed() },
    });
  } catch (error) {
    // Roll back the orphaned Supabase Auth user rather than leaving an
    // account that can sign in but has no app-side profile row.
    await admin.auth.admin.deleteUser(created.user.id);
    throw error;
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) return "Account created — please sign in.";

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
