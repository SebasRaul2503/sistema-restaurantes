import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RestaurantSettingsDto, UserRole } from '@restaurante/shared-types';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RestaurantSettingsService } from './restaurant-settings.service';
import { UpdateRestaurantSettingsDto } from './dto/update-restaurant-settings.dto';

@ApiTags('Configuración')
@ApiBearerAuth()
@Controller('settings')
export class RestaurantSettingsController {
  constructor(
    private readonly restaurantSettingsService: RestaurantSettingsService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Obtener configuración del restaurante' })
  get(): Promise<RestaurantSettingsDto> {
    return this.restaurantSettingsService.get();
  }

  @Roles(UserRole.ADMIN)
  @Patch()
  @ApiOperation({ summary: 'Actualizar configuración del restaurante' })
  update(
    @Body() dto: UpdateRestaurantSettingsDto,
    @CurrentUser('id') actorId: string,
  ): Promise<RestaurantSettingsDto> {
    return this.restaurantSettingsService.update(dto, actorId);
  }
}
