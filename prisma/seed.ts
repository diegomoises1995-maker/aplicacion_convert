// Datos de prueba. Idempotente: se puede ejecutar varias veces.
// Cada fase amplía este seed (clientes, catálogo, pedidos…).
import { PrismaClient, type Rol, type CanalVenta } from "@prisma/client";
import bcrypt from "bcryptjs";

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

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
