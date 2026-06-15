import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class OpenSessionDto {
  @ApiProperty({ example: 100, description: 'Monto inicial en caja' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto no es válido.' })
  @Min(0, { message: 'El monto inicial no puede ser negativo.' })
  openingAmount!: number;
}
