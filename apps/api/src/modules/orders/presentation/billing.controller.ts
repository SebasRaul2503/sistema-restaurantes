import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderDto } from '@restaurante/shared-types';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CurrentRestaurant } from '../../../common/decorators/current-restaurant.decorator';
import { BillingService } from '../application/billing.service';
import { CreateBillGroupDto } from './dto/create-bill-group.dto';
import { SplitEvenDto } from './dto/split-even.dto';
import { SplitItemsDto } from './dto/split-items.dto';
import { AddGroupItemDto } from './dto/add-group-item.dto';

/** Endpoints de división de cuenta (split). Disponible para ambos roles. */
@ApiTags('División de cuenta')
@ApiBearerAuth()
@Controller()
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Post('orders/:id/split/even')
  @ApiOperation({ summary: 'Dividir la cuenta en partes iguales' })
  splitEven(
    @Param('id') id: string,
    @Body() dto: SplitEvenDto,
    @CurrentUser('id') actorId: string,
    @CurrentRestaurant('id') restaurantId: string,
  ): Promise<OrderDto> {
    return this.billing.splitEven(id, dto, actorId, restaurantId);
  }

  @Post('orders/:id/split/items')
  @ApiOperation({ summary: 'Dividir la cuenta por ítems seleccionados' })
  splitByItems(
    @Param('id') id: string,
    @Body() dto: SplitItemsDto,
    @CurrentUser('id') actorId: string,
    @CurrentRestaurant('id') restaurantId: string,
  ): Promise<OrderDto> {
    return this.billing.splitByItems(id, dto, actorId, restaurantId);
  }

  @Post('orders/:id/bill-groups')
  @ApiOperation({ summary: 'Crear un grupo de cuenta (escenario mixto)' })
  createGroup(
    @Param('id') id: string,
    @Body() dto: CreateBillGroupDto,
    @CurrentUser('id') actorId: string,
    @CurrentRestaurant('id') restaurantId: string,
  ): Promise<OrderDto> {
    return this.billing.createGroup(id, dto, actorId, restaurantId);
  }

  @Delete('orders/:id/split')
  @ApiOperation({ summary: 'Quitar la división de cuenta' })
  clearSplit(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
    @CurrentRestaurant('id') restaurantId: string,
  ): Promise<OrderDto> {
    return this.billing.clearSplit(id, actorId, restaurantId);
  }

  @Post('bill-groups/:groupId/items')
  @ApiOperation({ summary: 'Asignar un ítem a un grupo de cuenta' })
  addItemToGroup(
    @Param('groupId') groupId: string,
    @Body() dto: AddGroupItemDto,
    @CurrentUser('id') actorId: string,
    @CurrentRestaurant('id') restaurantId: string,
  ): Promise<OrderDto> {
    return this.billing.addItemToGroup(groupId, dto, actorId, restaurantId);
  }

  @Delete('bill-group-items/:groupItemId')
  @ApiOperation({ summary: 'Quitar un ítem de un grupo de cuenta' })
  removeGroupItem(
    @Param('groupItemId') groupItemId: string,
    @CurrentUser('id') actorId: string,
    @CurrentRestaurant('id') restaurantId: string,
  ): Promise<OrderDto> {
    return this.billing.removeGroupItem(groupItemId, actorId, restaurantId);
  }

  @Delete('bill-groups/:groupId')
  @ApiOperation({ summary: 'Eliminar un grupo de cuenta' })
  deleteGroup(
    @Param('groupId') groupId: string,
    @CurrentUser('id') actorId: string,
    @CurrentRestaurant('id') restaurantId: string,
  ): Promise<OrderDto> {
    return this.billing.deleteGroup(groupId, actorId, restaurantId);
  }
}
