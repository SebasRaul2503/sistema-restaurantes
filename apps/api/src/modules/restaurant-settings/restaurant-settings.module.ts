import { Module } from '@nestjs/common';
import { RestaurantSettingsController } from './restaurant-settings.controller';
import { RestaurantSettingsService } from './restaurant-settings.service';

@Module({
  controllers: [RestaurantSettingsController],
  providers: [RestaurantSettingsService],
  exports: [RestaurantSettingsService],
})
export class RestaurantSettingsModule {}
