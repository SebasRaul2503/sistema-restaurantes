import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'admin@restaurante.pe',
    description: 'Email o username. El backend decide según el formato.',
  })
  @IsString({ message: 'El identificador debe ser un texto.' })
  @MinLength(3, { message: 'El identificador debe tener al menos 3 caracteres.' })
  @MaxLength(255)
  identifier!: string;

  @ApiProperty({ example: 'Admin1234' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password!: string;
}
