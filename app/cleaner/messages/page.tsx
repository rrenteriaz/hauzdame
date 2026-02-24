// app/cleaner/messages/page.tsx
import { requireCleanerUser } from "@/lib/auth/requireUser";
import { listThreadsForUser } from "@/lib/chat/auth";
import { MessagesInboxClient } from "@/components/chat/MessagesInboxClient";

/**
 * Página de inbox de mensajes para Cleaner
 * REGLA DE ORO: Solo muestra threads donde el usuario ES participante activo.
 * NO filtra por tenantId ni propertyId. Solo por participant.
 */
export default async function CleanerMessagesPage() {
  const user = await requireCleanerUser();

  // Usar helper centralizado que lista threads por participant (cross-tenant)
  const threads = await listThreadsForUser(user.id);

  return <MessagesInboxClient initialThreads={threads} basePath="/cleaner/messages" viewerUserId={user.id} />;
}

