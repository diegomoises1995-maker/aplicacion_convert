// Datos de prueba. Idempotente: se puede ejecutar varias veces.
// Cada fase amplía este seed (clientes, catálogo, pedidos…).
import { PrismaClient, type Rol, type CanalVenta } from "@prisma/client";
import bcrypt from "bcryptjs";
import { completarRuc } from "../src/lib/ruc";
import { calcularTotales } from "../src/lib/precios";
import { calcularCategoria, calcularEstadoCliente, calcularFrecuenciaDias } from "../src/lib/clientes";
import { calcularComision, sinIgv } from "../src/lib/comisiones";
import { partesLima, rangoMes, sumarMeses } from "../src/lib/fechas";

const db = new PrismaClient();
const PASSWORD_DEMO = process.env.SEED_PASSWORD ?? "Convert2026";

async function main() {
  // Umbrales A/B/C acordes al volumen de los datos de prueba
  await db.configuracion.upsert({ where: { id: 1 }, update: {}, create: { id: 1, umbralCategoriaA: 60000, umbralCategoriaB: 25000 } });

  const zonas = ["Lima Centro", "Lima Norte", "Lima Sur", "Norte", "Sur", "Centro", "Oriente"];
  for (const nombre of zonas) {
    await db.zona.upsert({ where: { nombre }, update: {}, create: { nombre } });
  }
  const zona = async (nombre: string) => (await db.zona.findUniqueOrThrow({ where: { nombre } })).id;

  const passwordHash = await bcrypt.hash(PASSWORD_DEMO, 10);
  const usuario = (
    email: string,
    nombre: string,
    rol: Rol,
    extra: { zonaId?: string; supervisorId?: string; canal?: CanalVenta; telefono?: string } = {},
  ) =>
    db.user.upsert({
      where: { email },
      update: {},
      create: { email, nombre, rol, passwordHash, fechaIngreso: new Date("2024-01-15"), ...extra },
    });

  await usuario("gerente@convert.pe", "Gerencia Convert", "ADMIN", { telefono: "999111222" });
  const supervisor = await usuario("supervisor@convert.pe", "Rosa Quispe", "SUPERVISOR", {
    zonaId: await zona("Lima Centro"),
    telefono: "999222333",
  });
  await usuario("carlos@convert.pe", "Carlos Huamán", "VENDEDOR", {
    zonaId: await zona("Lima Norte"),
    supervisorId: supervisor.id,
    canal: "CAMPO",
    telefono: "987654321",
  });
  await usuario("lucia@convert.pe", "Lucía Torres", "VENDEDOR", {
    zonaId: await zona("Lima Sur"),
    supervisorId: supervisor.id,
    canal: "MIXTO",
    telefono: "987654322",
  });
  await usuario("jorge@convert.pe", "Jorge Mendoza", "VENDEDOR", {
    zonaId: await zona("Norte"),
    supervisorId: supervisor.id,
    canal: "REMOTO",
    telefono: "987654323",
  });

  await seedClientes();
  await seedPipeline();
  await seedCatalogo();
  await seedPrecios();
  await seedPedidos();
  await seedCotizaciones();
  await recalcularClientes();
  await seedMetasYComisiones();

  const plantillas = [
    {
      nombre: "Saludo / seguimiento",
      mensaje: "Hola {contacto}, le saluda {vendedor} de Convert. ¿Cómo le fue con los últimos modelos? Tenemos novedades en cuero para su tienda.",
    },
    {
      nombre: "Recompra",
      mensaje: "Hola {contacto}, ya pasó un tiempo desde su último pedido en Convert. ¿Le preparo una cotización con las series que más rotan?",
    },
  ];
  if ((await db.plantillaWhatsApp.count()) === 0) {
    await db.plantillaWhatsApp.createMany({ data: plantillas });
  }

  console.log(`Seed listo. Usuarios demo con contraseña: ${PASSWORD_DEMO}`);
}

// ─────────────────────────── Clientes ───────────────────────────
const CLIENTES: [string, string, string, string, string, "TIENDA" | "REVENDEDOR" | "DISTRIBUIDOR"][] = [
  // razón social, nombre comercial, contacto, ciudad, zona, tipo
  ["Calzados El Porvenir S.A.C.", "Calzados El Porvenir", "Julio Ramos", "Lima", "Lima Norte", "TIENDA"],
  ["Inversiones Mega Shoes E.I.R.L.", "Mega Shoes", "Karina Salas", "Lima", "Lima Norte", "TIENDA"],
  ["Distribuidora Pies Ligeros S.A.C.", "Pies Ligeros", "Mario Chávez", "Lima", "Lima Norte", "DISTRIBUIDOR"],
  ["Comercial Andrea Moda S.R.L.", "Andrea Moda", "Andrea Flores", "Lima", "Lima Norte", "TIENDA"],
  ["Zapatería San Martín E.I.R.L.", "Zapatería San Martín", "Pedro Castillo", "Lima", "Lima Norte", "TIENDA"],
  ["Negocios Rivera Hnos. S.A.C.", "Rivera Hnos.", "Luis Rivera", "Lima", "Lima Norte", "REVENDEDOR"],
  ["Tiendas Paso Firme S.A.C.", "Paso Firme", "Gloria Medina", "Lima", "Lima Norte", "TIENDA"],
  ["Calzado Urbano Perú S.A.C.", "Urbano Perú", "Ricardo Soto", "Lima", "Lima Norte", "TIENDA"],
  ["Importaciones Gamarra Sport E.I.R.L.", "Gamarra Sport", "Elena Vargas", "Lima", "Lima Centro", "REVENDEDOR"],
  ["Grupo Cuero Fino S.A.C.", "Cuero Fino", "Fernando Díaz", "Lima", "Lima Centro", "DISTRIBUIDOR"],
  ["Boutique Pisadas S.R.L.", "Pisadas", "Sofía León", "Lima", "Lima Sur", "TIENDA"],
  ["Comercializadora Surco Shoes S.A.C.", "Surco Shoes", "Daniel Paredes", "Lima", "Lima Sur", "TIENDA"],
  ["Multiservicios Villa El Salvador E.I.R.L.", "Multi VES", "Rosa Huamán", "Lima", "Lima Sur", "REVENDEDOR"],
  ["Calzados Chorrillos S.A.C.", "Calzados Chorrillos", "Víctor Rojas", "Lima", "Lima Sur", "TIENDA"],
  ["Inversiones Lurín Moda S.A.C.", "Lurín Moda", "Patricia Cueva", "Lima", "Lima Sur", "TIENDA"],
  ["Tienda Kike Sport E.I.R.L.", "Kike Sport", "Enrique Palomino", "Lima", "Lima Sur", "TIENDA"],
  ["Distribuciones Atocongo S.A.C.", "Atocongo", "Mónica Sánchez", "Lima", "Lima Sur", "DISTRIBUIDOR"],
  ["Zapatería La Económica S.R.L.", "La Económica", "Hugo Espinoza", "Ica", "Sur", "TIENDA"],
  ["Comercial Arequipa Calza S.A.C.", "Arequipa Calza", "Carmen Zegarra", "Arequipa", "Sur", "DISTRIBUIDOR"],
  ["Calzados Misti E.I.R.L.", "Calzados Misti", "Alberto Núñez", "Arequipa", "Sur", "TIENDA"],
  ["Inversiones Trujillo Shoes S.A.C.", "Trujillo Shoes", "Jessica Aguilar", "Trujillo", "Norte", "DISTRIBUIDOR"],
  ["Calzados Moche S.R.L.", "Calzados Moche", "Raúl Gutiérrez", "Trujillo", "Norte", "TIENDA"],
  ["Comercial Chiclayo Pasos E.I.R.L.", "Chiclayo Pasos", "Liliana Tello", "Chiclayo", "Norte", "TIENDA"],
  ["Distribuidora Piura Norte S.A.C.", "Piura Norte", "Óscar Farfán", "Piura", "Norte", "DISTRIBUIDOR"],
  ["Zapatería Sullana Moda E.I.R.L.", "Sullana Moda", "Diana Seminario", "Sullana", "Norte", "REVENDEDOR"],
  ["Calzados Cajamarca S.A.C.", "Calzados Cajamarca", "Wilmer Chávez", "Cajamarca", "Norte", "TIENDA"],
  ["Inversiones Huancayo Style S.A.C.", "Huancayo Style", "Nelly Quispe", "Huancayo", "Centro", "TIENDA"],
  ["Tiendas Cusco Andino E.I.R.L.", "Cusco Andino", "Hernán Mamani", "Cusco", "Sur", "REVENDEDOR"],
  ["Comercial Amazonía Shoes S.A.C.", "Amazonía Shoes", "Rita Panduro", "Iquitos", "Oriente", "TIENDA"],
  ["Calzados Pucallpa E.I.R.L.", "Calzados Pucallpa", "Jaime Ríos", "Pucallpa", "Oriente", "TIENDA"],
];

async function seedClientes() {
  const zonas = new Map((await db.zona.findMany()).map((z) => [z.nombre, z.id]));
  const vendedores = new Map((await db.user.findMany({ where: { rol: "VENDEDOR" } })).map((u) => [u.email, u.id]));
  const porZona = (zona: string) =>
    zona === "Lima Norte" || zona === "Lima Centro" ? "carlos@convert.pe"
      : zona === "Lima Sur" ? "lucia@convert.pe"
        : "jorge@convert.pe";
  const admin = await db.user.findUniqueOrThrow({ where: { email: "gerente@convert.pe" } });

  for (const [i, [razonSocial, nombreComercial, contacto, ciudad, zona, tipo]] of CLIENTES.entries()) {
    const ruc = completarRuc(`20${String(601000000 + i * 7919).padStart(8, "0").slice(0, 8)}`);
    const celular = `9${String(51000000 + i * 104729).slice(0, 8)}`;
    const vendedorId = vendedores.get(porZona(zona))!;
    const existe = await db.cliente.findUnique({ where: { ruc } });
    if (existe) continue;
    const cliente = await db.cliente.create({
      data: {
        ruc, razonSocial, nombreComercial, tipo, ciudad,
        contactoNombre: contacto,
        telefono: celular,
        whatsapp: celular,
        email: `compras@${nombreComercial.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}.pe`,
        departamento: ciudad === "Sullana" ? "Piura" : ciudad === "Pucallpa" ? "Ucayali" : ciudad === "Iquitos" ? "Loreto" : ciudad === "Huancayo" ? "Junín" : ciudad === "Chiclayo" ? "Lambayeque" : ciudad === "Trujillo" ? "La Libertad" : ciudad,
        zonaId: zonas.get(zona),
        vendedorId,
      },
    });
    await db.clienteAsignacionHistorial.create({
      data: { clienteId: cliente.id, haciaVendedorId: vendedorId, asignadoPorId: admin.id, motivo: "Carga inicial" },
    });
  }
}

// PRNG determinista para que el seed genere siempre los mismos datos.
let semilla = 20260926;
function azar() {
  semilla = (semilla * 1664525 + 1013904223) % 4294967296;
  return semilla / 4294967296;
}
const entre = (min: number, max: number) => Math.floor(azar() * (max - min + 1)) + min;
const elegir = <T,>(xs: readonly T[]) => xs[Math.floor(azar() * xs.length)]!;
const DIA = 86_400_000;

// ─────────────────────────── Pipeline y actividades ───────────────────────────
async function seedPipeline() {
  if ((await db.oportunidad.count()) > 0) return;
  const clientes = await db.cliente.findMany({ where: { vendedorId: { not: null } } });
  const etapas = ["PROSPECTO", "CONTACTADO", "COTIZACION_ENVIADA", "NEGOCIACION", "GANADO", "PERDIDO"] as const;
  const titulos = ["Campaña escolar", "Reposición de temporada", "Nuevos modelos urbanos", "Pedido de fiestas", "Línea casual", "Apertura de tienda"];
  const motivos = ["Precio", "Eligió a la competencia", "Sin stock / tallas", "Cliente no respondió"];
  const ahora = Date.now();

  for (let i = 0; i < 24; i++) {
    const c = clientes[i % clientes.length]!;
    const etapa = etapas[i % etapas.length]!;
    const cerrada = etapa === "GANADO" || etapa === "PERDIDO";
    await db.oportunidad.create({
      data: {
        titulo: `${elegir(titulos)} – ${c.nombreComercial}`,
        etapa,
        valorEstimado: entre(8, 60) * 250,
        paresEstimados: entre(2, 20) * 12,
        fechaCierreProbable: new Date(ahora + entre(-10, 45) * DIA),
        fechaCierreReal: cerrada ? new Date(ahora - entre(1, 40) * DIA) : null,
        motivoPerdida: etapa === "PERDIDO" ? elegir(motivos) : null,
        clienteId: c.id,
        vendedorId: c.vendedorId!,
      },
    });
  }

  const tipos = ["LLAMADA", "WHATSAPP", "VISITA", "REUNION"] as const;
  const asuntos = ["Presentar catálogo de temporada", "Seguimiento de cotización", "Confirmar pago", "Coordinar despacho", "Consultar rotación de tallas", "Ofrecer reposición"];
  for (let i = 0; i < 60; i++) {
    const c = elegir(clientes);
    const dias = entre(-20, 7);
    const fecha = new Date(ahora + dias * DIA + entre(-4, 4) * 3_600_000);
    const completada = dias < -1 ? azar() < 0.85 : dias < 0 ? azar() < 0.5 : false;
    await db.actividad.create({
      data: {
        tipo: elegir(tipos),
        asunto: elegir(asuntos),
        clienteId: c.id,
        vendedorId: c.vendedorId!,
        fechaProgramada: fecha,
        completada,
        fechaRealizada: completada ? fecha : null,
        resultado: completada ? elegir(["EXITOSA", "EXITOSA", "SIN_RESPUESTA", "REPROGRAMADA"] as const) : "PENDIENTE",
      },
    });
  }
}

// ─────────────────────────── Catálogo ───────────────────────────
const CURVAS = [
  { nombre: "Caballero 38-43 (12 pares)", genero: "CABALLERO", distribucion: { "38": 1, "39": 2, "40": 3, "41": 3, "42": 2, "43": 1 } },
  { nombre: "Dama 35-40 (12 pares)", genero: "DAMA", distribucion: { "35": 1, "36": 2, "37": 3, "38": 3, "39": 2, "40": 1 } },
  { nombre: "Niño 27-32 (12 pares)", genero: "NINO", distribucion: { "27": 1, "28": 2, "29": 3, "30": 3, "31": 2, "32": 1 } },
] as const;

const COLORES: Record<string, string> = {
  Marrón: "#6b3e1f", Negro: "#1c1917", Hueso: "#f5f0e8", Camel: "#8a5a2b", Gris: "#3f3f46", Vino: "#7c2d12",
  Blanco: "#e7e5e4", Azul: "#1e3a8a", Verde: "#14532d", Fucsia: "#be185d", Beige: "#d6c7b0", Rojo: "#b91c1c", Turquesa: "#0e7490",
};

const MODELOS: [string, string, "CABALLERO" | "DAMA" | "NINO", number, string[], string][] = [
  // sku, nombre, género, precio por par, colores, descripción
  ["CV-URB-01", "Urbana Clásica", "CABALLERO", 89, ["Marrón", "Negro"], "Zapatilla urbana de cuero liso con plantilla acolchada."],
  ["CV-URB-02", "Urbana Street", "CABALLERO", 95, ["Negro", "Blanco"], "Diseño urbano con suela de caucho vulcanizado."],
  ["CV-URB-03", "Urbana Premium", "CABALLERO", 118, ["Hueso", "Marrón"], "Cuero napa seleccionado, costuras reforzadas."],
  ["CV-CAS-01", "Casual Nobuk", "CABALLERO", 99, ["Camel", "Gris"], "Cuero nobuk, ideal para oficina y fin de semana."],
  ["CV-CAS-02", "Casual Sport", "CABALLERO", 92, ["Gris", "Negro"], "Casual deportiva, liviana y flexible."],
  ["CV-CAS-03", "Casual Oxford", "CABALLERO", 125, ["Vino", "Negro"], "Estilo oxford con cordones encerados."],
  ["CV-DEP-01", "Deportiva Runner", "CABALLERO", 105, ["Blanco", "Azul"], "Cuero perforado para mayor ventilación."],
  ["CV-DEP-02", "Deportiva Pro", "CABALLERO", 112, ["Azul", "Negro"], "Suela de alta tracción, empeine acolchado."],
  ["CV-DEP-03", "Deportiva Trail", "CABALLERO", 129, ["Verde", "Marrón"], "Para caminata ligera y uso rudo."],
  ["CV-DAM-01", "Dama Sneaker", "DAMA", 85, ["Fucsia", "Blanco"], "Sneaker femenina de cuero con plataforma."],
  ["CV-DAM-02", "Dama Casual", "DAMA", 88, ["Beige", "Negro"], "Casual femenina, horma cómoda."],
  ["CV-DAM-03", "Dama Urbana", "DAMA", 94, ["Negro", "Blanco"], "Urbana con detalles metálicos."],
  ["CV-NIN-01", "Escolar Niño", "NINO", 65, ["Negro", "Rojo"], "Escolar resistente de cuero, puntera reforzada."],
  ["CV-NIN-02", "Sport Kids", "NINO", 69, ["Turquesa", "Blanco"], "Deportiva infantil con velcro."],
  ["CV-BOT-01", "Botín Cuero", "CABALLERO", 139, ["Marrón", "Negro"], "Botín de cuero engrasado con forro textil."],
];

async function seedCatalogo() {
  if ((await db.modelo.count()) > 0) return;
  const curvas: Record<string, string> = {};
  for (const c of CURVAS) {
    const pares = Object.values(c.distribucion).reduce((a, b) => a + b, 0);
    const creada = await db.curvaTallas.upsert({
      where: { nombre: c.nombre },
      update: {},
      create: { nombre: c.nombre, genero: c.genero, distribucion: c.distribucion, paresPorSerie: pares },
    });
    curvas[c.genero] = creada.id;
  }
  const colores: Record<string, string> = {};
  for (const [nombre, hex] of Object.entries(COLORES)) {
    colores[nombre] = (await db.color.upsert({ where: { nombre }, update: {}, create: { nombre, hex } })).id;
  }
  for (const [sku, nombre, genero, precio, cols, descripcion] of MODELOS) {
    const curva = CURVAS.find((c) => c.genero === genero)!;
    const modelo = await db.modelo.create({
      data: {
        sku, nombre, genero, descripcion,
        precioBase: precio,
        costo: Math.round(precio * 0.58),
        curvaId: curvas[genero]!,
        fotos: [`/catalogo/${sku.toLowerCase()}.svg`],
      },
    });
    for (const color of cols) {
      const series = entre(4, 30);
      await db.variante.createMany({
        data: Object.entries(curva.distribucion).map(([talla, pares]) => ({
          modeloId: modelo.id, colorId: colores[color]!, talla: Number(talla),
          // Algunas tallas quedan cortas para que se vean alertas de stock
          stock: pares * series + (azar() < 0.1 ? -pares * Math.min(series, entre(2, 6)) : entre(0, 4)),
        })),
      });
    }
  }
}

async function seedPrecios() {
  if ((await db.listaPrecio.count()) > 0) return;
  const tiendas = await db.listaPrecio.create({ data: { nombre: "Tiendas", tipoCliente: "TIENDA", ajustePorcentaje: 0 } });
  const reventa = await db.listaPrecio.create({ data: { nombre: "Revendedores", tipoCliente: "REVENDEDOR", ajustePorcentaje: -5 } });
  const distrib = await db.listaPrecio.create({ data: { nombre: "Distribuidores", tipoCliente: "DISTRIBUIDOR", ajustePorcentaje: -10 } });
  void tiendas;
  void reventa;
  await db.escalaPrecio.createMany({
    data: [
      { listaId: null, desdeSeries: 5, descuentoPorcentaje: 3 },
      { listaId: null, desdeSeries: 10, descuentoPorcentaje: 5 },
      { listaId: null, desdeSeries: 20, descuentoPorcentaje: 8 },
      { listaId: distrib.id, desdeSeries: 20, descuentoPorcentaje: 4 },
      { listaId: distrib.id, desdeSeries: 40, descuentoPorcentaje: 6 },
    ],
  });
  const botin = await db.modelo.findUnique({ where: { sku: "CV-BOT-01" } });
  if (botin) await db.precioLista.create({ data: { listaId: distrib.id, modeloId: botin.id, precio: 119 } });
}

// ─────────────────────────── Pedidos (24 meses) ───────────────────────────
type Perfil = "PROSPECTO" | "ACTIVO" | "NUEVO" | "EN_RIESGO" | "INACTIVO";

async function datosPrecios() {
  const [modelos, listas, escalas] = await Promise.all([
    db.modelo.findMany({ include: { curva: true, variantes: { select: { colorId: true } } } }),
    db.listaPrecio.findMany({ include: { precios: true } }),
    db.escalaPrecio.findMany(),
  ]);
  return { modelos, listas, escalas };
}

function lineasAleatorias(modelos: Awaited<ReturnType<typeof datosPrecios>>["modelos"], tipo: string) {
  const n = entre(1, tipo === "DISTRIBUIDOR" ? 5 : 3);
  const elegidos = new Map<string, { modeloId: string; colorId: string; series: number }>();
  for (let i = 0; i < n; i++) {
    const m = elegir(modelos);
    const colorId = elegir([...new Set(m.variantes.map((v) => v.colorId))]);
    const series = tipo === "DISTRIBUIDOR" ? entre(3, 10) : entre(1, 4);
    elegidos.set(`${m.id}|${colorId}`, { modeloId: m.id, colorId, series });
  }
  return [...elegidos.values()];
}

function totalesPara(d: Awaited<ReturnType<typeof datosPrecios>>, tipo: string, lineas: { modeloId: string; colorId: string; series: number }[], descuento = 0) {
  const lista = d.listas.find((l) => l.tipoCliente === tipo) ?? null;
  const escLista = lista ? d.escalas.filter((e) => e.listaId === lista.id) : [];
  const escalas = (escLista.length ? escLista : d.escalas.filter((e) => e.listaId === null)).map((e) => ({
    desdeSeries: e.desdeSeries, descuentoPorcentaje: Number(e.descuentoPorcentaje),
  }));
  return calcularTotales({
    lineas: lineas.map((l) => {
      const m = d.modelos.find((x) => x.id === l.modeloId)!;
      const pl = lista?.precios.find((p) => p.modeloId === m.id);
      return { ...l, paresPorSerie: m.curva.paresPorSerie, precioBase: Number(m.precioBase), precioLista: pl ? Number(pl.precio) : null };
    }),
    ajusteLista: lista ? Number(lista.ajustePorcentaje) : 0,
    escalas,
    descuentoManual: descuento,
    igvPorcentaje: 18,
  });
}

async function seedPedidos() {
  if ((await db.pedido.count()) > 0) return;
  const d = await datosPrecios();
  const admin = await db.user.findUniqueOrThrow({ where: { email: "gerente@convert.pe" } });
  const clientes = await db.cliente.findMany({ where: { vendedorId: { not: null } }, orderBy: { ruc: "asc" } });
  const ahora = Date.now();
  const inicioHistoria = ahora - 730 * DIA; // 24 meses: permite comparar contra el año anterior
  const perfiles: Perfil[] = [
    "ACTIVO", "ACTIVO", "EN_RIESGO", "ACTIVO", "NUEVO", "ACTIVO", "INACTIVO", "ACTIVO", "EN_RIESGO", "ACTIVO",
    "ACTIVO", "PROSPECTO", "ACTIVO", "EN_RIESGO", "NUEVO", "ACTIVO", "INACTIVO", "ACTIVO", "ACTIVO", "EN_RIESGO",
    "ACTIVO", "NUEVO", "ACTIVO", "PROSPECTO", "ACTIVO", "INACTIVO", "ACTIVO", "EN_RIESGO", "PROSPECTO", "ACTIVO",
  ];

  for (const [i, c] of clientes.entries()) {
    const perfil = perfiles[i % perfiles.length]!;
    if (perfil === "PROSPECTO") continue;
    const frecuencia = c.tipo === "DISTRIBUIDOR" ? entre(20, 35) : entre(25, 55);
    let fecha: number;
    let fin: number;
    switch (perfil) {
      case "NUEVO": fecha = ahora - entre(30, 80) * DIA; fin = ahora - entre(0, 10) * DIA; break;
      case "EN_RIESGO": fecha = inicioHistoria + entre(0, 60) * DIA; fin = ahora - Math.round(frecuencia * 1.8) * DIA; break;
      case "INACTIVO": fecha = inicioHistoria + entre(0, 90) * DIA; fin = ahora - entre(190, 240) * DIA; break;
      default: fecha = inicioHistoria + entre(0, 120) * DIA; fin = ahora - entre(0, 15) * DIA;
    }
    let primero = true;
    while (fecha <= fin) {
      const f = new Date(fecha + entre(9, 18) * 3_600_000);
      await crearPedidoHistorico(d, c, f, primero, admin.id);
      primero = false;
      fecha += Math.max(7, frecuencia + entre(-7, 7)) * DIA;
    }
  }

  // Pedidos de los últimos días en distintos estados, para probar el flujo completo
  const activos = clientes.filter((_, i) => perfiles[i % perfiles.length] === "ACTIVO");
  const recientes: EstadoSeed[] = ["PENDIENTE_PAGO", "PENDIENTE_PAGO", "PENDIENTE_PAGO", "PAGO_VERIFICADO", "EN_PREPARACION", "ENVIADO"];
  for (const [i, estado] of recientes.entries()) {
    const c = activos[(i * 3) % activos.length]!;
    await crearPedidoHistorico(d, c, new Date(ahora - entre(0, 4) * DIA - entre(1, 8) * 3_600_000), false, admin.id, estado);
  }
}

type EstadoSeed = "PENDIENTE_PAGO" | "PAGO_VERIFICADO" | "EN_PREPARACION" | "ENVIADO" | "ENTREGADO" | "CANCELADO";

async function crearPedidoHistorico(
  d: Awaited<ReturnType<typeof datosPrecios>>,
  c: { id: string; tipo: string; vendedorId: string | null; direccion: string | null; ciudad: string },
  fecha: Date,
  primero: boolean,
  adminId: string,
  estadoForzado?: EstadoSeed,
) {
  const lineas = lineasAleatorias(d.modelos, c.tipo);
  const t = totalesPara(d, c.tipo, lineas, azar() < 0.15 ? elegir([2, 3, 5]) : 0);
  const dias = (Date.now() - fecha.getTime()) / DIA;
  const estado: EstadoSeed = estadoForzado ??
    (dias > 12 ? (azar() < 0.05 ? "CANCELADO" : "ENTREGADO")
      : dias > 6 ? elegir(["ENVIADO", "ENTREGADO"] as const)
        : dias > 3 ? elegir(["PAGO_VERIFICADO", "EN_PREPARACION", "ENVIADO"] as const)
          : elegir(["PENDIENTE_PAGO", "PENDIENTE_PAGO", "PAGO_VERIFICADO"] as const));
  const pagado = estado !== "PENDIENTE_PAGO" && estado !== "CANCELADO";
  const enviado = estado === "ENVIADO" || estado === "ENTREGADO";
  const agencia = c.ciudad === "Lima" ? "Recojo en almacén" : elegir(["Shalom", "Olva Courier", "Marvisur", "Cruz del Sur Cargo"]);
  const fPago = new Date(fecha.getTime() + entre(2, 30) * 3_600_000);

  await db.pedido.create({
    data: {
      clienteId: c.id,
      vendedorId: c.vendedorId!,
      fecha,
      estado,
      subtotal: t.subtotal,
      descuentoMonto: t.descuentoVolumen + t.descuentoManualMonto,
      baseImponible: t.baseImponible,
      igv: t.igv,
      total: t.total,
      totalSeries: t.totalSeries,
      totalPares: t.totalPares,
      direccionEnvio: [c.direccion, c.ciudad].filter(Boolean).join(", "),
      agenciaEnvio: enviado ? agencia : null,
      numeroGuia: enviado && agencia !== "Recojo en almacén" ? `${agencia.slice(0, 3).toUpperCase()}-${entre(100000, 999999)}` : null,
      fechaEnvio: enviado ? new Date(fecha.getTime() + 2 * DIA) : null,
      fechaEntrega: estado === "ENTREGADO" ? new Date(fecha.getTime() + entre(3, 6) * DIA) : null,
      comprobante: pagado ? `F001-${String(entre(1000, 99999)).padStart(6, "0")}` : null,
      esPrimerPedido: primero,
      motivoCancelacion: estado === "CANCELADO" ? "Cliente desistió del pedido" : null,
      createdAt: fecha,
      items: {
        create: t.lineas.map((l) => ({
          modeloId: l.modeloId, colorId: l.colorId, series: l.series, pares: l.pares, precioPar: l.precioPar, subtotal: l.subtotal,
        })),
      },
      pagos: pagado
        ? { create: { monto: t.total, metodo: elegir(["TRANSFERENCIA", "DEPOSITO", "YAPE", "PLIN"] as const), referencia: String(entre(1000000, 9999999)), fecha: fPago, verificado: true, verificadoPorId: adminId, verificadoAt: fPago } }
        : undefined,
      historial: {
        create: [
          { estadoNuevo: "PENDIENTE_PAGO", usuarioId: c.vendedorId!, createdAt: fecha },
          ...(estado !== "PENDIENTE_PAGO" ? [{ estadoAnterior: "PENDIENTE_PAGO" as const, estadoNuevo: estado, usuarioId: adminId, createdAt: fPago }] : []),
        ],
      },
    },
  });
}

async function seedCotizaciones() {
  if ((await db.cotizacion.count()) > 0) return;
  const d = await datosPrecios();
  const clientes = await db.cliente.findMany({ where: { vendedorId: { not: null } }, take: 12, orderBy: { razonSocial: "asc" } });
  const estados = ["BORRADOR", "ENVIADA", "ENVIADA", "ACEPTADA", "RECHAZADA", "PENDIENTE_APROBACION"] as const;
  for (const [i, c] of clientes.entries()) {
    const estado = estados[i % estados.length]!;
    const lineas = lineasAleatorias(d.modelos, c.tipo);
    const descuento = estado === "PENDIENTE_APROBACION" ? elegir([7, 8, 12]) : azar() < 0.3 ? 3 : 0;
    const t = totalesPara(d, c.tipo, lineas, descuento);
    const creada = new Date(Date.now() - entre(0, 12) * DIA);
    const op = await db.oportunidad.findFirst({ where: { clienteId: c.id, etapa: { notIn: ["GANADO", "PERDIDO"] } } });
    await db.cotizacion.create({
      data: {
        clienteId: c.id, vendedorId: c.vendedorId!, oportunidadId: op?.id, estado,
        validaHasta: new Date(creada.getTime() + 7 * DIA),
        subtotal: t.subtotal, descuentoVolumen: t.descuentoVolumen, descuentoPorcentaje: descuento, descuentoMonto: t.descuentoManualMonto,
        baseImponible: t.baseImponible, igv: t.igv, total: t.total, createdAt: creada,
        items: { create: t.lineas.map((l) => ({ modeloId: l.modeloId, colorId: l.colorId, series: l.series, pares: l.pares, precioPar: l.precioPar, subtotal: l.subtotal })) },
        aprobaciones: estado === "PENDIENTE_APROBACION" ? { create: { solicitanteId: c.vendedorId!, descuentoSolicitado: descuento } } : undefined,
      },
    });
  }
}

// ─────────────────────────── Metas y comisiones ───────────────────────────
async function seedMetasYComisiones() {
  if ((await db.reglaComision.count()) === 0) {
    const desde = new Date("2025-01-01T05:00:00Z");
    await db.reglaComision.createMany({
      data: [
        { nombre: "Comisión 3 % sobre lo cobrado", tipo: "PORCENTAJE_VENTA_COBRADA", valor: 3, vigenteDesde: desde },
        { nombre: "Bono meta cumplida (100 %)", tipo: "BONO_CUMPLIMIENTO_META", valor: 300, umbralCumplimiento: 100, vigenteDesde: desde },
        { nombre: "Bono sobrecumplimiento (120 %)", tipo: "BONO_CUMPLIMIENTO_META", valor: 600, umbralCumplimiento: 120, vigenteDesde: desde },
        { nombre: "Bono por cliente nuevo", tipo: "BONO_CLIENTE_NUEVO", valor: 50, vigenteDesde: desde },
        { nombre: "Bono por cliente reactivado", tipo: "BONO_CLIENTE_REACTIVADO", valor: 30, vigenteDesde: desde },
      ],
    });
  }
  if ((await db.meta.count()) > 0) return;

  const vendedores = await db.user.findMany({ where: { rol: "VENDEDOR" } });
  const supervisor = await db.user.findUniqueOrThrow({ where: { email: "supervisor@convert.pe" } });
  const reglas = (await db.reglaComision.findMany()).map((r) => ({
    id: r.id, nombre: r.nombre, tipo: r.tipo, valor: Number(r.valor), umbralCumplimiento: r.umbralCumplimiento === null ? null : Number(r.umbralCumplimiento),
  }));
  const hoy = partesLima();
  const redondeoMil = (n: number) => Math.max(1000, Math.round(n / 1000) * 1000);

  for (let k = -12; k <= 0; k++) {
    const { anio, mes } = sumarMeses(hoy.anio, hoy.mes, k);
    const { inicio, fin } = rangoMes(anio, mes);
    let totalEquipo = 0;
    for (const v of vendedores) {
      const ventas = await db.pedido.aggregate({
        where: { vendedorId: v.id, fecha: { gte: inicio, lt: fin }, estado: { in: ["PAGO_VERIFICADO", "EN_PREPARACION", "ENVIADO", "ENTREGADO"] } },
        _sum: { baseImponible: true, totalPares: true },
      });
      // Meta del mes en curso: promedio de los 3 meses previos + 8 %; meses pasados: alrededor de lo vendido
      let base = Number(ventas._sum.baseImponible ?? 0);
      if (k === 0) {
        const m3 = sumarMeses(anio, mes, -3);
        const r3 = rangoMes(m3.anio, m3.mes);
        const prev = await db.pedido.aggregate({
          where: { vendedorId: v.id, fecha: { gte: r3.inicio, lt: inicio }, estado: { in: ["PAGO_VERIFICADO", "EN_PREPARACION", "ENVIADO", "ENTREGADO"] } },
          _sum: { baseImponible: true },
        });
        base = (Number(prev._sum.baseImponible ?? 0) / 3) * 1.08;
      }
      const metaSoles = redondeoMil(base * (k === 0 ? 1 : 0.85 + azar() * 0.35));
      totalEquipo += metaSoles;
      const paresMeta = Math.max(12, Math.round(((ventas._sum.totalPares ?? 0) * (k === 0 ? 1.1 : 0.9 + azar() * 0.3)) / 12) * 12);
      await db.meta.createMany({
        data: [
          { tipo: "SOLES", periodo: "MENSUAL", anio, mes, vendedorId: v.id, valor: metaSoles },
          { tipo: "PARES", periodo: "MENSUAL", anio, mes, vendedorId: v.id, valor: paresMeta },
          { tipo: "CLIENTES_NUEVOS", periodo: "MENSUAL", anio, mes, vendedorId: v.id, valor: 1 },
          { tipo: "CLIENTES_REACTIVADOS", periodo: "MENSUAL", anio, mes, vendedorId: v.id, valor: 1 },
        ],
      });

      // Liquidaciones de meses cerrados
      if (k < 0) {
        const cobrado = await db.pago.aggregate({
          where: { verificado: true, fecha: { gte: inicio, lt: fin }, pedido: { vendedorId: v.id, estado: { not: "CANCELADO" } } },
          _sum: { monto: true },
        });
        const nuevos = await db.pedido.count({ where: { vendedorId: v.id, fecha: { gte: inicio, lt: fin }, esPrimerPedido: true, estado: { not: "CANCELADO" } } });
        const resultados = {
          ventaCobrada: sinIgv(Number(cobrado._sum.monto ?? 0), 18),
          cumplimientoSoles: Number(ventas._sum.baseImponible ?? 0) / metaSoles,
          clientesNuevos: nuevos,
          clientesReactivados: 0,
        };
        const c = calcularComision(resultados, reglas);
        await db.liquidacionComision.create({
          data: {
            vendedorId: v.id, anio, mes, ventaCobrada: resultados.ventaCobrada, comisionVenta: c.comisionVenta, bonos: c.bonos, total: c.total,
            detalle: JSON.parse(JSON.stringify({ resultados, lineas: c.lineas })),
            estado: k === -1 ? "APROBADA" : "PAGADA",
          },
        });
      }
    }
    await db.meta.create({ data: { tipo: "SOLES", periodo: "MENSUAL", anio, mes, equipoSupervisorId: supervisor.id, valor: totalEquipo } });
    await db.meta.create({ data: { tipo: "SOLES", periodo: "MENSUAL", anio, mes, valor: totalEquipo } });
  }
}

/** Mismo cálculo que server/metricas-cliente.ts, con las reglas por defecto. */
async function recalcularClientes() {
  const cfg = await db.configuracion.findUniqueOrThrow({ where: { id: 1 } });
  const reglas = {
    diasClienteNuevo: cfg.diasClienteNuevo, factorEnRiesgo: Number(cfg.factorEnRiesgo),
    diasClienteInactivo: cfg.diasClienteInactivo, frecuenciaDefectoDias: cfg.frecuenciaDefectoDias,
  };
  const ahora = new Date();
  const hace12m = new Date(ahora.getTime() - 365 * DIA);
  for (const c of await db.cliente.findMany()) {
    const pedidos = await db.pedido.findMany({
      where: { clienteId: c.id, estado: { in: ["PAGO_VERIFICADO", "EN_PREPARACION", "ENVIADO", "ENTREGADO"] } },
      select: { fecha: true, baseImponible: true },
      orderBy: { fecha: "asc" },
    });
    const fechas = pedidos.map((p) => p.fecha);
    const primeraCompra = fechas[0] ?? null;
    const ultimaCompra = fechas.at(-1) ?? null;
    const frecuenciaDias = calcularFrecuenciaDias(fechas);
    const total = pedidos.reduce((s, p) => s + Number(p.baseImponible), 0);
    const total12m = pedidos.filter((p) => p.fecha >= hace12m).reduce((s, p) => s + Number(p.baseImponible), 0);
    await db.cliente.update({
      where: { id: c.id },
      data: {
        primeraCompra, ultimaCompra, frecuenciaDias,
        numeroPedidos: pedidos.length,
        ticketPromedio: pedidos.length ? Math.round((total / pedidos.length) * 100) / 100 : null,
        totalComprado12m: Math.round(total12m * 100) / 100,
        estado: calcularEstadoCliente({ primeraCompra, ultimaCompra, frecuenciaDias }, reglas, ahora),
        categoria: c.categoriaManual ? c.categoria : calcularCategoria(total12m, Number(cfg.umbralCategoriaA), Number(cfg.umbralCategoriaB)),
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
