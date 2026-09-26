import { Controller, DefaultValuePipe, Get, ParseEnumPipe, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PaginatedOrdersDto, UserRole } from '@restaurante/shared-types';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../../common/decorators/current-user.decorator';
import { CurrentRestaurant } from '../../../common/decorators/current-restaurant.decorator';
import { SkipRestaurant } from '../../../common/decorators/skip-restaurant.decorator';
import { OrdersHistoryService } from '../application/orders-history.service';

@ApiTags('Historial de pedidos')
@ApiBearerAuth()
@Controller('orders/history')
export class OrdersHistoryController {
  constructor(private readonly history: OrdersHistoryService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @SkipRestaurant()
  @ApiOperation({
    summary:
      'Historial de pedidos cerrados/anulados (solo ADMIN). Snapshots de precio y nombre.',
  })
  @ApiQuery({ name: 'from', required: false, description: 'Fecha civil inicio (yyyy-MM-dd, America/Lima)' })
  @ApiQuery({ name: 'to', required: false, description: 'Fecha civil fin (yyyy-MM-dd, America/Lima)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['cerrados', 'anulados', 'todos'],
    description: 'Default: cerrados',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Búsqueda por código, mesa, plato o usuario',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Default 50, max 200' })
  list(
    @CurrentRestaurant('id') restaurantId: string | null,
    @CurrentUser() user: RequestUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status', new DefaultValuePipe('cerrados'), new ParseEnumPipe(['cerrados', 'anulados', 'todos']))
    status?: 'cerrados' | 'anulados' | 'todos',
    @Query('q') q?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe) pageSize?: number,
  ): Promise<PaginatedOrdersDto> {
    return this.history.list(
      restaurantId,
      { from, to, status, q, page, pageSize },
      user.role,
    );
  }
}
