// Seed multi-local: crea 2 locales ('miraflores' y 'surco') con cartas y
// mesas independientes, más 4 usuarios (1 superadmin, 2 gerentes, 1 mesero
// presente en ambos locales). Idempotente (upsert).

import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const HASH_ROUNDS = 12;

async function ensureUser(input: {
  email: string;
  name: string;
  password: string;
  role: 'ADMIN' | 'OPERATOR';
}): Promise<string> {
  const passwordHash = await bcrypt.hash(input.password, HASH_ROUNDS);
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: { name: input.name, role: input.role, active: true },
    create: {
      email: input.email,
      name: input.name,
      passwordHash,
      role: input.role,
      active: true,
    },
  });
  return user.id;
}

async function ensureMembership(
  userId: string,
  restaurantId: string,
  role: 'ADMIN' | 'OPERATOR',
): Promise<void> {
  await prisma.restaurantMember.upsert({
    where: { userId_restaurantId: { userId, restaurantId } },
    update: { role, active: true },
    create: { userId, restaurantId, role, active: true },
  });
}

async function ensureRestaurant(input: {
  slug: string;
  name: string;
  address: string;
  phone: string;
  primaryColor: string | null;
  secondaryColor: string | null;
}): Promise<string> {
  const data: Prisma.RestaurantUncheckedCreateInput = {
    slug: input.slug,
    name: input.name,
    address: input.address,
    phone: input.phone,
    active: true,
  };
  if (input.primaryColor) data.primaryColor = input.primaryColor;
  if (input.secondaryColor) data.secondaryColor = input.secondaryColor;
  const r = await prisma.restaurant.upsert({
    where: { slug: input.slug },
    update: data,
    create: data,
  });
  return r.id;
}

async function ensureCategory(
  restaurantId: string,
  name: string,
  sortOrder: number,
  isSystem: boolean,
): Promise<string> {
  const c = await prisma.menuCategory.upsert({
    where: { restaurantId_name: { restaurantId, name } },
    update: { sortOrder, isSystem, active: true },
    create: { restaurantId, name, sortOrder, isSystem, active: true },
  });
  return c.id;
}

async function ensureDish(
  restaurantId: string,
  categoryId: string,
  name: string,
  price: number,
  description?: string,
): Promise<void> {
  const existing = await prisma.dish.findFirst({
    where: { restaurantId, name },
  });
  if (existing) return;
  await prisma.dish.create({
    data: {
      restaurantId,
      categoryId,
      name,
      price: new Prisma.Decimal(price),
      description: description ?? null,
    },
  });
}

async function ensureTable(
  restaurantId: string,
  number: number,
  name: string,
  capacity: number,
  posX: number,
  posY: number,
): Promise<void> {
  await prisma.table.upsert({
    where: { restaurantId_number: { restaurantId, number } },
    update: { name, capacity, posX, posY, active: true },
    create: { restaurantId, number, name, capacity, posX, posY, active: true },
  });
}

interface MenuTemplate {
  categories: Array<{ name: string; sortOrder: number; isSystem: boolean }>;
  dishes: Array<{ name: string; price: number; category: string; description?: string }>;
}

async function applyMenu(
  restaurantId: string,
  template: MenuTemplate,
): Promise<void> {
  const categoryIds = new Map<string, string>();
  for (const c of template.categories) {
    const id = await ensureCategory(restaurantId, c.name, c.sortOrder, c.isSystem);
    categoryIds.set(c.name, id);
  }
  for (const d of template.dishes) {
    const catId = categoryIds.get(d.category);
    if (!catId) continue;
    await ensureDish(restaurantId, catId, d.name, d.price, d.description);
  }
}

async function applyTables(
  restaurantId: string,
  count: number,
  prefix: string,
): Promise<void> {
  for (let n = 1; n <= count; n++) {
    await ensureTable(
      restaurantId,
      n,
      `${prefix} ${n}`,
      n % 3 === 0 ? 6 : 4,
      ((n - 1) % 4) * 120 + 20,
      Math.floor((n - 1) / 4) * 120 + 20,
    );
  }
}

const MIRAFLORES_MENU: MenuTemplate = {
  categories: [
    { name: 'Entradas', sortOrder: 1, isSystem: true },
    { name: 'Platos principales', sortOrder: 2, isSystem: true },
    { name: 'Bebidas', sortOrder: 3, isSystem: true },
    { name: 'Postres', sortOrder: 4, isSystem: true },
  ],
  dishes: [
    { name: 'Ceviche clásico', price: 28, category: 'Entradas', description: 'Pescado fresco, limón, ají y camote' },
    { name: 'Causa limeña', price: 18, category: 'Entradas', description: 'Papa amarilla rellena de pollo' },
    { name: 'Tiradito de salmón', price: 32, category: 'Entradas', description: 'Salmón en láminas con salsa de ají amarillo' },
    { name: 'Lomo saltado', price: 32, category: 'Platos principales', description: 'Lomo, papas fritas y arroz' },
    { name: 'Arroz con mariscos', price: 35, category: 'Platos principales' },
    { name: 'Ají de gallina', price: 26, category: 'Platos principales' },
    { name: 'Chicharrón de calamar', price: 30, category: 'Platos principales' },
    { name: 'Inca Kola 500ml', price: 6, category: 'Bebidas' },
    { name: 'Chicha morada (jarra)', price: 12, category: 'Bebidas' },
    { name: 'Limonada de maracuyá', price: 10, category: 'Bebidas' },
    { name: 'Agua mineral', price: 4, category: 'Bebidas' },
    { name: 'Suspiro a la limeña', price: 14, category: 'Postres' },
    { name: 'Mazamorra morada', price: 10, category: 'Postres' },
  ],
};

const SURCO_MENU: MenuTemplate = {
  categories: [
    { name: 'Entradas', sortOrder: 1, isSystem: true },
    { name: 'Pollo a la brasa', sortOrder: 2, isSystem: false },
    { name: 'Guarniciones', sortOrder: 3, isSystem: false },
    { name: 'Bebidas', sortOrder: 4, isSystem: true },
    { name: 'Postres', sortOrder: 5, isSystem: true },
  ],
  dishes: [
    { name: 'Tequeños', price: 14, category: 'Entradas', description: 'Palitos de queso envueltos en masa' },
    { name: 'Papa rellena', price: 8, category: 'Entradas' },
    { name: 'Pollo entero', price: 55, category: 'Pollo a la brasa', description: 'Pollo a la brasa con papas y ensalada' },
    { name: 'Medio pollo', price: 32, category: 'Pollo a la brasa' },
    { name: 'Cuarto de pollo', price: 18, category: 'Pollo a la brasa' },
    { name: 'Papas crocantes', price: 10, category: 'Guarniciones' },
    { name: 'Ensalada mixta', price: 9, category: 'Guarniciones' },
    { name: 'Arroz blanco', price: 6, category: 'Guarniciones' },
    { name: 'Inca Kola 1.5L', price: 12, category: 'Bebidas' },
    { name: 'Coca-Cola 1.5L', price: 12, category: 'Bebidas' },
    { name: 'Chicha morada (jarra)', price: 10, category: 'Bebidas' },
    { name: 'Pie de manzana', price: 12, category: 'Postres' },
  ],
};

async function main(): Promise<void> {
  // --- Configuración del tenant (marca por defecto) ---
  const settingsExists = await prisma.restaurantSettings.findFirst();
  if (!settingsExists) {
    await prisma.restaurantSettings.create({
      data: {
        name: 'Mis Locales',
        primaryColor: '#E63946',
        secondaryColor: '#1D3557',
        address: 'Lima, Perú',
        phone: '+51 999 999 999',
        businessInfo: 'RUC: 20123456789',
      },
    });
  }

  // --- Usuarios ---
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@restaurante.pe';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234';
  const adminName = process.env.SEED_ADMIN_NAME ?? 'Administrador';

  // Superadmin (sin membresía = ve todos los locales).
  const superAdminId = await ensureUser({
    email: adminEmail,
    name: adminName,
    password: adminPassword,
    role: 'ADMIN',
  });

  const gerenteMirafloresId = await ensureUser({
    email: 'gerente.miraflores@restaurante.pe',
    name: 'Gerente Miraflores',
    password: 'Miraflores1234',
    role: 'ADMIN',
  });

  const gerenteSurcoId = await ensureUser({
    email: 'gerente.surco@restaurante.pe',
    name: 'Gerente Surco',
    password: 'Surco1234',
    role: 'ADMIN',
  });

  // Mesero: OPERATOR en ambos locales.
  const meseroId = await ensureUser({
    email: 'mesero@restaurante.pe',
    name: 'Mesero de ejemplo',
    password: 'Mesero1234',
    role: 'OPERATOR',
  });

  // --- Locales ---
  const mirafloresId = await ensureRestaurant({
    slug: 'miraflores',
    name: 'Ceviche House — Miraflores',
    address: 'Av. Larco 345, Miraflores',
    phone: '+51 987 111 222',
    primaryColor: null,
    secondaryColor: null,
  });

  const surcoId = await ensureRestaurant({
    slug: 'surco',
    name: 'Pollería La Brasa — Surco',
    address: 'Av. Caminos del Inca 1234, Surco',
    phone: '+51 987 333 444',
    primaryColor: '#B45309',
    secondaryColor: '#1F2937',
  });

  // --- Membresías ---
  await ensureMembership(gerenteMirafloresId, mirafloresId, 'ADMIN');
  await ensureMembership(gerenteSurcoId, surcoId, 'ADMIN');
  await ensureMembership(meseroId, mirafloresId, 'OPERATOR');
  await ensureMembership(meseroId, surcoId, 'OPERATOR');
  void superAdminId; // superadmin no requiere membresía

  // --- Cartas y mesas por local ---
  await applyMenu(mirafloresId, MIRAFLORES_MENU);
  await applyMenu(surcoId, SURCO_MENU);

  await applyTables(mirafloresId, 10, 'Mesa');
  await applyTables(surcoId, 8, 'Mesa');

  // eslint-disable-next-line no-console
  console.log('Seed multi-local completado.');
  console.log('  Superadmin:', adminEmail, '/', adminPassword);
  console.log('  Gerente Miraflores: gerente.miraflores@restaurante.pe / Miraflores1234');
  console.log('  Gerente Surco:      gerente.surco@restaurante.pe      / Surco1234');
  console.log('  Mesero (ambos):     mesero@restaurante.pe             / Mesero1234');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
