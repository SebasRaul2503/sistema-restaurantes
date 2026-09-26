import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { UserRole } from '@restaurante/shared-types';

const USERNAME_RE = /^[a-z0-9_-]{3,30}$/;

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim().toLowerCase() : value,
  )
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(USERNAME_RE, {
    message: 'Username debe tener 3-30 caracteres lowercase (a-z, 0-9, _ o -).',
  })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim().toLowerCase() : value,
  )
  username?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password?: string;

  @ApiProperty({ enum: UserRole, required: false })
  @IsOptional()
  @IsString()
  role?: UserRole;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  // Si vienen email o username vacíos (cadena vacía), NO se permite dejar
  // al usuario sin identificador. Si email y username son ambos null y no
  // se está actualizando el password/name/role/active, eso es válido (es
  // un PATCH parcial).
  @ValidateIf(
    (o: UpdateUserDto) =>
      o.email !== undefined &&
      (typeof o.email !== 'string' || o.email.trim() === '') &&
      o.username === undefined,
    { message: 'Si envías email vacío, debes proporcionar username.' },
  )
  _emailOrUsername?: never;
}
