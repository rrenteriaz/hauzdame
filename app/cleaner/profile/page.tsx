// app/cleaner/profile/page.tsx
import prisma from "@/lib/prisma";
import { requireCleanerUser } from "@/lib/auth/requireUser";
import Page from "@/lib/ui/Page";
import CleanerProfileClient from "./profile-client";

export default async function CleanerProfilePage() {
  const sessionUser = await requireCleanerUser();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      email: true,
      name: true, // nickname
      cleanerProfile: {
        select: {
          fullName: true,
          phone: true,
          addressLine1: true,
          addressLine2: true,
          neighborhood: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
          latitude: true,
          longitude: true,
        },
      },
    },
  });

  if (!user) {
    // sesión inválida (fallback seguro)
    return (
      <Page title="Perfil">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          No se pudo cargar tu perfil. Intenta volver a iniciar sesión.
        </div>
      </Page>
    );
  }

  return (
    <Page
      title="Perfil"
      subtitle="Revisa y edita tu información"
      containerSpacing="none"
      contentSpacing="default"
    >
      <CleanerProfileClient
        user={{
          id: user.id,
          email: user.email,
          nickname: user.name,
        }}
        cleanerProfile={user.cleanerProfile}
      />
    </Page>
  );
}
