import { Module } from '@nestjs/common';
import { OrdersService } from './application/orders.service';
import { OrdersHistoryService } from './application/orders-history.service';
import { BillingService } from './application/billing.service';
import { OrdersController } from './presentation/orders.controller';
import { OrdersHistoryController } from './presentation/orders-history.controller';
import { BillingController } from './presentation/billing.controller';

@Module({
  controllers: [OrdersHistoryController, OrdersController, BillingController],
  providers: [OrdersService, OrdersHistoryService, BillingService],
  exports: [OrdersService],
})
export class OrdersModule {}
