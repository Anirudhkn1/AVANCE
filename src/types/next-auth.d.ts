import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      avatarSeed: string;
    } & DefaultSession["user"];
  }

  interface User {
    avatarSeed: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    avatarSeed: string;
  }
}

// "next-auth/jwt" just re-exports from here — augment the module the JWT
// interface is actually declared in, or the extra fields resolve to
// `unknown` via its Record<string, unknown> base instead of merging.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    avatarSeed: string;
  }
}
