import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Dish, MenuCategory, Prisma } from '@prisma/client';
import { DishDto, MenuCategoryDto } from '@restaurante/shared-types';
import { PrismaService } from '../../core/prisma/prisma.service';
import { toNumber } from '../../common/utils/money.util';
import { AuditService } from '../audit/audit.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateDishDto } from './dto/create-dish.dto';
import { UpdateDishDto } from './dto/update-dish.dto';

type DishWithCategory = Dish & { category?: MenuCategory | null };

interface DishFilter {
  categoryId?: string;
  active?: boolean;
}

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ----------------------------------------------------------------------
  // Categorías
  // ----------------------------------------------------------------------

  async listCategories(): Promise<MenuCategoryDto[]> {
    const categories = await this.prisma.menuCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return categories.map((c) => this.toCategoryDto(c));
  }

  async createCategory(
    dto: CreateCategoryDto,
    actorId: string,
  ): Promise<MenuCategoryDto> {
    const existing = await this.prisma.menuCategory.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Ya existe una categoría con ese nombre.');
    }

    const category = await this.prisma.menuCategory.create({
      data: {
        name: dto.name,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'CATEGORY_CREATED',
      entity: 'MenuCategory',
      entityId: category.id,
      metadata: { name: category.name },
    });

    return this.toCategoryDto(category);
  }

  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
    actorId: string,
  ): Promise<MenuCategoryDto> {
    const category = await this.prisma.menuCategory.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada.');
    }

    if (dto.name !== undefined && dto.name !== category.name) {
      const duplicate = await this.prisma.menuCategory.findUnique({
        where: { name: dto.name },
      });
      if (duplicate) {
        throw new ConflictException('Ya existe una categoría con ese nombre.');
      }
    }

    const data: Prisma.MenuCategoryUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.active !== undefined) data.active = dto.active;

    const updated = await this.prisma.menuCategory.update({ where: { id }, data });

    await this.audit.record({
      userId: actorId,
      action: 'CATEGORY_UPDATED',
      entity: 'MenuCategory',
      entityId: id,
      metadata: { changed: Object.keys(data) },
    });

    return this.toCategoryDto(updated);
  }

  async deleteCategory(id: string, actorId: string): Promise<void> {
    const category = await this.prisma.menuCategory.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada.');
    }

    if (category.isSystem) {
      throw new BadRequestException(
        'No se puede eliminar una categoría del sistema.',
      );
    }

    const dishCount = await this.prisma.dish.count({ where: { categoryId: id } });
    if (dishCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar una categoría con platos. Reasigne o desactive los platos primero.',
      );
    }

    await this.prisma.menuCategory.delete({ where: { id } });

    await this.audit.record({
      userId: actorId,
      action: 'CATEGORY_DELETED',
      entity: 'MenuCategory',
      entityId: id,
      metadata: { name: category.name },
    });
  }

  // ----------------------------------------------------------------------
  // Platos
  // ----------------------------------------------------------------------

  async listDishes(filter: DishFilter): Promise<DishDto[]> {
    const where: Prisma.DishWhereInput = {};
    if (filter.categoryId !== undefined) where.categoryId = filter.categoryId;
    if (filter.active !== undefined) where.active = filter.active;

    const dishes = await this.prisma.dish.findMany({
      where,
      include: { category: true },
      orderBy: { name: 'asc' },
    });
    return dishes.map((d) => this.toDishDto(d));
  }

  async getDish(id: string): Promise<DishDto> {
    const dish = await this.prisma.dish.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!dish) {
      throw new NotFoundException('Plato no encontrado.');
    }
    return this.toDishDto(dish);
  }

  async createDish(dto: CreateDishDto, actorId: string): Promise<DishDto> {
    const category = await this.prisma.menuCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada.');
    }

    const dish = await this.prisma.dish.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        price: new Prisma.Decimal(dto.price),
        imageUrl: dto.imageUrl ?? null,
        categoryId: dto.categoryId,
      },
      include: { category: true },
    });

    await this.audit.record({
      userId: actorId,
      action: 'DISH_CREATED',
      entity: 'Dish',
      entityId: dish.id,
      metadata: { name: dish.name, price: toNumber(dish.price) },
    });

    return this.toDishDto(dish);
  }

  async updateDish(
    id: string,
    dto: UpdateDishDto,
    actorId: string,
  ): Promise<DishDto> {
    const dish = await this.prisma.dish.findUnique({ where: { id } });
    if (!dish) {
      throw new NotFoundException('Plato no encontrado.');
    }

    if (dto.categoryId !== undefined) {
      const category = await this.prisma.menuCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Categoría no encontrada.');
      }
    }

    const data: Prisma.DishUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.categoryId !== undefined) {
      data.category = { connect: { id: dto.categoryId } };
    }

    const updated = await this.prisma.dish.update({
      where: { id },
      data,
      include: { category: true },
    });

    await this.audit.record({
      userId: actorId,
      action: 'DISH_UPDATED',
      entity: 'Dish',
      entityId: id,
      metadata: { changed: Object.keys(data) },
    });

    return this.toDishDto(updated);
  }

  async deleteDish(id: string, actorId: string): Promise<DishDto> {
    const dish = await this.prisma.dish.findUnique({ where: { id } });
    if (!dish) {
      throw new NotFoundException('Plato no encontrado.');
    }

    // Borrado lógico: el plato puede estar referenciado por order_items y se
    // conserva para preservar el historial de pedidos.
    const updated = await this.prisma.dish.update({
      where: { id },
      data: { active: false },
      include: { category: true },
    });

    await this.audit.record({
      userId: actorId,
      action: 'DISH_DEACTIVATED',
      entity: 'Dish',
      entityId: id,
    });

    return this.toDishDto(updated);
  }

  // ----------------------------------------------------------------------
  // Mapeadores
  // ----------------------------------------------------------------------

  private toCategoryDto(category: MenuCategory): MenuCategoryDto {
    return {
      id: category.id,
      name: category.name,
      sortOrder: category.sortOrder,
      isSystem: category.isSystem,
      active: category.active,
    };
  }

  private toDishDto(dish: DishWithCategory): DishDto {
    return {
      id: dish.id,
      name: dish.name,
      description: dish.description,
      price: toNumber(dish.price),
      imageUrl: dish.imageUrl,
      active: dish.active,
      categoryId: dish.categoryId,
      category: dish.category ? this.toCategoryDto(dish.category) : undefined,
    };
  }
}
