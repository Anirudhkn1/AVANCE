// Shared by the seed scripts (seed.ts, seed-school.ts).

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

// Constructed before the Supabase client below: PrismaClient is what loads
// .env into process.env when these scripts run under plain `tsx`.
export const prisma = new PrismaClient();
// Not importing src/lib/supabase/admin.ts here: it has `import "server-only"`,
// which Next's bundler special-cases but plain `tsx` (this script's runtime)
// can't resolve — so the seed scripts build their own admin client inline.
export const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const DEMO_PASSWORD = "password123";

// `npm run db:reset` runs `prisma db push --force-reset` (drops/recreates
// only the tables Prisma manages, i.e. the `public` schema) followed by the
// seeds — it never touches Supabase's separate `auth` schema. So on a second
// run, `prisma.user` is empty but the Supabase Auth users from the previous
// run still exist. Look one up by email before creating, so re-seeding
// doesn't fail on "user already registered".
async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.find((u) => u.email === email)?.id ?? null;
}

export async function ensureUser({ name, email, avatarSeed }: { name: string; email: string; avatarSeed: string }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  let authUserId = await findAuthUserIdByEmail(email);
  if (!authUserId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { name },
    });
    if (error || !data.user) throw error ?? new Error(`Failed to create auth user for ${email}`);
    authUserId = data.user.id;
  }

  return prisma.user.create({ data: { id: authUserId, name, email, avatarSeed } });
}
