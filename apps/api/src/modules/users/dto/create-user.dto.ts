import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@restaurante/shared-types';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'mesero@restaurante.pe' })
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  email!: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @MinLength(2, { message: 'El nombre es obligatorio.' })
  name!: string;

  @ApiProperty({ example: 'Clave1234' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.OPERATOR })
  @IsEnum(UserRole, { message: 'El rol no es válido.' })
  role!: UserRole;
}
