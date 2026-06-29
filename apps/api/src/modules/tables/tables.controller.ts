import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TableDto, UserRole } from '@restaurante/shared-types';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentRestaurant } from '../../common/decorators/current-restaurant.decorator';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { UpdateTableStatusDto } from './dto/update-table-status.dto';

@ApiTags('Mesas')
@ApiBearerAuth()
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar mesas del local activo' })
  findAll(@CurrentRestaurant('id') restaurantId: string): Promise<TableDto[]> {
    return this.tablesService.findAll(restaurantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una mesa' })
  findOne(
    @Param('id') id: string,
    @CurrentRestaurant('id') restaurantId: string,
  ): Promise<TableDto> {
    return this.tablesService.findOne(id, restaurantId);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear una mesa' })
  create(
    @Body() dto: CreateTableDto,
    @CurrentUser('id') actorId: string,
    @CurrentRestaurant('id') restaurantId: string,
  ): Promise<TableDto> {
    return this.tablesService.create(dto, actorId, restaurantId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar una mesa' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTableDto,
    @CurrentUser('id') actorId: string,
    @CurrentRestaurant('id') restaurantId: string,
  ): Promise<TableDto> {
    return this.tablesService.update(id, dto, actorId, restaurantId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar el estado de una mesa' })
  changeStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTableStatusDto,
    @CurrentUser('id') actorId: string,
    @CurrentRestaurant('id') restaurantId: string,
  ): Promise<TableDto> {
    return this.tablesService.changeStatus(id, dto.status, actorId, restaurantId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Desactivar una mesa' })
  remove(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
    @CurrentRestaurant('id') restaurantId: string,
  ): Promise<TableDto> {
    return this.tablesService.remove(id, actorId, restaurantId);
  }
}
