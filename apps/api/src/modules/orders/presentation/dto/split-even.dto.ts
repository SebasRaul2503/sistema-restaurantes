import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** División en partes iguales: genera `parts` grupos de cuenta con monto fijo. */
export class SplitEvenDto {
  @ApiProperty({ example: 2, minimum: 2, maximum: 20 })
  @IsInt({ message: 'El número de partes debe ser entero.' })
  @Min(2, { message: 'Debe dividir en al menos 2 partes.' })
  @Max(20, { message: 'No se puede dividir en más de 20 partes.' })
  parts!: number;

  @ApiPropertyOptional({ type: [String], description: 'Nombres opcionales de cada parte' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  names?: string[];
}
