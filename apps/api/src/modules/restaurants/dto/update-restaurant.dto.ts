import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsHexColor,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateRestaurantDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  @Matches(/^[a-z0-9-]+$/, { message: 'Solo minúsculas, números y guiones.' })
  slug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

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

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsHexColor()
  secondaryColor?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
