import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CashSessionDto } from '@restaurante/shared-types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CashRegisterService } from './cash-register.service';
import { OpenSessionDto } from './dto/open-session.dto';
import { CreateMovementDto } from './dto/create-movement.dto';
import { CloseSessionDto } from './dto/close-session.dto';

@ApiTags('Caja')
@ApiBearerAuth()
@Controller('cash-register')
export class CashRegisterController {
  constructor(private readonly cash: CashRegisterService) {}

  @Get('current')
  @ApiOperation({ summary: 'Obtener la caja abierta actual' })
  current(): Promise<CashSessionDto | null> {
    return this.cash.current();
  }

  @Get('history')
  @ApiOperation({ summary: 'Historial de cajas cerradas' })
  history(@Query('limit') limit = '50'): Promise<CashSessionDto[]> {
    return this.cash.history(parseInt(limit, 10) || 50);
  }

  @Post('open')
  @ApiOperation({ summary: 'Abrir caja con monto inicial' })
  open(@Body() dto: OpenSessionDto, @CurrentUser('id') actorId: string): Promise<CashSessionDto> {
    return this.cash.open(dto, actorId);
  }

  @Post('movements')
  @ApiOperation({ summary: 'Registrar ingreso o egreso de caja' })
  addMovement(@Body() dto: CreateMovementDto, @CurrentUser('id') actorId: string): Promise<CashSessionDto> {
    return this.cash.addMovement(dto, actorId);
  }

  @Post('close')
  @ApiOperation({ summary: 'Cerrar caja y calcular diferencia' })
  close(@Body() dto: CloseSessionDto, @CurrentUser('id') actorId: string): Promise<CashSessionDto> {
    return this.cash.close(dto, actorId);
  }
}
