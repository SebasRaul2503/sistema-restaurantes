import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderDto, OrderSummaryDto } from '@restaurante/shared-types';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrdersService } from '../application/orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddOrderItemDto } from './dto/add-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { ReplaceItemDto } from './dto/replace-item.dto';

@ApiTags('Pedidos')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get('active')
  @ApiOperation({ summary: 'Listar pedidos activos (resumen)' })
  findActive(): Promise<OrderSummaryDto[]> {
    return this.orders.findActive();
  }

  @Get('table/:tableId/active')
  @ApiOperation({ summary: 'Obtener el pedido activo de una mesa' })
  findByTable(@Param('tableId') tableId: string): Promise<OrderDto | null> {
    return this.orders.findActiveByTable(tableId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un pedido con detalle' })
  findOne(@Param('id') id: string): Promise<OrderDto> {
    return this.orders.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Abrir un pedido en una mesa' })
  create(@Body() dto: CreateOrderDto, @CurrentUser('id') actorId: string): Promise<OrderDto> {
    return this.orders.create(dto, actorId);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Agregar un plato al pedido' })
  addItem(
    @Param('id') id: string,
    @Body() dto: AddOrderItemDto,
    @CurrentUser('id') actorId: string,
  ): Promise<OrderDto> {
    return this.orders.addItem(id, dto, actorId);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Editar un plato no entregado' })
  updateItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateOrderItemDto,
    @CurrentUser('id') actorId: string,
  ): Promise<OrderDto> {
    return this.orders.updateItem(itemId, dto, actorId);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Eliminar un plato no entregado' })
  removeItem(@Param('itemId') itemId: string, @CurrentUser('id') actorId: string): Promise<OrderDto> {
    return this.orders.removeItem(itemId, actorId);
  }

  @Post('items/:itemId/replace')
  @ApiOperation({ summary: 'Corregir un plato entregado (crea un reemplazo)' })
  replaceItem(
    @Param('itemId') itemId: string,
    @Body() dto: ReplaceItemDto,
    @CurrentUser('id') actorId: string,
  ): Promise<OrderDto> {
    return this.orders.replaceDeliveredItem(itemId, dto, actorId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Anular un pedido sin pagos' })
  cancel(@Param('id') id: string, @CurrentUser('id') actorId: string): Promise<OrderDto> {
    return this.orders.cancel(id, actorId);
  }
}
