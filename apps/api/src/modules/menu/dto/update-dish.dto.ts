import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateDishDto {
  @ApiPropertyOptional({ example: 'Lomo saltado' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  name?: string;

  @ApiPropertyOptional({ example: 'Plato tradicional peruano.' })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto.' })
  description?: string;

  @ApiPropertyOptional({ example: 32.5 })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio debe ser un número con máximo 2 decimales.' },
  )
  @Min(0, { message: 'El precio no puede ser negativo.' })
  price?: number;

  @ApiPropertyOptional({ example: '0b2c8e4a-1234-4f56-8a90-abcdef012345' })
  @IsOptional()
  @IsUUID(undefined, { message: 'La categoría no es válida.' })
  categoryId?: string;

  @ApiPropertyOptional({ example: 'https://cdn.restaurante.pe/lomo.jpg' })
  @IsOptional()
  @IsString({ message: 'La imagen debe ser una URL en texto.' })
  imageUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso.' })
  active?: boolean;
}
