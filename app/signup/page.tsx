// app/signup/page.tsx
import { Suspense } from "react";
import SignupClient from "./SignupClient";

function SignupLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-neutral-600">Cargando...</p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupLoading />}>
      <SignupClient />
    </Suspense>
  );
}
