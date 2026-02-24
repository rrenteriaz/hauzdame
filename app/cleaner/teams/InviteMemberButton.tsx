"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InviteMemberModal from "./InviteMemberModal";

export default function InviteMemberButton({
  teamId,
  teamName,
}: {
  teamId: string;
  teamName: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="shrink-0 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 active:scale-[0.99] transition"
      >
        Invitar miembro
      </button>

      <InviteMemberModal
        teamId={teamId}
        teamName={teamName}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onInviteCreated={() => router.refresh()}
      />
    </>
  );
}


