/**
 * CONTRACT: docs/contracts/INVITES_V3.md
 * Esta página es pública y NO debe alterar reglas de invitación,
 * estados, permisos ni flujos de claim.
 */
import { Suspense } from "react";
import JoinClient from "./JoinClient";

function JoinLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-neutral-600">Cargando invitación...</p>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<JoinLoading />}>
      <JoinClient />
    </Suspense>
  );
}
