import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KitchenItemDto } from '@restaurante/shared-types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { KitchenService } from './kitchen.service';
import { ChangeItemStatusDto } from './dto/change-item-status.dto';

@ApiTags('Cocina')
@ApiBearerAuth()
@Controller('kitchen')
export class KitchenController {
  constructor(private readonly kitchen: KitchenService) {}

  @Get('queue')
  @ApiOperation({ summary: 'Cola de preparación de cocina' })
  queue(): Promise<KitchenItemDto[]> {
    return this.kitchen.queue();
  }

  @Patch('items/:itemId/status')
  @ApiOperation({ summary: 'Cambiar el estado de un plato' })
  changeStatus(
    @Param('itemId') itemId: string,
    @Body() dto: ChangeItemStatusDto,
    @CurrentUser('id') actorId: string,
  ): Promise<KitchenItemDto> {
    return this.kitchen.changeStatus(itemId, dto.status, actorId);
  }
}
