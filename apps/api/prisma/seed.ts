// Seed inicial: usuario administrador, configuración del restaurante, categorías
// base de la carta, algunos platos de ejemplo y mesas. Idempotente (upsert).

import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // --- Usuario administrador ---
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@restaurante.pe';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234';
  const adminName = process.env.SEED_ADMIN_NAME ?? 'Administrador';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, name: adminName, role: 'ADMIN', passwordHash },
  });

  // Operador de ejemplo
  await prisma.user.upsert({
    where: { email: 'mesero@restaurante.pe' },
    update: {},
    create: {
      email: 'mesero@restaurante.pe',
      name: 'Mesero de ejemplo',
      role: 'OPERATOR',
      passwordHash: await bcrypt.hash('Mesero1234', 12),
    },
  });

  // --- Configuración del restaurante ---
  const settingsExists = await prisma.restaurantSettings.findFirst();
  if (!settingsExists) {
    await prisma.restaurantSettings.create({
      data: {
        name: 'Cevichería El Puerto',
        primaryColor: '#E63946',
        secondaryColor: '#1D3557',
        address: 'Av. Costanera 123, Lima',
        phone: '+51 987 654 321',
        businessInfo: 'RUC: 20123456789',
      },
    });
  }

  // --- Categorías base ---
  const baseCategories = [
    { name: 'Entradas', sortOrder: 1 },
    { name: 'Platos principales', sortOrder: 2 },
    { name: 'Bebidas', sortOrder: 3 },
    { name: 'Postres', sortOrder: 4 },
  ];
  for (const cat of baseCategories) {
    await prisma.menuCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: { ...cat, isSystem: true },
    });
  }

  const categories = await prisma.menuCategory.findMany();
  const byName = (name: string) => categories.find((c) => c.name === name)!;

  // --- Platos de ejemplo ---
  const dishes: Array<{ name: string; price: number; category: string; description?: string }> = [
    { name: 'Ceviche clásico', price: 28, category: 'Entradas', description: 'Pescado fresco, limón, ají y camote' },
    { name: 'Causa limeña', price: 18, category: 'Entradas', description: 'Papa amarilla rellena de pollo' },
    { name: 'Lomo saltado', price: 32, category: 'Platos principales', description: 'Lomo, papas fritas y arroz' },
    { name: 'Arroz con mariscos', price: 35, category: 'Platos principales' },
    { name: 'Ají de gallina', price: 26, category: 'Platos principales' },
    { name: 'Inca Kola 500ml', price: 6, category: 'Bebidas' },
    { name: 'Chicha morada (jarra)', price: 12, category: 'Bebidas' },
    { name: 'Agua mineral', price: 4, category: 'Bebidas' },
    { name: 'Suspiro a la limeña', price: 14, category: 'Postres' },
    { name: 'Mazamorra morada', price: 10, category: 'Postres' },
  ];
  for (const d of dishes) {
    const exists = await prisma.dish.findFirst({ where: { name: d.name } });
    if (!exists) {
      await prisma.dish.create({
        data: {
          name: d.name,
          description: d.description ?? null,
          price: new Prisma.Decimal(d.price),
          categoryId: byName(d.category).id,
        },
      });
    }
  }

  // --- Mesas ---
  for (let n = 1; n <= 10; n++) {
    await prisma.table.upsert({
      where: { number: n },
      update: {},
      create: {
        number: n,
        name: `Mesa ${n}`,
        capacity: n % 3 === 0 ? 6 : 4,
        posX: ((n - 1) % 4) * 120 + 20,
        posY: Math.floor((n - 1) / 4) * 120 + 20,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed completado. Admin:', adminEmail);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
