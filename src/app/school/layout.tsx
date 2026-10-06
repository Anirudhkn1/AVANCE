import type { Metadata } from "next";
import { connection } from "next/server";
import { schoolsHeading, schoolsTitle } from "@/app/fonts";
import { istBand } from "@/lib/schools-theme";
import "./schools.css";

export const metadata: Metadata = {
  title: "Avance Schools",
  description: "Homework, class notices and progress for students, parents and teachers.",
};

// Avance Schools is its own app inside Avance: the main navbar and purple
// background step aside under /school (see OutsideSchools in the root
// layout), and this wrapper re-themes everything below it — see schools.css.
export default async function SchoolsLayout({ children }: LayoutProps<"/school">) {
  // The time band is per request, never baked in at build time.
  await connection();
  return (
    <div className={`schools ${schoolsTitle.variable} ${schoolsHeading.variable}`} data-band={istBand()}>
      {children}
    </div>
  );
}
