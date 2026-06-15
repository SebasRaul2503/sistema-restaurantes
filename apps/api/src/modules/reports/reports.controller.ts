import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  DashboardDto,
  RevenueByMethodDto,
  RevenuePointDto,
  TopDishDto,
  TopTableDto,
  UserRole,
} from '@restaurante/shared-types';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReportsService } from './reports.service';

type RevenuePeriod = 'daily' | 'weekly' | 'monthly';

@ApiTags('Reportes')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Resumen general del restaurante (panel principal)' })
  dashboard(): Promise<DashboardDto> {
    return this.reportsService.dashboard();
  }

  @Get('revenue')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Ingresos agrupados por día, semana o mes' })
  revenue(
    @Query('period') period: RevenuePeriod = 'daily',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<RevenuePointDto[]> {
    return this.reportsService.revenue(period, from, to);
  }

  @Get('top-dishes')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Platos más vendidos en el período' })
  topDishes(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ): Promise<TopDishDto[]> {
    return this.reportsService.topDishes(from, to, this.parseLimit(limit));
  }

  @Get('top-tables')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mesas con mayor facturación en el período' })
  topTables(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ): Promise<TopTableDto[]> {
    return this.reportsService.topTables(from, to, this.parseLimit(limit));
  }

  @Get('payments-by-method')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Ingresos desglosados por método de pago' })
  paymentsByMethod(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<RevenueByMethodDto[]> {
    return this.reportsService.paymentsByMethod(from, to);
  }

  /** Convierte el query `limit` a número válido; por defecto 10. */
  private parseLimit(limit?: string): number {
    const parsed = Number(limit);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 10;
  }
}
