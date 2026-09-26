import { ApiProperty } from '@nestjs/swagger';
import { IsHexColor, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class CreateRestaurantDto {
  @ApiProperty({ example: 'miraflores', description: 'Identificador URL-safe único' })
  @IsString()
  @Length(2, 50)
  @Matches(/^[a-z0-9-]+$/, { message: 'Solo minúsculas, números y guiones.' })
  slug!: string;

  @ApiProperty({ example: 'Ceviche House — Miraflores' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiProperty({ required: false, description: 'Override de la marca del tenant' })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsHexColor()
  secondaryColor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;
}
