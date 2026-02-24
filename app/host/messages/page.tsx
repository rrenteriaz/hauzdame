// app/host/messages/page.tsx
import { requireHostUser } from "@/lib/auth/requireUser";
import { listThreadsForUser } from "@/lib/chat/auth";
import { MessagesInboxClient } from "@/components/chat/MessagesInboxClient";

/**
 * Página de inbox de mensajes para Host
 * REGLA DE ORO: Solo muestra threads donde el usuario ES participante activo.
 * NO filtra por tenantId ni propertyId. Solo por participant.
 */
export default async function HostMessagesPage() {
  const user = await requireHostUser();

  // Usar helper centralizado que lista threads por participant (cross-tenant)
  const threads = await listThreadsForUser(user.id);

  return <MessagesInboxClient initialThreads={threads} basePath="/host/messages" viewerUserId={user.id} />;
}

