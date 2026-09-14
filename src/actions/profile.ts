"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { avatarValue, isAvatarStyle } from "@/lib/avatar";

/** Saves the avatar picked at /profile/avatar. Takes plain FormData (style +
 * seed hidden inputs, one pair per thumbnail) so each option in the picker
 * grid can be its own zero-JS <form>. */
export async function updateAvatarAction(formData: FormData) {
  const user = await requireUser();
  const style = String(formData.get("style") ?? "");
  const seed = String(formData.get("seed") ?? "");

  if (isAvatarStyle(style) && seed) {
    await prisma.user.update({ where: { id: user.id }, data: { avatarSeed: avatarValue(style, seed) } });
    // The avatar shows in the navbar on every page, not just /profile.
    revalidatePath("/", "layout");
  }

  redirect("/profile");
}
