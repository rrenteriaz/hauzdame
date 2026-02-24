// app/api/tenant/init/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ensureCanonicalVariantGroupsForTenant } from '@/lib/variant-groups-bootstrap';

type InitTenantBody = {
  tenantName: string;
  tenantSlug?: string;
  ownerEmail: string;
  ownerName?: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .replace(/[^a-z0-9]+/g, '-') // espacios y símbolos -> guiones
    .replace(/^-+|-+$/g, ''); // quitar guiones al inicio/fin
}

export async function POST(req: NextRequest) {
  try {
    // Verificar que Prisma esté inicializado
    if (!prisma) {
      console.error('Prisma client no está inicializado');
      return NextResponse.json(
        { error: 'Error de configuración del servidor: Prisma no inicializado' },
        { status: 500 }
      );
    }

    console.log('Prisma client inicializado correctamente');

    let body: Partial<InitTenantBody>;
    try {
      body = (await req.json()) as Partial<InitTenantBody>;
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Error al parsear el JSON del cuerpo de la petición' },
        { status: 400 }
      );
    }

    if (!body.tenantName || !body.ownerEmail) {
      return NextResponse.json(
        { error: 'tenantName y ownerEmail son obligatorios' },
        { status: 400 }
      );
    }

    const tenantName = body.tenantName;
    const ownerEmail = body.ownerEmail;
    const tenantSlug = body.tenantSlug
      ? slugify(body.tenantSlug)
      : slugify(tenantName);

    // Crear tenant + user OWNER y bootstrap de grupos de variantes
    const tenant = await prisma.$transaction(async (tx) => {
      const t = await tx.tenant.create({
        data: {
          name: tenantName,
          slug: tenantSlug,
          users: {
            create: {
              email: ownerEmail,
              name: body.ownerName ?? null,
              role: 'OWNER',
            },
          },
        },
        include: {
          users: true,
        },
      });
      await ensureCanonicalVariantGroupsForTenant(t.id, tx);
      return t;
    });

    return NextResponse.json(
      {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
        owner: tenant.users[0]
          ? {
              id: tenant.users[0].id,
              email: tenant.users[0].email,
              name: tenant.users[0].name,
              role: tenant.users[0].role,
            }
          : null,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creando tenant:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      name: error?.name,
    });

    // Manejo simple de errores de unicidad (slug o email)
    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          error:
            'Slug de tenant o email ya existen. Prueba con otro tenantSlug u ownerEmail.',
        },
        { status: 409 }
      );
    }

    // Error de conexión a la base de datos
    if (error.code === 'P1001' || error.message?.includes('Can\'t reach database server')) {
      return NextResponse.json(
        {
          error: 'No se puede conectar a la base de datos. Verifica que DATABASE_URL esté configurada y que la base de datos esté corriendo.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        { status: 503 }
      );
    }

    // Error de autenticación
    if (error.code === 'P1000') {
      return NextResponse.json(
        {
          error: 'Error de autenticación con la base de datos. Verifica DATABASE_URL.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        { status: 503 }
      );
    }

    // Asegurar que siempre devolvamos un JSON válido
    const errorMessage = error?.message || 'Error desconocido';
    const errorName = error?.name || 'UnknownError';
    
    return NextResponse.json(
      {
        error: 'Error interno al crear tenant',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        code: error?.code,
        name: process.env.NODE_ENV === 'development' ? errorName : undefined,
      },
      { status: 500 }
    );
  }
}

