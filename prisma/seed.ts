// Datos de prueba. Idempotente: se puede ejecutar varias veces.
// Cada fase amplía este seed (clientes, catálogo, pedidos…).
import { PrismaClient, type Rol, type CanalVenta } from "@prisma/client";
import bcrypt from "bcryptjs";
import { completarRuc } from "../src/lib/ruc";

const db = new PrismaClient();
const PASSWORD_DEMO = process.env.SEED_PASSWORD ?? "Convert2026";

async function main() {
  await db.configuracion.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

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

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
