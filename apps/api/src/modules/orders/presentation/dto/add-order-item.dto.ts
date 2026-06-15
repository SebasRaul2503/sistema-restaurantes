import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class AddOrderItemDto {
  @ApiProperty({ description: 'Plato a agregar' })
  @IsUUID(undefined, { message: 'El plato indicado no es válido.' })
  dishId!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt({ message: 'La cantidad debe ser un número entero.' })
  @Min(1, { message: 'La cantidad debe ser al menos 1.' })
  quantity!: number;

  @ApiPropertyOptional({ example: 'Sin cebolla' })
  @IsOptional()
  @IsString()
  notes?: string;
}
