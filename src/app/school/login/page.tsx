import { SchoolsAuthPage } from "@/components/schools-auth-page";

export default function SchoolsLoginPage({ searchParams }: PageProps<"/school/login">) {
  return <SchoolsAuthPage mode="login" searchParams={searchParams} />;
}
