"use client";

import Link from "next/link";

interface SummaryCardsProps {
  myCount: number;
  availableCount: number;
  upcomingCount: number;
  memberId?: string;
  returnTo?: string;
}

export default function SummaryCards({
  myCount,
  availableCount,
  upcomingCount,
  memberId,
  returnTo,
}: SummaryCardsProps) {
  const safeReturnTo =
    returnTo && returnTo.startsWith("/cleaner")
      ? returnTo
      : memberId
      ? `/cleaner?memberId=${encodeURIComponent(memberId)}`
      : "/cleaner";

  const availableParams = new URLSearchParams();
  if (memberId) availableParams.set("memberId", memberId);
  availableParams.set("returnTo", safeReturnTo);
  const availableHref = `/cleaner/cleanings/available?${availableParams.toString()}`;

  const myParams = new URLSearchParams();
  if (memberId) myParams.set("memberId", memberId);
  myParams.set("scope", "all"); // "all" muestra asignadas a mí (scope="assigned" con includeCompleted=true)
  myParams.set("returnTo", safeReturnTo);
  const myHref = `/cleaner/cleanings/all?${myParams.toString()}`;

  const upcomingParams = new URLSearchParams();
  if (memberId) upcomingParams.set("memberId", memberId);
  upcomingParams.set("scope", "upcoming");
  upcomingParams.set("returnTo", safeReturnTo);
  const upcomingHref = `/cleaner/cleanings/all?${upcomingParams.toString()}`;

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
      {/* Mis limpiezas */}
      <Link
        href={myHref}
        className="rounded-xl border border-neutral-200 bg-white p-3 pt-4 sm:pt-5 text-left hover:bg-neutral-50 hover:border-neutral-300 active:scale-[0.98] transition-all cursor-pointer"
      >
        <p className="text-xs text-neutral-500 mb-1">Mis limpiezas</p>
        <p className="text-2xl font-semibold text-neutral-900">{myCount}</p>
        <p className="text-[10px] text-neutral-400 mt-0.5">Asignadas a mí</p>
      </Link>

      {/* Disponibles */}
      <Link
        href={availableHref}
        className="rounded-xl border border-neutral-200 bg-white p-3 text-left hover:bg-neutral-50 hover:border-neutral-300 active:scale-[0.98] transition-all cursor-pointer"
      >
        <p className="text-xs text-neutral-500 mb-1">Disponibles</p>
        <p className="text-2xl font-semibold text-neutral-900">{availableCount}</p>
        <p className="text-[10px] text-neutral-400 mt-0.5">Para asignar</p>
      </Link>

      {/* Próximas limpiezas */}
      <Link
        href={upcomingHref}
        className="rounded-xl border border-neutral-200 bg-white p-3 text-left hover:bg-neutral-50 hover:border-neutral-300 active:scale-[0.98] transition-all cursor-pointer"
      >
        <p className="text-xs text-neutral-500 mb-1">Próximas limpiezas</p>
        <p className="text-2xl font-semibold text-neutral-900">{upcomingCount}</p>
        <p className="text-[10px] text-neutral-400 mt-0.5">Próximos 7 días</p>
      </Link>
    </section>
  );
}

