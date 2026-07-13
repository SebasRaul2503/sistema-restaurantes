import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { UserRole } from '@restaurante/shared-types';

const USERNAME_RE = /^[a-z0-9_-]{3,30}$/;

export class CreateUserDto {
  @ApiProperty({
    example: 'mesero@restaurante.pe',
    required: false,
    description: 'Email. Al menos uno de email o username es obligatorio.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim().toLowerCase() : value,
  )
  email?: string;

  @ApiProperty({
    example: 'jperez',
    required: false,
    description:
      'Username (3-30 chars, lowercase, [a-z0-9_-]). Al menos uno de email o username es obligatorio.',
  })
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

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @MinLength(2, { message: 'El nombre es obligatorio.' })
  name!: string;

  @ApiProperty({ example: 'Clave1234' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.OPERATOR })
  @IsString()
  role!: UserRole;

  // Validación cross-field: al menos uno de email/username.
  @ValidateIf((o: CreateUserDto) => !o.email && !o.username, {
    message: 'Debes proporcionar al menos un email o username.',
  })
  _atLeastOne?: never;
}
