import { ApiProperty } from '@nestjs/swagger';
import { CashMovementType } from '@restaurante/shared-types';
import { IsEnum, IsNumber, IsString, MinLength, Min } from 'class-validator';

export class CreateMovementDto {
  @ApiProperty({ enum: CashMovementType })
  @IsEnum(CashMovementType, { message: 'El tipo de movimiento no es válido.' })
  type!: CashMovementType;

  @ApiProperty({ example: 25.5 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto no es válido.' })
  @Min(0.01, { message: 'El monto debe ser mayor a cero.' })
  amount!: number;

  @ApiProperty({ example: 'Compra de gaseosas' })
  @IsString()
  @MinLength(2, { message: 'La descripción es obligatoria.' })
  description!: string;
}
