"use client";

import { useTransition } from "react";
import { updateTeamStatus } from "../actions";

interface TeamStatusActionsProps {
  teamId: string;
  status: "ACTIVE" | "PAUSED" | "INACTIVE";
  isTeamLeader: boolean;
}

export default function TeamStatusActions({
  teamId,
  status,
  isTeamLeader,
}: TeamStatusActionsProps) {
  const [isPending, startTransition] = useTransition();

  if (!isTeamLeader) return null;
  if (status === "INACTIVE") {
    return (
      <span className="text-xs text-neutral-500">
        Inactivo (legado)
      </span>
    );
  }

  const isActive = status === "ACTIVE";
  const nextStatus = isActive ? "PAUSED" : "ACTIVE";

  const handleClick = () => {
    if (isActive) {
      const confirmed = window.confirm(
        "No estarás visible para Owners.\nNo recibirás alertas de nuevas limpiezas.\nPodrás reactivarlo cuando quieras."
      );
      if (!confirmed) return;
    }

    const formData = new FormData();
    formData.append("teamId", teamId);
    formData.append("nextStatus", nextStatus);

    startTransition(() => {
      updateTeamStatus(formData);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`rounded-lg border px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${
        isActive
          ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
      }`}
    >
      {isActive ? "Pausar equipo" : "Reactivar equipo"}
    </button>
  );
}

