// lib/chat/auth.ts
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

/**
 * REGLA DE ORO: El acceso a un thread depende SOLO de participants.
 * Si no eres participante activo (leftAt = null) → no entras.
 * Sin depender de tenantId, propertyId ni roles externos.
 */

/**
 * Requiere que el usuario sea participante activo del thread
 * Si no es participante, redirige a 404 (notFound) o puede throw error según use-case
 */
export async function requireChatParticipant(
  threadId: string,
  viewerUserId: string
) {
  const participant = await prisma.chatParticipant.findFirst({
    where: {
      threadId,
      userId: viewerUserId,
      leftAt: null, // Solo participantes activos
    },
    include: {
      thread: {
        select: {
          id: true,
          type: true,
          teamId: true,
          status: true,
          property: {
            select: {
              id: true,
              name: true,
              shortName: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
            },
          },
          application: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarMedia: {
            select: {
              id: true,
              publicUrl: true,
            },
          },
        },
      },
    },
  });

  if (!participant) {
    notFound(); // O puede throw error según use-case
  }

  return participant;
}

/**
 * Lista threads donde el usuario es participante activo
 * IMPORTANTE: No filtra por tenantId ni propertyId. Solo por participant.
 */
/**
 * Lista threads donde el usuario es participante activo
 * IMPORTANTE: No filtra por tenantId ni propertyId. Solo por participant.
 */
export async function listThreadsForUser(viewerUserId: string) {
  // Obtener IDs de threads donde el usuario es participante activo
  const participantRecords = await prisma.chatParticipant.findMany({
    where: {
      userId: viewerUserId,
      leftAt: null,
    },
    select: {
      threadId: true,
    },
  });

  const threadIds = participantRecords.map((p) => p.threadId);

  if (threadIds.length === 0) {
    return [];
  }

  // Obtener threads completos
  const threads = await prisma.chatThread.findMany({
    where: {
      id: { in: threadIds },
    },
    include: {
      property: {
        select: {
          id: true,
          name: true,
          shortName: true,
        },
      },
      participants: {
        where: {
          userId: { not: viewerUserId },
          leftAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarMedia: {
                select: {
                  id: true,
                  publicUrl: true,
                },
              },
            },
          },
        },
      },
      messages: {
        take: 1,
        orderBy: { serverCreatedAt: "desc" },
        select: {
          body: true,
          senderUser: {
            select: {
              id: true,
              name: true,
              avatarMedia: {
                select: {
                  id: true,
                  publicUrl: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [
      {
        lastMessageAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  // Convertir fechas a strings para compatibilidad con el tipo Thread esperado
  return threads.map((thread) => ({
    ...thread,
    lastMessageAt: thread.lastMessageAt?.toISOString() || null,
    status: thread.status as string,
  }));
}

/**
 * Crea o obtiene un thread HOST_CLEANER (Host ↔ Cleaner individual)
 * Busca thread existente con participantes exactamente host+cleaner (activos)
 * Si no existe, crea Thread + participants (OWNER para host, MEMBER para cleaner)
 */
export async function createOrGetThreadHostCleaner(
  hostUserId: string,
  cleanerUserId: string,
  propertyId?: string
) {
  // Buscar threads tipo HOST_CLEANER con participantes exactamente host+cleaner (activos)
  // Usar AND para requerir ambas condiciones
  const candidateThreads = await prisma.chatThread.findMany({
    where: {
      type: "HOST_CLEANER",
      ...(propertyId ? { propertyId } : {}),
      AND: [
        {
          participants: {
            some: {
              userId: hostUserId,
              leftAt: null,
            },
          },
        },
        {
          participants: {
            some: {
              userId: cleanerUserId,
              leftAt: null,
            },
          },
        },
      ],
    },
    include: {
      participants: {
        where: {
          leftAt: null,
        },
      },
    },
  });

  // Buscar thread que tenga exactamente 2 participantes activos (host y cleaner) y ningún otro
  const existingThread = candidateThreads.find(
    (t) =>
      t.participants.length === 2 &&
      t.participants.some((p) => p.userId === hostUserId) &&
      t.participants.some((p) => p.userId === cleanerUserId)
  );

  if (existingThread) {
    return existingThread;
  }

  // Si no existe o no cumple, crear nuevo thread
  if (!propertyId) {
    throw new Error("propertyId es requerido para crear thread HOST_CLEANER");
  }

  // Obtener tenantId del host (o cleaner, ambos deben ser del mismo tenant para propertyId)
  const hostUser = await prisma.user.findUnique({
    where: { id: hostUserId },
    select: { tenantId: true },
  });

  if (!hostUser) {
    throw new Error("Host user no encontrado");
  }

  const newThread = await prisma.chatThread.create({
    data: {
      tenantId: hostUser.tenantId || "",
      propertyId,
      type: "HOST_CLEANER",
      contextType: "REQUEST",
      status: "ACTIVE",
      participants: {
        create: [
          {
            userId: hostUserId,
            role: "OWNER",
          },
          {
            userId: cleanerUserId,
            role: "MEMBER",
            addedByUserId: hostUserId,
          },
        ],
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  return newThread;
}

/**
 * Crea o obtiene un thread HOST_TEAM (Host ↔ Team)
 * Busca thread existente tipo HOST_TEAM con teamId y participants incluyen host + TL (activos)
 * Si no existe, crea Thread(type HOST_TEAM, teamId) + participants:
 * - host: MEMBER
 * - TL: OWNER (o ADMIN/OWNER)
 * - participant.teamId = teamId para TL (y para miembros agregados después)
 */
export async function createOrGetThreadHostTeam(
  hostUserId: string,
  teamLeaderUserId: string,
  teamId: string,
  propertyId?: string
) {
  // Validar que teamLeaderUserId existe y es CLEANER
  // Nota: TeamMember no tiene relación directa con User.id
  // Por ahora, validar que el usuario existe y tiene role CLEANER
  // TODO: Si TeamMember tiene userId en el futuro, validar membership aquí
  const teamLeader = await prisma.user.findUnique({
    where: { id: teamLeaderUserId },
    select: {
      id: true,
      role: true,
      tenantId: true,
    },
  });

  if (!teamLeader || teamLeader.role !== "CLEANER") {
    throw new Error("TeamLeader debe ser un Cleaner");
  }

  // Validar que el team existe
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      tenantId: true,
    },
  });

  if (!team) {
    throw new Error("Team no encontrado");
  }

  // Buscar threads tipo HOST_TEAM con teamId
  // Luego filtrar en memoria para asegurar que tiene host + TL
  const candidateThreads = await prisma.chatThread.findMany({
    where: {
      type: "HOST_TEAM",
      teamId,
      ...(propertyId ? { propertyId } : {}),
      AND: [
        {
          participants: {
            some: {
              userId: hostUserId,
              leftAt: null,
            },
          },
        },
        {
          participants: {
            some: {
              userId: teamLeaderUserId,
              leftAt: null,
            },
          },
        },
      ],
    },
    include: {
      participants: {
        where: {
          leftAt: null,
        },
      },
    },
  });

  // Verificar que tiene host y TL como participantes activos
  const existingThread = candidateThreads.find(
    (t) =>
      t.participants.some((p) => p.userId === hostUserId) &&
      t.participants.some((p) => p.userId === teamLeaderUserId)
  );

  if (existingThread) {
    return existingThread;
  }

  // Si no existe o no cumple, crear nuevo thread
  if (!propertyId) {
    throw new Error("propertyId es requerido para crear thread HOST_TEAM");
  }

  // Obtener tenantId del host (o del team)
  const hostUser = await prisma.user.findUnique({
    where: { id: hostUserId },
    select: { tenantId: true },
  });

  if (!hostUser) {
    throw new Error("Host user no encontrado");
  }

  // Obtener TeamMembership del team leader (debe existir y estar ACTIVE)
  const teamLeaderMembership = await prisma.teamMembership.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId: teamLeaderUserId,
      },
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!teamLeaderMembership || teamLeaderMembership.status !== "ACTIVE") {
    throw new Error("Team leader debe tener TeamMembership ACTIVE en el equipo");
  }

  const newThread = await prisma.chatThread.create({
    data: {
      tenantId: hostUser.tenantId || "",
      propertyId,
      teamId,
      type: "HOST_TEAM",
      contextType: "REQUEST",
      status: "ACTIVE",
      participants: {
        create: [
          {
            userId: hostUserId,
            role: "MEMBER",
            addedByUserId: teamLeaderUserId,
            // Host no tiene teamMembershipId (no es miembro del team)
          },
          {
            userId: teamLeaderUserId,
            role: "OWNER",
            teamId, // TL participa "como parte del Team"
            teamMembershipId: teamLeaderMembership.id, // Setear teamMembershipId
            addedByUserId: teamLeaderUserId,
          },
        ],
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  return newThread;
}

/**
 * Agrega un participante a un thread
 * Reglas:
 * - Si thread.type === HOST_TEAM: SOLO TL (participantRole OWNER) puede agregar/remover miembros
 * - Host NO puede agregar/remover
 * - targetUserId debe ser miembro del teamId del thread (validar membership)
 * - al insertar ThreadParticipant para targetUserId, set teamId = thread.teamId
 * - Si thread.type === TEAM_INTERNAL: SOLO TL/ADMIN puede agregar (o cualquiera si decides)
 * - target debe ser del mismo teamId
 * - HOST_CLEANER: por defecto NO agregar terceros (mantener 1:1)
 * - Si ya existe con removedAt set, reactivar (removedAt=null)
 */
export async function addThreadParticipant(
  threadId: string,
  actorUserId: string,
  targetUserId: string
) {
  // Requiere que el actor sea participante activo
  const actorParticipant = await requireChatParticipant(threadId, actorUserId);

  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      type: true,
      teamId: true,
    },
  });

  if (!thread) {
    throw new Error("Thread no encontrado");
  }

  // Validar permisos según tipo de thread
  if (thread.type === "HOST_TEAM") {
    // SOLO TL (OWNER) puede agregar miembros
    if (actorParticipant.role !== "OWNER") {
      throw new Error("Solo el Team Leader puede agregar miembros a threads HOST_TEAM");
    }

    // Validar que targetUserId es miembro del team usando TeamMembership
    if (!thread.teamId) {
      throw new Error("Thread HOST_TEAM debe tener teamId");
    }

    const targetMembership = await prisma.teamMembership.findUnique({
      where: {
        teamId_userId: {
          teamId: thread.teamId,
          userId: targetUserId,
        },
      },
      select: {
        id: true,
        status: true,
        role: true,
      },
    });

    if (!targetMembership || targetMembership.status !== "ACTIVE") {
      throw new Error("El usuario objetivo debe ser miembro activo del equipo");
    }

    // Verificar si ya existe participante (aunque esté removido)
    const existing = await prisma.chatParticipant.findUnique({
      where: {
        threadId_userId: {
          threadId,
          userId: targetUserId,
        },
      },
    });

    if (existing) {
      // Reactivar si está removido
      if (existing.leftAt) {
        await prisma.chatParticipant.update({
          where: { id: existing.id },
          data: {
            leftAt: null,
            role: "MEMBER",
            teamId: thread.teamId, // Participa "como parte del Team"
            teamMembershipId: targetMembership.id, // Setear teamMembershipId
            addedByUserId: actorUserId,
            updatedAt: new Date(),
          },
        });
      }
      return existing;
    }

    // Crear nuevo participante con teamMembershipId
    const newParticipant = await prisma.chatParticipant.create({
      data: {
        threadId,
        userId: targetUserId,
        role: "MEMBER",
        teamId: thread.teamId, // Participa "como parte del Team"
        teamMembershipId: targetMembership.id, // Setear teamMembershipId
        addedByUserId: actorUserId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return newParticipant;
  }

  if (thread.type === "TEAM_INTERNAL") {
    // SOLO TL/ADMIN puede agregar
    if (actorParticipant.role !== "OWNER" && actorParticipant.role !== "ADMIN") {
      throw new Error("Solo TL/ADMIN puede agregar miembros a threads TEAM_INTERNAL");
    }

    // Validar que target es del mismo teamId
    if (!thread.teamId) {
      throw new Error("Thread TEAM_INTERNAL debe tener teamId");
    }

    // Validar que targetUserId es miembro del team usando TeamMembership
    if (!thread.teamId) {
      throw new Error("Thread TEAM_INTERNAL debe tener teamId");
    }

    const targetMembership = await prisma.teamMembership.findUnique({
      where: {
        teamId_userId: {
          teamId: thread.teamId,
          userId: targetUserId,
        },
      },
      select: {
        id: true,
        status: true,
        role: true,
      },
    });

    if (!targetMembership || targetMembership.status !== "ACTIVE") {
      throw new Error("El usuario objetivo debe ser miembro activo del equipo");
    }

    // Verificar si ya existe participante
    const existing = await prisma.chatParticipant.findUnique({
      where: {
        threadId_userId: {
          threadId,
          userId: targetUserId,
        },
      },
    });

    if (existing) {
      if (existing.leftAt) {
        await prisma.chatParticipant.update({
          where: { id: existing.id },
          data: {
            leftAt: null,
            role: "MEMBER",
            teamId: thread.teamId,
            teamMembershipId: targetMembership.id, // Setear teamMembershipId
            addedByUserId: actorUserId,
            updatedAt: new Date(),
          },
        });
      }
      return existing;
    }

    const newParticipant = await prisma.chatParticipant.create({
      data: {
        threadId,
        userId: targetUserId,
        role: "MEMBER",
        teamId: thread.teamId,
        teamMembershipId: targetMembership.id, // Setear teamMembershipId
        addedByUserId: actorUserId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return newParticipant;
  }

  // HOST_CLEANER: por defecto NO agregar terceros (mantener 1:1)
  throw new Error("No se pueden agregar terceros a threads HOST_CLEANER");
}

/**
 * Remueve un participante de un thread
 * Reglas espejo de addThreadParticipant
 */
export async function removeThreadParticipant(
  threadId: string,
  actorUserId: string,
  targetUserId: string
) {
  // Requiere que el actor sea participante activo
  const actorParticipant = await requireChatParticipant(threadId, actorUserId);

  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      type: true,
    },
  });

  if (!thread) {
    throw new Error("Thread no encontrado");
  }

  // Validar permisos según tipo de thread
  if (thread.type === "HOST_TEAM") {
    // SOLO TL (OWNER) puede remover miembros
    if (actorParticipant.role !== "OWNER") {
      throw new Error("Solo el Team Leader puede remover miembros de threads HOST_TEAM");
    }
  } else if (thread.type === "TEAM_INTERNAL") {
    // SOLO TL/ADMIN puede remover
    if (actorParticipant.role !== "OWNER" && actorParticipant.role !== "ADMIN") {
      throw new Error("Solo TL/ADMIN puede remover miembros de threads TEAM_INTERNAL");
    }
  } else {
    // HOST_CLEANER: por defecto NO remover participantes (mantener 1:1)
    throw new Error("No se pueden remover participantes de threads HOST_CLEANER");
  }

  // Verificar que el target es participante activo
  const targetParticipant = await prisma.chatParticipant.findFirst({
    where: {
      threadId,
      userId: targetUserId,
      leftAt: null,
    },
  });

  if (!targetParticipant) {
    throw new Error("Usuario objetivo no es participante activo del thread");
  }

  // Soft delete: marcar leftAt
  await prisma.chatParticipant.update({
    where: { id: targetParticipant.id },
    data: {
      leftAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return targetParticipant;
}

/**
 * Obtiene el nombre de visualización para un mensaje según el contexto del thread
 * - Si sender es cleaner y thread.type === HOST_TEAM:
 *     - Si sender tiene participant.teamId === thread.teamId => "{senderName} (Team X)"
 *     - else "{senderName}"
 * - Host: {hostName}
 */
export async function getDisplayNameForMessage(
  threadId: string,
  viewerUserId: string,
  senderId: string
): Promise<string> {
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      type: true,
      teamId: true,
      team: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!thread) {
    return "Usuario";
  }

  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: {
      id: true,
      name: true,
      role: true,
    },
  });

  if (!sender) {
    return "Usuario";
  }

  // Si el sender es el viewer, mostrar "Tú" o nombre propio
  if (senderId === viewerUserId) {
    return sender.name || "Tú";
  }

  // Si es thread HOST_TEAM y el sender es cleaner
  if (thread.type === "HOST_TEAM" && sender.role === "CLEANER") {
    const senderParticipant = await prisma.chatParticipant.findFirst({
      where: {
        threadId,
        userId: senderId,
        leftAt: null,
      },
      select: {
        teamId: true,
      },
    });

    if (senderParticipant?.teamId === thread.teamId && thread.team) {
      return `${sender.name || "Usuario"} (${thread.team.name})`;
    }
  }

  return sender.name || "Usuario";
}

