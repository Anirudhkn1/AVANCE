import Link from "next/link";
import { ClassroomDoodles, PageTurn } from "@/components/schools-chrome";

// Every Avance Schools page after the hero: a slim notebook-style bar in
// place of the main app's navbar, ruled paper behind the page.
export default function InsideSchoolsLayout({ children }: LayoutProps<"/school">) {
  return (
    <div className="schools-paper flex flex-1 flex-col">
      <header className="schools-topbar">
        <Link href="/school" className="schools-title schools-topbar__brand" aria-label="Avance Schools home">
          Avance Schools
        </Link>
        <Link href="/profiles" className="schools-topbar__exit">
          ← Back to Avance
        </Link>
      </header>
      <ClassroomDoodles />
      <PageTurn>{children}</PageTurn>
    </div>
  );
}
