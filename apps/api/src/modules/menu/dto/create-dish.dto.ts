import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDishDto {
  @ApiProperty({ example: 'Lomo saltado' })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  name!: string;

  @ApiPropertyOptional({ example: 'Plato tradicional peruano.' })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto.' })
  description?: string;

  @ApiProperty({ example: 32.5 })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio debe ser un número con máximo 2 decimales.' },
  )
  @Min(0, { message: 'El precio no puede ser negativo.' })
  price!: number;

  @ApiProperty({ example: '0b2c8e4a-1234-4f56-8a90-abcdef012345' })
  @IsUUID(undefined, { message: 'La categoría no es válida.' })
  categoryId!: string;

  @ApiPropertyOptional({ example: 'https://cdn.restaurante.pe/lomo.jpg' })
  @IsOptional()
  @IsString({ message: 'La imagen debe ser una URL en texto.' })
  imageUrl?: string;
}
