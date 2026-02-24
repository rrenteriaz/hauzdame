// app/cleaner/messages/[threadId]/page.tsx
import { requireCleanerUser } from "@/lib/auth/requireUser";
import { requireChatParticipant } from "@/lib/chat/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ChatThreadView } from "@/components/chat/ChatThreadView";
import { ChatPageViewport } from "@/components/chat/ChatPageViewport";
import { ManageThreadMembers } from "@/components/chat/ManageThreadMembers";
import { notFound } from "next/navigation";

/**
 * Página de thread de chat para Cleaner
 * REGLA DE ORO: Solo participantes activos pueden acceder. Validado con requireChatParticipant.
 */
export default async function CleanerThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const user = await requireCleanerUser();

  const resolvedParams = await params;
  const threadId = resolvedParams.threadId;

  // Validar que el usuario es participante activo del thread y obtener su role
  // requireChatParticipant lanza notFound() si no es participante
  const viewerParticipant = await requireChatParticipant(threadId, user.id);
  const viewerParticipantRole = viewerParticipant.role;
  const thread = viewerParticipant.thread;

  // Cargar participantes adicionales (excluyendo el viewer)
  const otherParticipants = await prisma.chatParticipant.findMany({
    where: {
      threadId,
      userId: { not: user.id },
      leftAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarMedia: {
            select: {
              id: true,
              publicUrl: true,
            },
          },
        },
      },
      team: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Obtener la contraparte según el tipo de thread
  let counterpartName = "Chat";
  if (thread.type === "HOST_CLEANER" || thread.type === "HOST_TEAM") {
    // Cleaner ve Host (OWNER o ADMIN, no CLEANER ni HANDYMAN)
    const hostParticipant = otherParticipants.find(
      (p) => p.user?.role === "OWNER" || p.user?.role === "ADMIN"
    );
    counterpartName = hostParticipant?.user?.name || hostParticipant?.user?.email || "Host";
  } else if (thread.type === "TEAM_INTERNAL") {
    // Cleaner ve otro Cleaner del mismo team
    counterpartName = thread.team?.name || "Team";
  } else {
    // Fallback: primer participante
    const otherParticipant = otherParticipants[0]?.user;
    counterpartName = otherParticipant?.name || otherParticipant?.email || "Usuario";
  }

  return (
    <>
      <ChatPageViewport />
      <div className="flex flex-col h-full bg-white">
        {/* Header fijo */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 shrink-0 bg-white">
        <Link
          href="/cleaner/messages"
          className="text-neutral-600 hover:text-neutral-900 shrink-0"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-neutral-900 truncate">
            {counterpartName}
          </h1>
          <p className="text-xs text-neutral-500 truncate">
            {thread.property?.name || "Alojamiento"}
          </p>
        </div>
        <ManageThreadMembers
          threadId={threadId}
          threadType={thread.type}
          viewerParticipantRole={viewerParticipantRole}
        />
      </div>
      
      {/* Chat view - ocupa el resto del espacio */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full">
          <ChatThreadView 
            threadId={threadId} 
            threadStatus={thread.status || undefined}
            applicationStatus={thread.application?.status || undefined}
            userRole="CLEANER"
            viewerUserId={user.id}
            counterpartName={counterpartName}
            threadType={thread.type}
            viewerParticipantRole={viewerParticipantRole}
          />
        </div>
      </div>
    </div>
    </>
  );
}

