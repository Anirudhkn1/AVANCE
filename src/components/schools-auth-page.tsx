import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { SchoolCampusScene, SchoolsSky } from "@/components/schools-backdrop";
import { SchoolsAuthForm } from "@/components/schools-auth";

/** /school/login and /school/register: the sky and campus, softly blurred, behind a notebook-page form. */
export async function SchoolsAuthPage({ mode, searchParams }: { mode: "login" | "register"; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).next;
  const next = typeof raw === "string" && /^\/(?![/\\])/.test(raw) ? raw : "/school/enter";
  if (await getSessionUserId()) redirect(next);

  return (
    <div className="schools-auth">
      <div className="schools-backdrop schools-auth__scene" aria-hidden>
        <SchoolsSky />
        <SchoolCampusScene />
      </div>
      <Link href="/school" className="schools-hero__exit">
        ← Avance Schools
      </Link>
      <div className="schools-auth__body">
        <Link href="/school" className="schools-title schools-auth__title">
          Avance Schools
        </Link>
        <SchoolsAuthForm mode={mode} next={next} />
      </div>
    </div>
  );
}
