import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Table } from '@prisma/client';
import { TableDto, TableStatus } from '@restaurante/shared-types';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';

const DEFAULT_CAPACITY = 4;

@Injectable()
export class TablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(restaurantId: string): Promise<TableDto[]> {
    const tables = await this.prisma.table.findMany({
      where: { restaurantId },
      orderBy: { number: 'asc' },
    });
    return tables.map((t) => this.toDto(t));
  }

  async findOne(id: string, restaurantId: string): Promise<TableDto> {
    const table = await this.prisma.table.findFirst({ where: { id, restaurantId } });
    if (!table) {
      throw new NotFoundException('Mesa no encontrada.');
    }
    return this.toDto(table);
  }

  async create(dto: CreateTableDto, actorId: string, restaurantId: string): Promise<TableDto> {
    if (!restaurantId) {
      throw new BadRequestException('No se ha seleccionado un local activo.');
    }
    const existing = await this.prisma.table.findUnique({
      where: { restaurantId_number: { restaurantId, number: dto.number } },
    });
    if (existing) {
      throw new ConflictException('Ya existe una mesa con ese número en este local.');
    }

    const table = await this.prisma.table.create({
      data: {
        restaurantId,
        number: dto.number,
        name: dto.name ?? null,
        capacity: dto.capacity ?? DEFAULT_CAPACITY,
        posX: dto.posX ?? null,
        posY: dto.posY ?? null,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'TABLE_CREATED',
      entity: 'Table',
      entityId: table.id,
      restaurantId,
      metadata: { number: table.number, capacity: table.capacity },
    });

    return this.toDto(table);
  }

  async update(
    id: string,
    dto: UpdateTableDto,
    actorId: string,
    restaurantId: string,
  ): Promise<TableDto> {
    if (!restaurantId) {
      throw new BadRequestException('No se ha seleccionado un local activo.');
    }
    const table = await this.prisma.table.findFirst({ where: { id, restaurantId } });
    if (!table) {
      throw new NotFoundException('Mesa no encontrada.');
    }

    if (dto.number !== undefined && dto.number !== table.number) {
      const existing = await this.prisma.table.findUnique({
        where: { restaurantId_number: { restaurantId, number: dto.number } },
      });
      if (existing) {
        throw new ConflictException('Ya existe una mesa con ese número en este local.');
      }
    }

    const data: Prisma.TableUpdateInput = {};
    if (dto.number !== undefined) data.number = dto.number;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.capacity !== undefined) data.capacity = dto.capacity;
    if (dto.posX !== undefined) data.posX = dto.posX;
    if (dto.posY !== undefined) data.posY = dto.posY;
    if (dto.active !== undefined) data.active = dto.active;

    const updated = await this.prisma.table.update({ where: { id }, data });

    await this.audit.record({
      userId: actorId,
      action: 'TABLE_UPDATED',
      entity: 'Table',
      entityId: id,
      restaurantId,
      metadata: { changed: Object.keys(data) },
    });

    return this.toDto(updated);
  }

  async changeStatus(
    id: string,
    status: TableStatus,
    actorId: string,
    restaurantId: string,
  ): Promise<TableDto> {
    if (!restaurantId) {
      throw new BadRequestException('No se ha seleccionado un local activo.');
    }
    const table = await this.prisma.table.findFirst({ where: { id, restaurantId } });
    if (!table) {
      throw new NotFoundException('Mesa no encontrada.');
    }

    const updated = await this.prisma.table.update({ where: { id }, data: { status } });

    await this.audit.record({
      userId: actorId,
      action: 'TABLE_STATUS_CHANGED',
      entity: 'Table',
      entityId: id,
      restaurantId,
      metadata: { status },
    });

    return this.toDto(updated);
  }

  async remove(id: string, actorId: string, restaurantId: string): Promise<TableDto> {
    if (!restaurantId) {
      throw new BadRequestException('No se ha seleccionado un local activo.');
    }
    const table = await this.prisma.table.findFirst({ where: { id, restaurantId } });
    if (!table) {
      throw new NotFoundException('Mesa no encontrada.');
    }

    const updated = await this.prisma.table.update({ where: { id }, data: { active: false } });

    await this.audit.record({
      userId: actorId,
      action: 'TABLE_DEACTIVATED',
      entity: 'Table',
      entityId: id,
      restaurantId,
    });

    return this.toDto(updated);
  }

  private toDto(table: Table): TableDto {
    return {
      id: table.id,
      number: table.number,
      name: table.name,
      capacity: table.capacity,
      status: table.status as TableStatus,
      posX: table.posX,
      posY: table.posY,
      active: table.active,
    };
  }
}
