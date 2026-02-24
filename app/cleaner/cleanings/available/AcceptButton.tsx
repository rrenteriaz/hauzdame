"use client";

import { acceptCleaning } from "@/app/cleaner/actions";

interface AcceptButtonProps {
  cleaningId: string;
  returnTo: string;
}

export default function AcceptButton({ cleaningId, returnTo }: AcceptButtonProps) {
  return (
    <form
      action={acceptCleaning}
      onClick={(e) => {
        // PASO A: Prevenir que el click del form se propague al ListRow
        e.stopPropagation();
      }}
    >
      <input type="hidden" name="cleaningId" value={cleaningId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        className="rounded-lg bg-black px-4 py-2 text-base font-medium text-white hover:bg-neutral-800 active:scale-[0.99] transition"
        onClick={(e) => {
          // PASO A: Prevenir que el click del botón se propague al ListRow
          e.stopPropagation();
        }}
      >
        Aceptar
      </button>
    </form>
  );
}

