import { redirect } from "next/navigation";

// Organisations now live as icons on the home desktop (/dashboard) — Join and
// Create are their own front-facing icons there instead of a nested page.
// This route stays only so existing links don't 404.
export default function OrganisationsIndexRedirect() {
  redirect("/dashboard");
}
