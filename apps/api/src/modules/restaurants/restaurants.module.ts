import { Module } from '@nestjs/common';
import { RestaurantsController } from './restaurants.controller';
import { MyRestaurantsController } from './my-restaurants.controller';
import { RestaurantsService } from './restaurants.service';

@Module({
  controllers: [RestaurantsController, MyRestaurantsController],
  providers: [RestaurantsService],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
