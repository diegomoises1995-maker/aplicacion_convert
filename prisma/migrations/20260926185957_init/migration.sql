-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'SUPERVISOR', 'VENDEDOR');

-- CreateEnum
CREATE TYPE "CanalVenta" AS ENUM ('CAMPO', 'REMOTO', 'MIXTO');

-- CreateEnum
CREATE TYPE "TipoCliente" AS ENUM ('TIENDA', 'REVENDEDOR', 'DISTRIBUIDOR', 'OTRO');

-- CreateEnum
CREATE TYPE "CategoriaCliente" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "EstadoCliente" AS ENUM ('PROSPECTO', 'NUEVO', 'ACTIVO', 'EN_RIESGO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "EtapaOportunidad" AS ENUM ('PROSPECTO', 'CONTACTADO', 'COTIZACION_ENVIADA', 'NEGOCIACION', 'GANADO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "TipoActividad" AS ENUM ('LLAMADA', 'WHATSAPP', 'VISITA', 'REUNION', 'EMAIL', 'TAREA');

-- CreateEnum
CREATE TYPE "ResultadoActividad" AS ENUM ('PENDIENTE', 'EXITOSA', 'SIN_RESPUESTA', 'REPROGRAMADA', 'NO_INTERESADO');

-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('CABALLERO', 'DAMA', 'NINO', 'UNISEX');

-- CreateEnum
CREATE TYPE "EstadoCotizacion" AS ENUM ('BORRADOR', 'PENDIENTE_APROBACION', 'ENVIADA', 'ACEPTADA', 'RECHAZADA', 'VENCIDA', 'CONVERTIDA');

-- CreateEnum
CREATE TYPE "EstadoAprobacion" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('PENDIENTE_PAGO', 'PAGO_VERIFICADO', 'EN_PREPARACION', 'ENVIADO', 'ENTREGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('TRANSFERENCIA', 'DEPOSITO', 'YAPE', 'PLIN', 'EFECTIVO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoMeta" AS ENUM ('SOLES', 'PARES', 'CLIENTES_NUEVOS', 'CLIENTES_REACTIVADOS');

-- CreateEnum
CREATE TYPE "PeriodoMeta" AS ENUM ('MENSUAL', 'TRIMESTRAL');

-- CreateEnum
CREATE TYPE "TipoReglaComision" AS ENUM ('PORCENTAJE_VENTA_COBRADA', 'BONO_CUMPLIMIENTO_META', 'BONO_CLIENTE_NUEVO', 'BONO_CLIENTE_REACTIVADO');

-- CreateEnum
CREATE TYPE "EstadoLiquidacion" AS ENUM ('BORRADOR', 'APROBADA', 'PAGADA');

-- CreateTable
CREATE TABLE "Zona" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "dni" TEXT,
    "rol" "Rol" NOT NULL DEFAULT 'VENDEDOR',
    "canal" "CanalVenta" NOT NULL DEFAULT 'MIXTO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaIngreso" TIMESTAMP(3),
    "ultimoAcceso" TIMESTAMP(3),
    "zonaId" TEXT,
    "supervisorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracion" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "igvPorcentaje" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "pedidoMinimoSeries" INTEGER NOT NULL DEFAULT 2,
    "pedidoMinimoMonto" DECIMAL(12,2) NOT NULL DEFAULT 1000,
    "pedidoMinimoCualquiera" BOOLEAN NOT NULL DEFAULT true,
    "descuentoMaxVendedor" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "descuentoMaxSupervisor" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "diasClienteNuevo" INTEGER NOT NULL DEFAULT 90,
    "factorEnRiesgo" DECIMAL(4,2) NOT NULL DEFAULT 1.5,
    "diasClienteInactivo" INTEGER NOT NULL DEFAULT 180,
    "frecuenciaDefectoDias" INTEGER NOT NULL DEFAULT 30,
    "semaforoVerde" INTEGER NOT NULL DEFAULT 90,
    "semaforoAmarillo" INTEGER NOT NULL DEFAULT 70,
    "umbralCategoriaA" DECIMAL(12,2) NOT NULL DEFAULT 30000,
    "umbralCategoriaB" DECIMAL(12,2) NOT NULL DEFAULT 10000,
    "reservarStockAlPagar" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "ruc" CHAR(11) NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "nombreComercial" TEXT,
    "tipo" "TipoCliente" NOT NULL DEFAULT 'TIENDA',
    "categoria" "CategoriaCliente" NOT NULL DEFAULT 'C',
    "categoriaManual" BOOLEAN NOT NULL DEFAULT false,
    "estado" "EstadoCliente" NOT NULL DEFAULT 'PROSPECTO',
    "contactoNombre" TEXT,
    "telefono" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "distrito" TEXT,
    "ciudad" TEXT NOT NULL,
    "departamento" TEXT,
    "notas" TEXT,
    "zonaId" TEXT,
    "vendedorId" TEXT,
    "listaPrecioId" TEXT,
    "primeraCompra" TIMESTAMP(3),
    "ultimaCompra" TIMESTAMP(3),
    "frecuenciaDias" INTEGER,
    "ticketPromedio" DECIMAL(12,2),
    "totalComprado12m" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "numeroPedidos" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Etiqueta" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',

    CONSTRAINT "Etiqueta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClienteEtiqueta" (
    "clienteId" TEXT NOT NULL,
    "etiquetaId" TEXT NOT NULL,

    CONSTRAINT "ClienteEtiqueta_pkey" PRIMARY KEY ("clienteId","etiquetaId")
);

-- CreateTable
CREATE TABLE "ClienteAsignacionHistorial" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "desdeVendedorId" TEXT,
    "haciaVendedorId" TEXT,
    "asignadoPorId" TEXT NOT NULL,
    "motivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClienteAsignacionHistorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Oportunidad" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "etapa" "EtapaOportunidad" NOT NULL DEFAULT 'PROSPECTO',
    "valorEstimado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paresEstimados" INTEGER,
    "fechaCierreProbable" TIMESTAMP(3),
    "fechaCierreReal" TIMESTAMP(3),
    "motivoPerdida" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "notas" TEXT,
    "clienteId" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Oportunidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Actividad" (
    "id" TEXT NOT NULL,
    "tipo" "TipoActividad" NOT NULL,
    "asunto" TEXT NOT NULL,
    "descripcion" TEXT,
    "resultado" "ResultadoActividad" NOT NULL DEFAULT 'PENDIENTE',
    "fechaProgramada" TIMESTAMP(3) NOT NULL,
    "fechaRealizada" TIMESTAMP(3),
    "completada" BOOLEAN NOT NULL DEFAULT false,
    "proximaAccion" TEXT,
    "proximaAccionFecha" TIMESTAMP(3),
    "clienteId" TEXT,
    "oportunidadId" TEXT,
    "vendedorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Actividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantillaWhatsApp" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaWhatsApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurvaTallas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "genero" "Genero" NOT NULL DEFAULT 'CABALLERO',
    "distribucion" JSONB NOT NULL,
    "paresPorSerie" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurvaTallas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modelo" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "genero" "Genero" NOT NULL DEFAULT 'CABALLERO',
    "material" TEXT NOT NULL DEFAULT 'Cuero',
    "fotos" TEXT[],
    "precioBase" DECIMAL(12,2) NOT NULL,
    "costo" DECIMAL(12,2),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "curvaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Modelo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Color" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "hex" TEXT,

    CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variante" (
    "id" TEXT NOT NULL,
    "modeloId" TEXT NOT NULL,
    "colorId" TEXT NOT NULL,
    "talla" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stockReservado" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Variante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListaPrecio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipoCliente" "TipoCliente",
    "ajustePorcentaje" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListaPrecio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrecioLista" (
    "id" TEXT NOT NULL,
    "listaId" TEXT NOT NULL,
    "modeloId" TEXT NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "PrecioLista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalaPrecio" (
    "id" TEXT NOT NULL,
    "listaId" TEXT,
    "desdeSeries" INTEGER NOT NULL,
    "descuentoPorcentaje" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "EscalaPrecio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cotizacion" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "estado" "EstadoCotizacion" NOT NULL DEFAULT 'BORRADOR',
    "clienteId" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "oportunidadId" TEXT,
    "validaHasta" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "descuentoVolumen" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "descuentoPorcentaje" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "descuentoMonto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "baseImponible" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "igv" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemCotizacion" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "modeloId" TEXT NOT NULL,
    "colorId" TEXT NOT NULL,
    "series" INTEGER NOT NULL,
    "pares" INTEGER NOT NULL,
    "precioPar" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ItemCotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AprobacionDescuento" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "solicitanteId" TEXT NOT NULL,
    "aprobadorId" TEXT,
    "descuentoSolicitado" DECIMAL(5,2) NOT NULL,
    "estado" "EstadoAprobacion" NOT NULL DEFAULT 'PENDIENTE',
    "comentario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resueltaAt" TIMESTAMP(3),

    CONSTRAINT "AprobacionDescuento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'PENDIENTE_PAGO',
    "clienteId" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "cotizacionId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "descuentoMonto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "baseImponible" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "igv" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPares" INTEGER NOT NULL DEFAULT 0,
    "totalSeries" INTEGER NOT NULL DEFAULT 0,
    "agenciaEnvio" TEXT,
    "numeroGuia" TEXT,
    "direccionEnvio" TEXT,
    "fechaEnvio" TIMESTAMP(3),
    "fechaEntrega" TIMESTAMP(3),
    "comprobante" TEXT,
    "esPrimerPedido" BOOLEAN NOT NULL DEFAULT false,
    "esReactivacion" BOOLEAN NOT NULL DEFAULT false,
    "motivoCancelacion" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "modeloId" TEXT NOT NULL,
    "colorId" TEXT NOT NULL,
    "series" INTEGER NOT NULL,
    "pares" INTEGER NOT NULL,
    "precioPar" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ItemPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoEstadoHistorial" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "estadoAnterior" "EstadoPedido",
    "estadoNuevo" "EstadoPedido" NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "comentario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PedidoEstadoHistorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "metodo" "MetodoPago" NOT NULL DEFAULT 'TRANSFERENCIA',
    "referencia" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "verificadoPorId" TEXT,
    "verificadoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meta" (
    "id" TEXT NOT NULL,
    "tipo" "TipoMeta" NOT NULL,
    "periodo" "PeriodoMeta" NOT NULL DEFAULT 'MENSUAL',
    "anio" INTEGER NOT NULL,
    "mes" INTEGER,
    "trimestre" INTEGER,
    "valor" DECIMAL(12,2) NOT NULL,
    "vendedorId" TEXT,
    "equipoSupervisorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReglaComision" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoReglaComision" NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "umbralCumplimiento" DECIMAL(5,2),
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "vigenteDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigenteHasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReglaComision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiquidacionComision" (
    "id" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "ventaCobrada" DECIMAL(12,2) NOT NULL,
    "comisionVenta" DECIMAL(12,2) NOT NULL,
    "bonos" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "detalle" JSONB NOT NULL,
    "estado" "EstadoLiquidacion" NOT NULL DEFAULT 'BORRADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiquidacionComision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertaRecompra" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "vendedorId" TEXT,
    "diasSinCompra" INTEGER NOT NULL,
    "frecuenciaDias" INTEGER NOT NULL,
    "atendida" BOOLEAN NOT NULL DEFAULT false,
    "atendidaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertaRecompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT,
    "antes" JSONB,
    "despues" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Zona_nombre_key" ON "Zona"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_dni_key" ON "User"("dni");

-- CreateIndex
CREATE INDEX "User_rol_activo_idx" ON "User"("rol", "activo");

-- CreateIndex
CREATE INDEX "User_supervisorId_idx" ON "User"("supervisorId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_ruc_key" ON "Cliente"("ruc");

-- CreateIndex
CREATE INDEX "Cliente_vendedorId_idx" ON "Cliente"("vendedorId");

-- CreateIndex
CREATE INDEX "Cliente_estado_idx" ON "Cliente"("estado");

-- CreateIndex
CREATE INDEX "Cliente_zonaId_idx" ON "Cliente"("zonaId");

-- CreateIndex
CREATE UNIQUE INDEX "Etiqueta_nombre_key" ON "Etiqueta"("nombre");

-- CreateIndex
CREATE INDEX "ClienteAsignacionHistorial_clienteId_idx" ON "ClienteAsignacionHistorial"("clienteId");

-- CreateIndex
CREATE INDEX "Oportunidad_vendedorId_etapa_idx" ON "Oportunidad"("vendedorId", "etapa");

-- CreateIndex
CREATE INDEX "Actividad_vendedorId_completada_fechaProgramada_idx" ON "Actividad"("vendedorId", "completada", "fechaProgramada");

-- CreateIndex
CREATE INDEX "Actividad_clienteId_idx" ON "Actividad"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "CurvaTallas_nombre_key" ON "CurvaTallas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Modelo_sku_key" ON "Modelo"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Color_nombre_key" ON "Color"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Variante_modeloId_colorId_talla_key" ON "Variante"("modeloId", "colorId", "talla");

-- CreateIndex
CREATE UNIQUE INDEX "ListaPrecio_nombre_key" ON "ListaPrecio"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "PrecioLista_listaId_modeloId_key" ON "PrecioLista"("listaId", "modeloId");

-- CreateIndex
CREATE UNIQUE INDEX "EscalaPrecio_listaId_desdeSeries_key" ON "EscalaPrecio"("listaId", "desdeSeries");

-- CreateIndex
CREATE UNIQUE INDEX "Cotizacion_numero_key" ON "Cotizacion"("numero");

-- CreateIndex
CREATE INDEX "Cotizacion_vendedorId_estado_idx" ON "Cotizacion"("vendedorId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_numero_key" ON "Pedido"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_cotizacionId_key" ON "Pedido"("cotizacionId");

-- CreateIndex
CREATE INDEX "Pedido_vendedorId_fecha_idx" ON "Pedido"("vendedorId", "fecha");

-- CreateIndex
CREATE INDEX "Pedido_clienteId_fecha_idx" ON "Pedido"("clienteId", "fecha");

-- CreateIndex
CREATE INDEX "Pedido_estado_idx" ON "Pedido"("estado");

-- CreateIndex
CREATE INDEX "ItemPedido_modeloId_idx" ON "ItemPedido"("modeloId");

-- CreateIndex
CREATE INDEX "Pago_fecha_idx" ON "Pago"("fecha");

-- CreateIndex
CREATE INDEX "Meta_anio_mes_idx" ON "Meta"("anio", "mes");

-- CreateIndex
CREATE INDEX "Meta_vendedorId_idx" ON "Meta"("vendedorId");

-- CreateIndex
CREATE UNIQUE INDEX "LiquidacionComision_vendedorId_anio_mes_key" ON "LiquidacionComision"("vendedorId", "anio", "mes");

-- CreateIndex
CREATE INDEX "AlertaRecompra_vendedorId_atendida_idx" ON "AlertaRecompra"("vendedorId", "atendida");

-- CreateIndex
CREATE INDEX "AuditLog_entidad_entidadId_idx" ON "AuditLog"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "AuditLog_usuarioId_idx" ON "AuditLog"("usuarioId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "Zona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "Zona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_listaPrecioId_fkey" FOREIGN KEY ("listaPrecioId") REFERENCES "ListaPrecio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClienteEtiqueta" ADD CONSTRAINT "ClienteEtiqueta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClienteEtiqueta" ADD CONSTRAINT "ClienteEtiqueta_etiquetaId_fkey" FOREIGN KEY ("etiquetaId") REFERENCES "Etiqueta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClienteAsignacionHistorial" ADD CONSTRAINT "ClienteAsignacionHistorial_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClienteAsignacionHistorial" ADD CONSTRAINT "ClienteAsignacionHistorial_desdeVendedorId_fkey" FOREIGN KEY ("desdeVendedorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClienteAsignacionHistorial" ADD CONSTRAINT "ClienteAsignacionHistorial_haciaVendedorId_fkey" FOREIGN KEY ("haciaVendedorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClienteAsignacionHistorial" ADD CONSTRAINT "ClienteAsignacionHistorial_asignadoPorId_fkey" FOREIGN KEY ("asignadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oportunidad" ADD CONSTRAINT "Oportunidad_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oportunidad" ADD CONSTRAINT "Oportunidad_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actividad" ADD CONSTRAINT "Actividad_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actividad" ADD CONSTRAINT "Actividad_oportunidadId_fkey" FOREIGN KEY ("oportunidadId") REFERENCES "Oportunidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actividad" ADD CONSTRAINT "Actividad_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Modelo" ADD CONSTRAINT "Modelo_curvaId_fkey" FOREIGN KEY ("curvaId") REFERENCES "CurvaTallas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variante" ADD CONSTRAINT "Variante_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES "Modelo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variante" ADD CONSTRAINT "Variante_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecioLista" ADD CONSTRAINT "PrecioLista_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaPrecio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecioLista" ADD CONSTRAINT "PrecioLista_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES "Modelo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalaPrecio" ADD CONSTRAINT "EscalaPrecio_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaPrecio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_oportunidadId_fkey" FOREIGN KEY ("oportunidadId") REFERENCES "Oportunidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCotizacion" ADD CONSTRAINT "ItemCotizacion_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCotizacion" ADD CONSTRAINT "ItemCotizacion_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES "Modelo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCotizacion" ADD CONSTRAINT "ItemCotizacion_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AprobacionDescuento" ADD CONSTRAINT "AprobacionDescuento_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AprobacionDescuento" ADD CONSTRAINT "AprobacionDescuento_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AprobacionDescuento" ADD CONSTRAINT "AprobacionDescuento_aprobadorId_fkey" FOREIGN KEY ("aprobadorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES "Modelo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEstadoHistorial" ADD CONSTRAINT "PedidoEstadoHistorial_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEstadoHistorial" ADD CONSTRAINT "PedidoEstadoHistorial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_verificadoPorId_fkey" FOREIGN KEY ("verificadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meta" ADD CONSTRAINT "Meta_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidacionComision" ADD CONSTRAINT "LiquidacionComision_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertaRecompra" ADD CONSTRAINT "AlertaRecompra_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertaRecompra" ADD CONSTRAINT "AlertaRecompra_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
