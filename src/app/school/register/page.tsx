import { SchoolsAuthPage } from "@/components/schools-auth-page";

export default function SchoolsRegisterPage({ searchParams }: PageProps<"/school/register">) {
  return <SchoolsAuthPage mode="register" searchParams={searchParams} />;
}
