import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MinLength, Min } from 'class-validator';

export class CreateBillGroupDto {
  @ApiProperty({ example: 'Cliente A', description: 'Etiqueta libre sin datos personales' })
  @IsString()
  @MinLength(1, { message: 'El nombre del grupo es obligatorio.' })
  name!: string;

  @ApiPropertyOptional({ description: 'Monto fijo a pagar (modo partes iguales)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto no es válido.' })
  @Min(0, { message: 'El monto no puede ser negativo.' })
  fixedAmount?: number;
}
