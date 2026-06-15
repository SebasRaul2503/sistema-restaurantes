import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';

const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;

export class UpdateRestaurantSettingsDto {
  @ApiPropertyOptional({ description: 'Nombre del restaurante' })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser un texto.' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  name?: string;

  @ApiPropertyOptional({
    description: 'URL o data URL del logo (puede ser una cadena larga)',
  })
  @IsOptional()
  @IsString({ message: 'El logo debe ser un texto.' })
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Color primario en formato hexadecimal (#RRGGBB)',
    example: '#E63946',
  })
  @IsOptional()
  @IsString({ message: 'El color primario debe ser un texto.' })
  @Matches(HEX_COLOR, {
    message: 'El color primario debe ser un hexadecimal válido (#RRGGBB).',
  })
  primaryColor?: string;

  @ApiPropertyOptional({
    description: 'Color secundario en formato hexadecimal (#RRGGBB)',
    example: '#1D3557',
  })
  @IsOptional()
  @IsString({ message: 'El color secundario debe ser un texto.' })
  @Matches(HEX_COLOR, {
    message: 'El color secundario debe ser un hexadecimal válido (#RRGGBB).',
  })
  secondaryColor?: string;

  @ApiPropertyOptional({ description: 'Dirección del restaurante' })
  @IsOptional()
  @IsString({ message: 'La dirección debe ser un texto.' })
  address?: string;

  @ApiPropertyOptional({ description: 'Teléfono de contacto' })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser un texto.' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Información del negocio (RUC, razón social, etc.)',
  })
  @IsOptional()
  @IsString({ message: 'La información del negocio debe ser un texto.' })
  businessInfo?: string;

  @ApiPropertyOptional({
    description: 'Moneda en formato ISO de 3 letras',
    example: 'PEN',
  })
  @IsOptional()
  @IsString({ message: 'La moneda debe ser un texto.' })
  @Length(3, 3, { message: 'La moneda debe tener exactamente 3 caracteres.' })
  currency?: string;
}
