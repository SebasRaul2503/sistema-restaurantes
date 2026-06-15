import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateTableDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt({ message: 'El número de mesa debe ser un entero.' })
  @Min(1, { message: 'El número de mesa debe ser mayor o igual a 1.' })
  number?: number;

  @ApiPropertyOptional({ example: 'Terraza 1' })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser un texto.' })
  name?: string;

  @ApiPropertyOptional({ example: 4 })
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

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser un valor booleano.' })
  active?: boolean;
}
