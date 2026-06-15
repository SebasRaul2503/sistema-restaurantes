import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class SplitItemAssignmentDto {
  @ApiProperty()
  @IsUUID(undefined, { message: 'El ítem indicado no es válido.' })
  orderItemId!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt({ message: 'La cantidad debe ser entera.' })
  @Min(1, { message: 'La cantidad debe ser al menos 1.' })
  quantity!: number;
}

export class SplitGroupDto {
  @ApiProperty({ example: 'Cliente A' })
  @IsString()
  @MinLength(1, { message: 'El nombre del grupo es obligatorio.' })
  name!: string;

  @ApiProperty({ type: [SplitItemAssignmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitItemAssignmentDto)
  items!: SplitItemAssignmentDto[];
}

/** División por ítems seleccionados: reemplaza por completo los grupos del pedido. */
export class SplitItemsDto {
  @ApiProperty({ type: [SplitGroupDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe definir al menos un grupo.' })
  @ValidateNested({ each: true })
  @Type(() => SplitGroupDto)
  groups!: SplitGroupDto[];
}
