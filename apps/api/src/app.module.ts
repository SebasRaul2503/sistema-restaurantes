import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { PrismaModule } from './core/prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { LocalGuard } from './common/guards/local.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CashRegisterModule } from './modules/cash-register/cash-register.module';
import { KitchenModule } from './modules/kitchen/kitchen.module';
import { MenuModule } from './modules/menu/menu.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RestaurantSettingsModule } from './modules/restaurant-settings/restaurant-settings.module';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { TablesModule } from './modules/tables/tables.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    RestaurantSettingsModule,
    RestaurantsModule,
    TablesModule,
    MenuModule,
    OrdersModule,
    KitchenModule,
    PaymentsModule,
    CashRegisterModule,
    ReportsModule,
  ],
  providers: [
    // Orden: autenticación (resuelve request.user) → scoping por local → RBAC.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: LocalGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
