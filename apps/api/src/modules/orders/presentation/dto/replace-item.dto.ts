import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/**
 * Reemplazo de un plato ENTREGADO (protección de platos entregados). El original
 * se conserva marcado como modificado; este DTO describe el plato corregido.
 */
export class ReplaceItemDto {
  @ApiPropertyOptional({ description: 'Plato del reemplazo (por defecto, el mismo)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'El plato indicado no es válido.' })
  dishId?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt({ message: 'La cantidad debe ser un número entero.' })
  @Min(1, { message: 'La cantidad debe ser al menos 1.' })
  quantity?: number;

  @ApiPropertyOptional({ example: 'Corrección: sin ají' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
