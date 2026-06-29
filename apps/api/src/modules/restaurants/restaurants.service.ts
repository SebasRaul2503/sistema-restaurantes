import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Restaurant, RestaurantMember, User } from '@prisma/client';
import {
  MyRestaurantDto,
  RestaurantDto,
  RestaurantMemberDto,
  RestaurantThemeDto,
  UserRole,
} from '@restaurante/shared-types';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

type RestaurantWithMembership = Restaurant & {
  members: Array<RestaurantMember & { user: Pick<User, 'id' | 'name' | 'email'> }>;
};

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ----------------------------------------------------------------------
  // Locales (CRUD) — solo ADMIN
  // ----------------------------------------------------------------------

  async listAll(): Promise<RestaurantDto[]> {
    const restaurants = await this.prisma.restaurant.findMany({
      orderBy: { name: 'asc' },
    });
    return restaurants.map((r) => this.toDto(r));
  }

  async listMine(userId: string): Promise<MyRestaurantDto[]> {
    const memberships = await this.prisma.restaurantMember.findMany({
      where: { userId, active: true },
      include: { restaurant: true },
      orderBy: { restaurant: { name: 'asc' } },
    });
    return memberships.map((m) =>
      this.toMyRestaurantDto(m.restaurant, m.role as UserRole, m.active),
    );
  }

  /**
   * Devuelve los locales visibles para el usuario. Si es superadmin
   * (ADMIN sin membresías) devuelve todos; si no, solo donde tiene membresía
   * activa.
   */
  async listForUser(userId: string, role: UserRole): Promise<MyRestaurantDto[]> {
    const memberCount = await this.prisma.restaurantMember.count({ where: { userId } });
    if (role === 'ADMIN' && memberCount === 0) {
      return this.listForSuperAdmin();
    }
    return this.listMine(userId);
  }

  async listForSuperAdmin(): Promise<MyRestaurantDto[]> {
    const restaurants = await this.prisma.restaurant.findMany({
      orderBy: { name: 'asc' },
    });
    return restaurants.map((r) => this.toMyRestaurantDto(r, null, null));
  }

  async findOne(id: string): Promise<RestaurantDto> {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) {
      throw new NotFoundException('Local no encontrado.');
    }
    return this.toDto(restaurant);
  }

  async create(dto: CreateRestaurantDto, actorId: string): Promise<RestaurantDto> {
    const slugExists = await this.prisma.restaurant.findUnique({ where: { slug: dto.slug } });
    if (slugExists) {
      throw new ConflictException('Ya existe un local con ese slug.');
    }

    const restaurant = await this.prisma.restaurant.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        address: dto.address ?? null,
        phone: dto.phone ?? null,
        primaryColor: dto.primaryColor ?? null,
        secondaryColor: dto.secondaryColor ?? null,
        logoUrl: dto.logoUrl ?? null,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'RESTAURANT_CREATED',
      entity: 'Restaurant',
      entityId: restaurant.id,
      metadata: { slug: restaurant.slug, name: restaurant.name },
    });

    return this.toDto(restaurant);
  }

  async update(
    id: string,
    dto: UpdateRestaurantDto,
    actorId: string,
  ): Promise<RestaurantDto> {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) {
      throw new NotFoundException('Local no encontrado.');
    }

    if (dto.slug && dto.slug !== restaurant.slug) {
      const slugExists = await this.prisma.restaurant.findUnique({ where: { slug: dto.slug } });
      if (slugExists) {
        throw new ConflictException('Ya existe un local con ese slug.');
      }
    }

    const data: Prisma.RestaurantUpdateInput = {};
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.primaryColor !== undefined) data.primaryColor = dto.primaryColor;
    if (dto.secondaryColor !== undefined) data.secondaryColor = dto.secondaryColor;
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl;
    if (dto.active !== undefined) data.active = dto.active;

    const updated = await this.prisma.restaurant.update({ where: { id }, data });

    await this.audit.record({
      userId: actorId,
      action: 'RESTAURANT_UPDATED',
      entity: 'Restaurant',
      entityId: id,
      metadata: { changed: Object.keys(data) },
    });

    return this.toDto(updated);
  }

  // ----------------------------------------------------------------------
  // Membresías — solo ADMIN
  // ----------------------------------------------------------------------

  async listMembers(restaurantId: string): Promise<RestaurantMemberDto[]> {
    const members = await this.prisma.restaurantMember.findMany({
      where: { restaurantId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: [{ active: 'desc' }, { user: { name: 'asc' } }],
    });
    return members.map((m) => this.toMemberDto(m));
  }

  async addMember(
    restaurantId: string,
    dto: CreateMemberDto,
    actorId: string,
  ): Promise<RestaurantMemberDto> {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) {
      throw new NotFoundException('Local no encontrado.');
    }
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const member = await this.prisma.restaurantMember.upsert({
      where: { userId_restaurantId: { userId: dto.userId, restaurantId } },
      update: { role: dto.role, active: true },
      create: { userId: dto.userId, restaurantId, role: dto.role, active: true },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await this.audit.record({
      userId: actorId,
      action: 'MEMBER_ADDED',
      entity: 'RestaurantMember',
      entityId: member.id,
      restaurantId,
      metadata: { userId: dto.userId, role: dto.role },
    });

    return this.toMemberDto(member);
  }

  async updateMember(
    restaurantId: string,
    memberId: string,
    dto: UpdateMemberDto,
    actorId: string,
  ): Promise<RestaurantMemberDto> {
    const member = await this.prisma.restaurantMember.findUnique({ where: { id: memberId } });
    if (!member || member.restaurantId !== restaurantId) {
      throw new NotFoundException('Membresía no encontrada.');
    }

    const data: Prisma.RestaurantMemberUpdateInput = {};
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.active !== undefined) data.active = dto.active;

    const updated = await this.prisma.restaurantMember.update({
      where: { id: memberId },
      data,
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await this.audit.record({
      userId: actorId,
      action: 'MEMBER_UPDATED',
      entity: 'RestaurantMember',
      entityId: memberId,
      restaurantId,
      metadata: { changed: Object.keys(data) },
    });

    return this.toMemberDto(updated);
  }

  // ----------------------------------------------------------------------
  // Marca efectiva: override del local con fallback al tenant
  // ----------------------------------------------------------------------

  async getTheme(restaurantId: string): Promise<RestaurantThemeDto> {
    const [restaurant, settings] = await Promise.all([
      this.prisma.restaurant.findUnique({ where: { id: restaurantId } }),
      this.prisma.restaurantSettings.findFirst(),
    ]);
    if (!restaurant) {
      throw new NotFoundException('Local no encontrado.');
    }
    return {
      name: settings?.name ?? 'Mi Restaurante',
      logoUrl: restaurant.logoUrl ?? settings?.logoUrl ?? null,
      primaryColor: restaurant.primaryColor ?? settings?.primaryColor ?? '#E63946',
      secondaryColor: restaurant.secondaryColor ?? settings?.secondaryColor ?? '#1D3557',
    };
  }

  // ----------------------------------------------------------------------
  // Mapeadores
  // ----------------------------------------------------------------------

  private toDto(r: Restaurant): RestaurantDto {
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      address: r.address,
      phone: r.phone,
      logoUrl: r.logoUrl,
      primaryColor: r.primaryColor,
      secondaryColor: r.secondaryColor,
      active: r.active,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  private toMyRestaurantDto(
    r: Restaurant,
    role: UserRole | null,
    memberActive: boolean | null,
  ): MyRestaurantDto {
    return { ...this.toDto(r), role, memberActive };
  }

  private toMemberDto(
    m: RestaurantMember & { user: Pick<User, 'id' | 'name' | 'email'> },
  ): RestaurantMemberDto {
    return {
      id: m.id,
      userId: m.userId,
      userName: m.user.name,
      userEmail: m.user.email,
      restaurantId: m.restaurantId,
      role: m.role as UserRole,
      active: m.active,
      createdAt: m.createdAt.toISOString(),
    };
  }
}
