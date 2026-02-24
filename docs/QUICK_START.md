# Quick Start - Hausdame

## 🚀 Setup Inicial

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

Copia `.env.example` a `.env` y configura:

- `DATABASE_URL`: URL de conexión a PostgreSQL (Neon)
- Otras variables según necesidad

### 3. Validar Base de Datos

```bash
npm run db:sanity
```

Este comando valida que las estructuras críticas existan. Si falla, consulta [DB_MIGRATIONS.md](DB_MIGRATIONS.md).

### 4. Aplicar Migraciones (si es necesario)

```bash
# Desarrollo
npm run db:dev

# Producción
npm run db:deploy
```

### 5. Iniciar Servidor

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## 📋 Comandos Esenciales

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run db:sanity` | Validar estado de DB |
| `npm run db:status` | Ver estado de migraciones |
| `npm run db:dev` | Crear/aplicar migración (dev) |
| `npm run db:deploy` | Aplicar migraciones (prod) |

## ⚠️ Antes de Hacer Deploy

1. ✅ `npm run db:sanity` - Debe pasar sin errores
2. ✅ `npm run db:status` - Verificar migraciones
3. ✅ `npm run build` - Verificar que compila

## 📚 Más Información

- [DB Migrations Playbook](DB_MIGRATIONS.md) - Guía completa de migraciones
- [README](../README.md) - Documentación general

