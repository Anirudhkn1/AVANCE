"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { randomAvatarSeed } from "@/lib/avatar";

export async function loginAction(_prevState: string | undefined, formData: FormData): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Incorrect email or password.";
        default:
          return "Something went wrong signing you in.";
      }
    }
    throw error;
  }
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

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, passwordHash, avatarSeed: randomAvatarSeed() },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) return "Account created — please sign in.";
    throw error;
  }
}

export async function logoutAction() {
  const { signOut } = await import("@/auth");
  await signOut({ redirectTo: "/" });
}
