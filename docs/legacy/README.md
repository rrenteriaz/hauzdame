# Hausdame

Sistema de gestión de limpiezas y mantenimiento para propiedades de alquiler.

## 🚀 Getting Started

### Prerrequisitos

- Node.js 20+
- PostgreSQL (Neon recomendado)
- Variables de entorno configuradas (ver `.env.example`)

### Instalación

```bash
npm install
npm run db:sanity  # Verificar estado de la DB
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📦 Scripts Disponibles

### Desarrollo

```bash
npm run dev              # Iniciar servidor de desarrollo
npm run build            # Build para producción
npm run lint             # Ejecutar ESLint
```

### Base de Datos

```bash
npm run db:status        # Ver estado de migraciones
npm run db:dev           # Crear/aplicar migración (desarrollo)
npm run db:deploy        # Aplicar migraciones (producción)
npm run db:sanity        # Validar estructuras críticas de DB
npm run db:pull:audit    # Sincronizar schema desde DB (solo auditoría)
```

⚠️ **Importante**: Ver [docs/DB_MIGRATIONS.md](docs/DB_MIGRATIONS.md) para el flujo correcto de migraciones.

### Utilidades

```bash
npm run seed:dev         # Seed de usuarios de desarrollo
npm run set-password    # Establecer contraseña de usuario
npm run create-missing-cleanings  # Crear limpiezas faltantes
```

## 📚 Documentación

- [DB Migrations Playbook](docs/DB_MIGRATIONS.md) - Guía completa de migraciones
- [AUTH Implementation](AUTH_IMPLEMENTACION_RESUMEN.md) - Sistema de autenticación
- [Chat Implementation](OFFLINE_CHAT_IMPLEMENTACION.md) - Sistema de chat

## Contracts
- Invitations (Team + Join): docs/contracts/INVITES_V3.md

## 🛠️ Tecnologías

- **Framework**: Next.js 16 (App Router)
- **Base de Datos**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Autenticación**: Session-based (bcryptjs)
- **UI**: React 19, Tailwind CSS 4

## 📝 Notas Importantes

### Migraciones de Base de Datos

**NUNCA** usar `prisma migrate resolve --applied` sin ejecutar el SQL primero. Esto causa drift severo.

Siempre ejecutar `npm run db:sanity` antes de hacer deploy para validar que las estructuras críticas existen.

Ver [docs/DB_MIGRATIONS.md](docs/DB_MIGRATIONS.md) para más detalles.

## 🚢 Deploy

El proyecto está optimizado para deploy en Vercel, pero puede ejecutarse en cualquier plataforma que soporte Next.js.

Antes de deploy:
1. `npm run db:sanity` - Validar DB
2. `npm run db:status` - Verificar migraciones
3. `npm run build` - Verificar que compila

## 📄 Licencia

Privado - Todos los derechos reservados
