// Seed mínimo para el primer arranque del sistema: 1 local, 1 usuario
// administrador (superadmin, sin membresía = ve todo), 1 mesa, y las
// categorías base del sistema (sin platos). Los locales adicionales,
// mesas, platos y miembros se crean desde la interfaz web.
// Idempotente (upsert).

import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const HASH_ROUNDS = 12;

async function ensureUser(input: {
  email?: string;
  username?: string;
  name: string;
  password: string;
  role: 'ADMIN' | 'OPERATOR';
}): Promise<{ id: string; loginId: string }> {
  const passwordHash = await bcrypt.hash(input.password, HASH_ROUNDS);

  // Busca por email primero (identificador principal), luego por username.
  let user = input.email
    ? await prisma.user.findUnique({ where: { email: input.email } })
    : null;
  if (!user && input.username) {
    user = await prisma.user.findUnique({ where: { username: input.username } });
  }

  if (user) {
    // Si el username deseado ya está ocupado por OTRO usuario, no lo forzamos.
    let targetUsername = input.username ?? undefined;
    if (targetUsername && targetUsername !== user.username) {
      const existing = await prisma.user.findUnique({ where: { username: targetUsername } });
      if (existing && existing.id !== user.id) {
        targetUsername = undefined; // ya lo tiene otro usuario, no sobreescribir
      }
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: input.name,
        role: input.role,
        active: true,
        email: input.email ?? user.email,
        username: targetUsername ?? user.username,
      },
    });
    return { id: updated.id, loginId: loginId(updated) };
  }

  // Al crear, verificar que el username no esté ocupado.
  let createUsername = input.username ?? undefined;
  if (createUsername) {
    const existing = await prisma.user.findUnique({ where: { username: createUsername } });
    if (existing) createUsername = undefined;
  }
  const created = await prisma.user.create({
    data: {
      email: input.email ?? null,
      username: createUsername ?? null,
      name: input.name,
      passwordHash,
      role: input.role,
      active: true,
    },
  });
  return { id: created.id, loginId: loginId(created) };
}

/** Retorna el identificador con el que el usuario puede hacer login (email o username). */
function loginId(user: { email: string | null; username: string | null }): string {
  return user.username ?? user.email ?? '(sin identificador)';
}

async function ensureRestaurant(input: {
  slug: string;
  name: string;
  address: string;
  phone: string;
}): Promise<string> {
  const r = await prisma.restaurant.upsert({
    where: { slug: input.slug },
    update: {
      name: input.name,
      address: input.address,
      phone: input.phone,
      active: true,
    },
    create: {
      slug: input.slug,
      name: input.name,
      address: input.address,
      phone: input.phone,
      active: true,
    },
  });
  return r.id;
}

async function ensureCategory(
  restaurantId: string,
  name: string,
  sortOrder: number,
  isSystem: boolean,
): Promise<void> {
  await prisma.menuCategory.upsert({
    where: { restaurantId_name: { restaurantId, name } },
    update: { sortOrder, isSystem, active: true },
    create: { restaurantId, name, sortOrder, isSystem, active: true },
  });
}

const BASE_CATEGORIES = [
  { name: 'Entradas', sortOrder: 1, isSystem: true },
  { name: 'Platos principales', sortOrder: 2, isSystem: true },
  { name: 'Bebidas', sortOrder: 3, isSystem: true },
  { name: 'Postres', sortOrder: 4, isSystem: true },
];

async function main(): Promise<void> {
  // --- Configuración del tenant (marca por defecto) ---
  const settingsExists = await prisma.restaurantSettings.findFirst();
  if (!settingsExists) {
    await prisma.restaurantSettings.create({
      data: {
        name: 'Mi Restaurante',
        primaryColor: '#E63946',
        secondaryColor: '#1D3557',
        address: '',
        phone: '',
        businessInfo: '',
      },
    });
  }

  // --- Usuario administrador (superadmin: ADMIN sin membresía) ---
  // Soporta login por email o por username.
  // Si SEED_ADMIN_USERNAME está definido, se usa como identificador único
  // para el upsert (find + create/update). Si no, se usa el email.
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@restaurante.pe';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234';
  const adminName = process.env.SEED_ADMIN_NAME ?? 'Administrador';
  const adminUsername = process.env.SEED_ADMIN_USERNAME?.trim() || undefined;

  const admin = await ensureUser({
    email: adminEmail,
    username: adminUsername,
    name: adminName,
    password: adminPassword,
    role: 'ADMIN',
  });

  // --- Local principal ---
  const restaurantId = await ensureRestaurant({
    slug: 'principal',
    name: 'Local Principal',
    address: '',
    phone: '',
  });

  // --- Categorías base (sin platos) ---
  for (const c of BASE_CATEGORIES) {
    await ensureCategory(restaurantId, c.name, c.sortOrder, c.isSystem);
  }

  // --- Una mesa de ejemplo ---
  const tableExists = await prisma.table.findUnique({
    where: { restaurantId_number: { restaurantId, number: 1 } },
  });
  if (!tableExists) {
    await prisma.table.create({
      data: {
        restaurantId,
        number: 1,
        name: 'Mesa 1',
        capacity: 4,
        posX: 20,
        posY: 20,
        active: true,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed inicial completado.');
  console.log(`  Administrador: ${admin.loginId} / ${adminPassword}`);
  console.log('  Local principal: "principal" (puedes agregar más desde /locales)');
  console.log('  1 mesa registrada, categorías base sin platos.');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
