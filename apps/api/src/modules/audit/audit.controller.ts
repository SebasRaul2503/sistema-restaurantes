import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditLogDto, UserRole } from '@restaurante/shared-types';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../core/prisma/prisma.service';

/** Consulta de la bitácora de auditoría. Solo administradores. */
@ApiTags('Auditoría')
@ApiBearerAuth()
@Controller('audit')
@Roles(UserRole.ADMIN)
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Listar registros de auditoría (más recientes primero)' })
  async findAll(
    @Query('limit') limit = '100',
    @Query('entity') entity?: string,
  ): Promise<AuditLogDto[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: entity ? { entity } : undefined,
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit, 10) || 100, 500),
    });

    return logs.map((log) => ({
      id: log.id,
      userName: log.user?.name ?? null,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      metadata: (log.metadata as Record<string, unknown> | null) ?? null,
      createdAt: log.createdAt.toISOString(),
    }));
  }
}
