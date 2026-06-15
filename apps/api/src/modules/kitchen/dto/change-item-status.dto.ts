import { ApiProperty } from '@nestjs/swagger';
import { OrderItemStatus } from '@restaurante/shared-types';
import { IsEnum } from 'class-validator';

export class ChangeItemStatusDto {
  @ApiProperty({ enum: OrderItemStatus })
  @IsEnum(OrderItemStatus, { message: 'El estado no es válido.' })
  status!: OrderItemStatus;
}
