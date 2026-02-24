"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NewWorkGroupModal from "./NewWorkGroupModal";

export default function CreateWorkGroupForm() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = () => {
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full sm:w-auto sm:min-w-[140px] sm:max-w-xs rounded-lg bg-black px-3 py-2 text-base font-medium text-white hover:bg-neutral-800 active:scale-[0.99] transition"
      >
        Crear grupo de trabajo
      </button>

      <NewWorkGroupModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}

