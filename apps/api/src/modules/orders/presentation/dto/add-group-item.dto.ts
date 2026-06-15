import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class AddGroupItemDto {
  @ApiProperty()
  @IsUUID(undefined, { message: 'El ítem indicado no es válido.' })
  orderItemId!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt({ message: 'La cantidad debe ser entera.' })
  @Min(1, { message: 'La cantidad debe ser al menos 1.' })
  quantity!: number;
}
