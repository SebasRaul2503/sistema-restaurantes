import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { UserDto, UserRole } from '@restaurante/shared-types';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(): Promise<UserDto[]> {
    const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    return users.map((u) => this.toDto(u));
  }

  async findOne(id: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    return this.toDto(user);
  }

  async create(dto: CreateUserDto, actorId: string): Promise<UserDto> {
    const email = this.normalizeEmail(dto.email);
    const username = this.normalizeUsername(dto.username);

    if (!email && !username) {
      throw new BadRequestException('Debes proporcionar al menos un email o username.');
    }

    await this.assertNoDuplicate(email, username);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        name: dto.name,
        role: dto.role,
        passwordHash,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: user.id,
      metadata: { identifier: email ?? username, role: user.role },
    });

    return this.toDto(user);
  }

  async update(id: string, dto: UpdateUserDto, actorId: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const data: Record<string, unknown> = {};
    const identifierChanged: string[] = [];

    if (dto.email !== undefined) {
      const email = this.normalizeEmail(dto.email);
      // Si el usuario actual solo tiene email y se cambia a vacío,
      // debe tener username (no se puede quedar sin identificador).
      if (!email && !user.username && dto.username === undefined) {
        throw new BadRequestException(
          'No puedes quitar el email si el usuario no tiene username.',
        );
      }
      data.email = email;
      identifierChanged.push('email');
    }

    if (dto.username !== undefined) {
      const username = this.normalizeUsername(dto.username);
      if (!username && !user.email && dto.email === undefined) {
        throw new BadRequestException(
          'No puedes quitar el username si el usuario no tiene email.',
        );
      }
      data.username = username;
      identifierChanged.push('username');
    }

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    if (Object.keys(data).length === 0) {
      return this.toDto(user);
    }

    await this.assertNoDuplicate(data.email as string | null, data.username as string | null, id);

    const updated = await this.prisma.user.update({ where: { id }, data });

    await this.audit.record({
      userId: actorId,
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: id,
      metadata: { changed: Object.keys(data) },
    });

    return this.toDto(updated);
  }

  async deactivate(id: string, actorId: string): Promise<UserDto> {
    if (id === actorId) {
      throw new BadRequestException('No puede desactivar su propia cuenta.');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    const updated = await this.prisma.user.update({ where: { id }, data: { active: false } });
    await this.audit.record({
      userId: actorId,
      action: 'USER_DEACTIVATED',
      entity: 'User',
      entityId: id,
    });
    return this.toDto(updated);
  }

  private normalizeEmail(value: string | undefined): string | null {
    if (value === undefined) return null;
    const trimmed = value.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeUsername(value: string | undefined): string | null {
    if (value === undefined) return null;
    const trimmed = value.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : null;
  }

  private async assertNoDuplicate(
    email: string | null | undefined,
    username: string | null | undefined,
    excludeUserId?: string,
  ): Promise<void> {
    const checks: Promise<{ kind: 'email' | 'username'; exists: boolean }>[] = [];
    if (email) {
      checks.push(
        this.prisma.user
          .findUnique({ where: { email }, select: { id: true } })
          .then((u) => ({ kind: 'email' as const, exists: !!u && u.id !== excludeUserId })),
      );
    }
    if (username) {
      checks.push(
        this.prisma.user
          .findUnique({ where: { username }, select: { id: true } })
          .then((u) => ({ kind: 'username' as const, exists: !!u && u.id !== excludeUserId })),
      );
    }
    const results = await Promise.all(checks);
    const dup = results.find((r) => r.exists);
    if (dup) {
      const label = dup.kind === 'email' ? 'correo' : 'username';
      throw new ConflictException(`Ya existe un usuario con ese ${label}.`);
    }
  }

  private toDto(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role as UserRole,
      active: user.active,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
