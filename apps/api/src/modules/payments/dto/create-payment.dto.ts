import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@restaurante/shared-types';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.YAPE })
  @IsEnum(PaymentMethod, { message: 'El método de pago no es válido.' })
  method!: PaymentMethod;

  @ApiProperty({ example: 50, description: 'Monto del pago en soles' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto no es válido.' })
  @Min(0.01, { message: 'El monto debe ser mayor a cero.' })
  amount!: number;

  @ApiPropertyOptional({ description: 'Grupo de cuenta al que aplica el pago (split)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'El grupo de cuenta no es válido.' })
  billGroupId?: string;

  @ApiPropertyOptional({ description: 'N.° de operación de Yape/Plin/tarjeta' })
  @IsOptional()
  @IsString()
  reference?: string;
}
