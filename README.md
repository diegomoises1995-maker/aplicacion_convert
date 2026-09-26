# Convert Ventas

Aplicación web para gestionar al equipo de ventas de **Convert**, empresa peruana que vende zapatillas de cuero al por mayor. Pensada primero para celular y escrita íntegramente en español.

> **Estado:** ver el [plan por fases](#plan-por-fases).

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Server Actions) + TypeScript |
| Estilos | Tailwind CSS v4, componentes propios al estilo shadcn/ui, íconos `lucide-react` |
| Base de datos | PostgreSQL (Supabase, Neon o local) con Prisma ORM 6 |
| Autenticación | Auth.js v5 (credenciales email + contraseña con bcrypt, sesión JWT de 12 h) |
| Validación | Zod (siempre en servidor) |
| Pruebas | Vitest |

## Requisitos

- Node.js 20 o superior (probado con Node 22)
- PostgreSQL 14 o superior (local, Docker o Supabase)

## Instalación local

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env        # y ajusta DATABASE_URL / DIRECT_URL / AUTH_SECRET

# 3. (Opcional) Postgres con Docker
docker run -d --name convert-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=convert_ventas -p 5432:5432 postgres:16

# 4. Crear tablas y cargar datos de prueba
npm run db:migrate          # aplica las migraciones
npm run db:seed             # usuarios, zonas y configuración de prueba

# 5. Levantar
npm run dev                 # http://localhost:3000
```

### Usuarios de prueba

Todos usan la contraseña **`Convert2026`**, que puedes cambiar con `SEED_PASSWORD`.

| Rol | Correo |
|---|---|
| Gerente / Administrador | `gerente@convert.pe` |
| Supervisor | `supervisor@convert.pe` |
| Vendedor (campo, Lima Norte) | `carlos@convert.pe` |
| Vendedor (mixto, Lima Sur) | `lucia@convert.pe` |
| Vendedor (WhatsApp/teléfono, Norte) | `jorge@convert.pe` |

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Compilación y servidor de producción |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run typecheck` | Verificación de tipos |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Crea o aplica migraciones en desarrollo |
| `npm run db:deploy` | Aplica migraciones en producción |
| `npm run db:seed` | Carga los datos de prueba (se puede repetir sin duplicar) |
| `npm run db:reset` | **Borra** la base y la recrea con el seed |

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Conexión que usa la app. En Supabase, el *Transaction pooler* (puerto 6543) con `?pgbouncer=true&connection_limit=1`. |
| `DIRECT_URL` | Sí | Conexión directa que usan las migraciones. En Supabase, el *Session pooler* o la conexión directa (puerto 5432). En local, igual a `DATABASE_URL`. |
| `AUTH_SECRET` | Sí | Secreto para firmar las sesiones (`npx auth secret`). |
| `AUTH_TRUST_HOST` | Sí en Vercel | `true` |
| `SEED_PASSWORD` | No | Contraseña de los usuarios del seed. |

## Despliegue en Vercel con Supabase

1. **Supabase:** crea un proyecto (región `South America (São Paulo)`, la más cercana a Lima). En *Project Settings → Database* copia las dos cadenas de conexión.
2. **Vercel:** importa el repositorio y define `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` y `AUTH_TRUST_HOST=true` en *Settings → Environment Variables*.
3. Vercel ejecuta automáticamente `npm run vercel-build` (`prisma migrate deploy && next build`), así que las migraciones se aplican en cada despliegue.
4. **Seed (solo la primera vez, o en un entorno de pruebas):** desde tu máquina, con las variables de producción:
   ```bash
   DATABASE_URL="..." DIRECT_URL="..." SEED_PASSWORD="UnaClaveSegura123" npm run db:seed
   ```
   Luego entra como `gerente@convert.pe` y cambia la contraseña en **Mi perfil**.

## Arquitectura y seguridad

```
prisma/
  schema.prisma        Modelo de datos completo (todas las fases)
  seed.ts              Datos de prueba
src/
  auth.config.ts       Config de Auth.js compatible con el middleware (edge)
  auth.ts              Proveedor de credenciales (Prisma + bcrypt)
  middleware.ts        Exige sesión y bloquea rutas según el rol
  lib/
    permisos.ts        Matriz rol → permisos y rutas protegidas (módulo puro)
    alcance.ts         Qué vendedores/datos ve cada usuario (módulo puro)
    navegacion.ts      Menú según el rol
  server/
    sesion.ts          Capa de acceso: requireUsuario / requirePermiso / getAlcance
    auditoria.ts       registrarAuditoria(): quién, qué, antes/después, IP
    acciones/          Server Actions (siempre validan sesión, permiso y datos)
  app/
    login/             Pantalla de ingreso
    (app)/             Páginas autenticadas (barra lateral en escritorio, barra inferior en celular)
tests/                 Pruebas de permisos y alcance
```

**Principios de seguridad**

- **Defensa en capas.** El middleware bloquea las rutas no permitidas antes de renderizar. Cada página y cada acción de servidor vuelve a validar el usuario y el permiso con `requireUsuario`/`requirePermiso`.
- **Alcance de datos centralizado.** Toda consulta de clientes, oportunidades, pedidos, etc. usa `getAlcance()` junto con `filtroVendedor()`:
  - el vendedor solo ve sus registros;
  - el supervisor ve su equipo;
  - el administrador ve todo.
- **Sesión revalidada contra la base de datos en cada request.** Si un usuario es desactivado o cambia de rol, pierde el acceso de inmediato aunque su JWT siga vigente.
- **Nada de acceso a la base de datos desde el navegador.** Solo el servidor habla con PostgreSQL.
- **Auditoría.** Los cambios sensibles se registran en `AuditLog` dentro de la misma transacción: contraseñas, y en próximas fases precios, descuentos y reasignaciones.
- **Contraseñas** con bcrypt (costo 10). El login compara en tiempo constante aunque el correo no exista, y solo acepta redirecciones internas tras ingresar.

**Convenciones de datos**

- Montos en soles (`Decimal(12,2)`) y **sin IGV**. El IGV (18 %, configurable) se calcula y guarda aparte en cotizaciones y pedidos.
- Fechas en UTC, mostradas en `America/Lima`.
- Los parámetros de negocio están en la tabla `Configuracion` y serán editables desde el panel de administración:
  - pedido mínimo;
  - límites de descuento por rol;
  - umbrales A/B/C;
  - reglas de estado de clientes;
  - semáforo de metas.

## Plan por fases

- [x] **Fase 1:** base de datos, autenticación y roles
- [x] **Fase 2:** gestión del equipo y cartera de clientes (con importación CSV/Excel)
- [x] **Fase 3:** actividades, seguimiento y pipeline
- [x] **Fase 4:** catálogo, cotizaciones y pedidos
- [x] **Fase 5:** metas, comisiones y dashboards
- [ ] **Fase 6:** alertas de recompra, reportes y ajustes finales
