import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

export interface AuditEntry {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Servicio de auditoría. Registra acciones sensibles (Ley N° 29733: trazabilidad
 * de accesos y operaciones). Acepta un cliente de transacción opcional para
 * registrar dentro de la misma transacción que la operación auditada.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(
    entry: AuditEntry,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    try {
      await client.auditLog.create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId ?? null,
          metadata: entry.metadata ?? undefined,
        },
      });
    } catch (error) {
      // La auditoría nunca debe romper la operación de negocio.
      this.logger.error(`No se pudo registrar auditoría: ${String(error)}`);
    }
  }
}
