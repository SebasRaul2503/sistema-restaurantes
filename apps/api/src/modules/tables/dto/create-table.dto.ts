import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateTableDto {
  @ApiProperty({ example: 1 })
  @IsInt({ message: 'El número de mesa debe ser un entero.' })
  @Min(1, { message: 'El número de mesa debe ser mayor o igual a 1.' })
  number!: number;

  @ApiPropertyOptional({ example: 'Terraza 1' })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser un texto.' })
  name?: string;

  @ApiPropertyOptional({ example: 4, default: 4 })
  @IsOptional()
  @IsInt({ message: 'La capacidad debe ser un entero.' })
  @Min(1, { message: 'La capacidad debe ser mayor o igual a 1.' })
  capacity?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt({ message: 'La posición X debe ser un entero.' })
  posX?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt({ message: 'La posición Y debe ser un entero.' })
  posY?: number;
}
