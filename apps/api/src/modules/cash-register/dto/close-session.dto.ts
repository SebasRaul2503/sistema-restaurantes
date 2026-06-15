import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CloseSessionDto {
  @ApiProperty({ example: 350, description: 'Monto real contado al cierre' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto no es válido.' })
  @Min(0, { message: 'El monto no puede ser negativo.' })
  actualAmount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
