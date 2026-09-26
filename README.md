# Convert Ventas

Aplicación web para gestionar al equipo de ventas de **Convert**, empresa peruana que vende zapatillas de cuero al por mayor, por series o curvas de tallas, a tiendas, revendedores y distribuidores de Lima y provincias.

Está pensada primero para el celular (se puede instalar como app), escrita en español y trabaja en soles con IGV del 18 %.

## Módulos

| Módulo | Qué incluye |
|---|---|
| **Equipo** | Alta y edición de vendedores y supervisores (zona, canal, supervisor, estado), restablecimiento de contraseña, reasignación masiva de cartera con historial |
| **Clientes (CRM)** | Ficha con RUC validado (dígito verificador), contacto, WhatsApp, ciudad, zona, vendedor, categoría A/B/C, estado (nuevo/activo/en riesgo/inactivo), historial de compras, ticket promedio y frecuencia; importación CSV/Excel con vista previa; exportación a Excel |
| **Pipeline** | Kanban Prospecto → Contactado → Cotización enviada → Negociación → Ganado / Perdido (con motivo); valor estimado, fecha probable de cierre, pronóstico ponderado y conversión |
| **Agenda y actividades** | Llamadas, WhatsApp, visitas, reuniones y tareas con resultado y próxima acción; agenda diaria con vencidos; botón de WhatsApp con plantillas que registra el contacto |
| **Catálogo** | Modelos con SKU, fotos, colores, curva de tallas y stock por talla; series disponibles por color |
| **Precios** | Listas por tipo de cliente (ajuste % y precios por modelo) y escalas de descuento por volumen |
| **Cotizaciones** | Cotizador móvil con totales en vivo; descuentos con aprobación del supervisor o del gerente según el límite; PDF; compartir por WhatsApp o correo; conversión a pedido |
| **Pedidos** | Pendiente de pago → Pago verificado → En preparación → Enviado (agencia y guía) → Entregado / Cancelado; pagos con verificación; stock descontado al verificar el pago y devuelto al cancelar |
| **Metas** | Mensuales y trimestrales por vendedor, equipo y empresa (soles, pares, clientes nuevos y reactivados); semáforo contra el avance esperado; ranking; comparativos con el período anterior y el mismo período del año pasado |
| **Comisiones** | Reglas configurables: % sobre lo cobrado, bonos escalonados por meta, bono por cliente nuevo o reactivado; proyección en vivo y liquidación mensual (borrador → aprobada → pagada) |
| **Dashboards** | Gerencia/supervisor: ventas, cumplimiento, embudo, clientes en riesgo, modelos más vendidos y ventas por zona. Vendedor: su meta, cuánto le falta, comisión proyectada, seguimientos del día y clientes por recomprar |
| **Alertas de recompra** | Proceso diario: detecta clientes que superaron su frecuencia habitual de compra, crea la alerta y una tarea en la agenda del vendedor |
| **Reportes** | Ventas por vendedor, cliente, modelo/color y zona; actividad comercial y motivos de pérdida; todo exportable a Excel |
| **Auditoría** | Registro de cambios importantes: precios, stock, descuentos y aprobaciones, reasignaciones, pagos, estados de pedido, metas, comisiones, usuarios y configuración |

## Roles

| | Gerente / Administrador | Supervisor | Vendedor |
|---|---|---|---|
| Ve | Todo | Su equipo, él mismo y los clientes sin asignar | Solo su cartera, sus oportunidades, pedidos, metas y comisiones |
| Gestiona usuarios, zonas, precios, catálogo, metas, reglas y configuración | ✔ | | |
| Reasigna e importa clientes | ✔ | Dentro de su equipo | |
| Aprueba descuentos | Sin límite | Hasta su límite | |
| Verifica pagos, despacha y cancela pedidos pagados | ✔ | | |
| Reportes de gerencia | ✔ | De su equipo | |

En el ranking de metas, el vendedor ve el porcentaje de cumplimiento de sus compañeros, pero no sus montos.

## Stack

- **Next.js 15** (App Router, Server Components, Server Actions) + **TypeScript**
- **Tailwind CSS v4**, componentes propios e íconos `lucide-react`
- **PostgreSQL** con **Prisma 6**
- **Auth.js v5**: credenciales con bcrypt, JWT de 12 h y límite de intentos
- **Zod** para validar todo en el servidor
- `@react-pdf/renderer` (PDF), `exceljs` (Excel), `papaparse` (CSV), `recharts` (gráficos), `@dnd-kit/core` (kanban)
- **Vitest** para las reglas de negocio

## Instalación local

Requisitos: Node.js 20 o superior y PostgreSQL 14 o superior.

```bash
npm install
cp .env.example .env          # ajusta DATABASE_URL, DIRECT_URL, AUTH_SECRET y CRON_SECRET

# (opcional) Postgres con Docker
docker run -d --name convert-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=convert_ventas -p 5432:5432 postgres:16

npm run db:migrate            # crea las tablas
npm run db:seed               # datos de prueba (tarda ~1 min)
npm run dev                   # http://localhost:3000
```

### Datos de prueba

El seed se puede ejecutar varias veces sin duplicar datos. Carga:

- **Usuarios:** 1 gerente, 1 supervisor y 3 vendedores (campo, mixto y WhatsApp).
- **Clientes:** 30, de Lima y provincias, en todos los estados.
- **Catálogo:** 15 modelos con fotos ilustrativas, 3 curvas de tallas, colores y stock.
- **Precios:** listas para tiendas, revendedores (−5 %) y distribuidores (−10 %), más escalas por volumen.
- **Pedidos:** 24 meses de historial (unos 430), con pagos y guías.
- **Comercial:** oportunidades, actividades, cotizaciones (algunas pendientes de aprobación) y plantillas de WhatsApp.
- **Metas y comisiones:** metas de 13 meses, reglas de comisión y liquidaciones históricas.
- **Alertas de recompra:** las genera el mismo proceso diario al terminar el seed.

Todos los usuarios usan la contraseña **`Convert2026`**, que se cambia con `SEED_PASSWORD`:

| Rol | Correo |
|---|---|
| Gerente / Administrador | `gerente@convert.pe` |
| Supervisor | `supervisor@convert.pe` |
| Vendedor de campo (Lima Norte y Centro) | `carlos@convert.pe` |
| Vendedora mixta (Lima Sur) | `lucia@convert.pe` |
| Vendedor por WhatsApp/teléfono (provincias) | `jorge@convert.pe` |

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Desarrollo |
| `npm run build` / `npm start` | Compilación y servidor de producción |
| `npm test` | Pruebas unitarias |
| `npm run typecheck` / `npm run lint` | Tipos y ESLint |
| `npm run db:migrate` | Crea o aplica migraciones (desarrollo) |
| `npm run db:deploy` | Aplica migraciones (producción) |
| `npm run db:seed` | Datos de prueba |
| `npm run db:reset` | **Borra** la base y la recrea con el seed |

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Conexión de la app. En Supabase, el *Transaction pooler* (puerto 6543) con `?pgbouncer=true&connection_limit=1`. |
| `DIRECT_URL` | Sí | Conexión directa para migraciones. En Supabase, el *Session pooler* o la conexión directa (puerto 5432). En local, igual a `DATABASE_URL`. |
| `AUTH_SECRET` | Sí | Secreto de las sesiones (`npx auth secret`). |
| `AUTH_TRUST_HOST` | Sí en Vercel | `true` |
| `CRON_SECRET` | Sí en producción | Protege `/api/cron/diario`; Vercel Cron lo envía automáticamente. |
| `SEED_PASSWORD` | No | Contraseña de los usuarios del seed. |

## Despliegue en Vercel con Supabase

1. **Supabase:** crea un proyecto en la región `South America (São Paulo)`, la más cercana a Lima, y copia las dos cadenas de conexión desde *Project Settings → Database*.
2. **Vercel:** importa el repositorio y define `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true` y `CRON_SECRET`.
3. **Compilación y migraciones:** Vercel ejecuta `npm run vercel-build` (`prisma migrate deploy && next build`), así que las migraciones se aplican en cada despliegue.
4. **Proceso diario:** `vercel.json` programa `/api/cron/diario` a las **6:00 de Lima** (11:00 UTC). Recalcula estados y categorías de clientes, genera alertas de recompra y vence cotizaciones. También se puede lanzar desde *Configuración → Proceso diario*.
5. **Primera carga:** para cargar datos de prueba, desde tu máquina y con las variables de producción, ejecuta:

   ```bash
   DATABASE_URL="..." DIRECT_URL="..." SEED_PASSWORD="UnaClaveSegura123" npm run db:seed
   ```

   Si prefieres empezar sin datos de prueba, crea solo al gerente con el seed y luego importa tus clientes desde *Clientes → Importar*. En ambos casos, cambia la contraseña del gerente en **Mi perfil**.

## Importar tus clientes

En *Clientes → Importar* (gerente y supervisores) puedes subir un **CSV** (separado por coma o punto y coma) o un **Excel .xlsx**. Hay una plantilla descargable.

- **Obligatorias:** `ruc`, `razon_social`.
- **Opcionales:** `nombre_comercial`, `contacto`, `telefono`, `whatsapp`, `email`, `direccion`, `distrito`, `ciudad`, `departamento`, `tipo` (tienda / revendedor / distribuidor / otro), `categoria` (A/B/C), `vendedor` (correo del vendedor), `zona`, `notas`.
- Se aceptan encabezados con tildes, mayúsculas o sinónimos (p. ej. «Razón Social», «Celular», «Correo»).
- **Vista previa antes de guardar:** muestra los errores por fila, los RUC repetidos y, si el RUC ya existe, si se omitirá o se actualizará.

## Reglas de negocio (configurables en *Configuración*)

| Parámetro | Valor por defecto |
|---|---|
| IGV | 18 % (precios guardados sin IGV) |
| Pedido mínimo | 2 series **o** S/ 1,000 sin IGV |
| Descuento máximo del vendedor / supervisor | 5 % / 10 % (encima de eso, aprueba el gerente) |
| Cliente nuevo | primera compra hace ≤ 90 días |
| Cliente en riesgo | más de 1.5 × su frecuencia habitual sin comprar |
| Cliente inactivo | más de 180 días sin comprar |
| Categoría A / B | desde S/ 30,000 / S/ 10,000 comprados en 12 meses (el seed usa 60,000 / 25,000) |
| Semáforo de metas | verde ≥ 90 %, amarillo ≥ 70 % del avance esperado a la fecha |

Otras reglas:

- **Venta efectiva:** pedido con pago verificado o en un estado posterior. Es lo que cuenta para metas, dashboards y métricas del cliente.
- **Comisión:** se calcula sobre lo **cobrado** (pagos verificados del mes, sin IGV).
- **Bono por meta:** se mide sobre la venta efectiva del mes. Si hay varios tramos, se paga solo el más alto alcanzado.
- **Alerta de recompra:** una por ciclo de compra. Si el vendedor la marca como atendida, no se repite hasta que el cliente vuelva a comprar.

## Arquitectura y seguridad

```
prisma/            schema.prisma (modelo completo), migraciones, seed.ts
public/catalogo/   ilustraciones de los modelos de prueba
src/
  auth.ts, auth.config.ts, middleware.ts   autenticación y bloqueo de rutas por rol
  lib/        reglas puras y probadas: permisos, alcance, RUC, precios, stock, pedidos,
              metas, comisiones, clientes, importación, fechas (hora de Lima), formato
  server/     capa de acceso a datos (sesion.ts), consultas, auditoría, PDF, Excel,
              tarea diaria y Server Actions (acciones/*)
  app/(app)/  páginas autenticadas; app/api/ PDF, exportaciones y cron
tests/        pruebas de reglas de negocio (Vitest)
```

- **Defensa en capas.** El middleware bloquea las rutas no permitidas. Además, cada página, acción de servidor y endpoint vuelve a validar el usuario y el permiso.
- **Alcance de datos centralizado.** Todas las consultas usan `getAlcance()` con `filtroVendedor()` o `filtroClientes()`: el vendedor solo ve lo suyo y el supervisor, su equipo. Si alguien intenta ver un recurso ajeno, recibe una respuesta 404.
- **Sesión revalidada contra la base en cada request.** Si un usuario es desactivado, pierde el acceso de inmediato.
- **Nada del navegador se da por válido.** Precios, descuentos, stock y totales se recalculan en el servidor; todas las entradas se validan con Zod.
- **Auditoría** dentro de la misma transacción que el cambio.
- **Stock sin carreras.** El descuento de stock es condicional, así que nunca queda negativo aunque dos pedidos se confirmen a la vez.
- **Protecciones adicionales:**
  - bcrypt con comparación en tiempo constante;
  - límite de 5 intentos de ingreso por correo cada 15 minutos (en memoria de la instancia; con varias instancias conviene Redis/Upstash);
  - solo redirecciones internas tras el login;
  - cabeceras de seguridad (`X-Frame-Options`, `nosniff`, HSTS, etc.);
  - el cron está protegido con `CRON_SECRET`.

## Limitaciones conocidas y siguientes pasos sugeridos

- **Facturación electrónica SUNAT:** queda fuera; en el pedido se registra el número de comprobante emitido en tu sistema de facturación.
- **Fotos del catálogo:** se cargan por URL. Para subirlas desde la app se puede integrar Supabase Storage o Vercel Blob.
- **WhatsApp:** usa enlaces `wa.me` con el mensaje ya escrito. El envío automático requeriría la API de WhatsApp Business.
- **Uso sin conexión:** la app es instalable (PWA), pero todavía no funciona sin conexión.
