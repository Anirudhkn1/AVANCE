import Link from "next/link";
import { ClassroomDoodles, PageTurn, SceneSwitch, SchoolsDock, SchoolsTabs } from "@/components/schools-chrome";
import { ClassroomBackdrop, SchoolCampusScene, SchoolsSky } from "@/components/schools-backdrop";

// Every Avance Schools page after the hero: a glass bar in place of the main
// app's navbar — brand, the section tabs (Home, Announcements, Elixir,
// Leaderboard, Profile…; a dock along the bottom on phones) and the way back
// to Avance — and behind the page a sky with drifting clouds over the
// school campus or, on classroom pages, the classroom (see schools-backdrop).
export default function InsideSchoolsLayout({ children }: LayoutProps<"/school">) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="schools-backdrop" aria-hidden>
        <SchoolsSky />
        <SceneSwitch campus={<SchoolCampusScene />} classroom={<ClassroomBackdrop />} />
      </div>
      <header className="schools-topbar">
        <Link href="/school" className="schools-title schools-topbar__brand" aria-label="Avance Schools home">
          Avance Schools
        </Link>
        <SchoolsTabs />
        <Link href="/profiles" className="schools-topbar__exit">
          ← <span className="schools-topbar__exit-long">Back to </span>Avance
        </Link>
      </header>
      <SchoolsDock />
      <ClassroomDoodles />
      <PageTurn>{children}</PageTurn>
    </div>
  );
}
