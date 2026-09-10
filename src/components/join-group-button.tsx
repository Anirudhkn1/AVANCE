"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinGroupAction } from "@/actions/groups";
import { Button } from "@/components/ui";

export function JoinGroupButton({ organisationId, groupId }: { organisationId: string; groupId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await joinGroupAction(organisationId, groupId);
          router.refresh();
        })
      }
    >
      {pending ? "Joining…" : "Join group"}
    </Button>
  );
}
