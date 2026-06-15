import { Module } from '@nestjs/common';
import { OrdersService } from './application/orders.service';
import { BillingService } from './application/billing.service';
import { OrdersController } from './presentation/orders.controller';
import { BillingController } from './presentation/billing.controller';

@Module({
  controllers: [OrdersController, BillingController],
  providers: [OrdersService, BillingService],
  exports: [OrdersService],
})
export class OrdersModule {}
