import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderDto, PaymentDto } from '@restaurante/shared-types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('Pagos')
@ApiBearerAuth()
@Controller('orders/:orderId/payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pagos de un pedido' })
  list(@Param('orderId') orderId: string): Promise<PaymentDto[]> {
    return this.payments.listByOrder(orderId);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar un pago (parcial o combinado)' })
  register(
    @Param('orderId') orderId: string,
    @Body() dto: CreatePaymentDto,
    @CurrentUser('id') actorId: string,
  ): Promise<OrderDto> {
    return this.payments.register(orderId, dto, actorId);
  }
}
