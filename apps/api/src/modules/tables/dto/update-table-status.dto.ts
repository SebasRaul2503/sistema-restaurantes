import { ApiProperty } from '@nestjs/swagger';
import { TableStatus } from '@restaurante/shared-types';
import { IsEnum } from 'class-validator';

export class UpdateTableStatusDto {
  @ApiProperty({ enum: TableStatus, example: TableStatus.OCUPADA })
  @IsEnum(TableStatus, { message: 'El estado de la mesa no es válido.' })
  status!: TableStatus;
}
