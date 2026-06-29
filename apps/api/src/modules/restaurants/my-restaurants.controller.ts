import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MyRestaurantDto } from '@restaurante/shared-types';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { SkipRestaurant } from '../../common/decorators/skip-restaurant.decorator';
import { RestaurantsService } from './restaurants.service';

@ApiTags('Mis locales')
@ApiBearerAuth()
@Controller('my-restaurants')
export class MyRestaurantsController {
  constructor(private readonly restaurants: RestaurantsService) {}

  @Get()
  @SkipRestaurant()
  @ApiOperation({ summary: 'Locales disponibles para el usuario autenticado' })
  list(@CurrentUser() user: RequestUser): Promise<MyRestaurantDto[]> {
    return this.restaurants.listForUser(user.id, user.role);
  }
}
