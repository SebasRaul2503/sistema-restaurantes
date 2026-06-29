import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { MyRestaurantDto, RestaurantDto, RestaurantMemberDto, RestaurantThemeDto } from '@restaurante/shared-types';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SkipRestaurant } from '../../common/decorators/skip-restaurant.decorator';
import { UserRole } from '@restaurante/shared-types';
import { RestaurantsService } from './restaurants.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@ApiTags('Locales')
@ApiBearerAuth()
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurants: RestaurantsService) {}

  // ----------------------------------------------------------------------
  // Gestión de locales (solo ADMIN)
  // ----------------------------------------------------------------------

  @Get()
  @Roles(UserRole.ADMIN)
  @SkipRestaurant()
  @ApiOperation({ summary: 'Listar todos los locales (ADMIN)' })
  listAll(): Promise<RestaurantDto[]> {
    return this.restaurants.listAll();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @SkipRestaurant()
  @ApiOperation({ summary: 'Crear un local (ADMIN)' })
  create(
    @Body() dto: CreateRestaurantDto,
    @CurrentUser() user: RequestUser,
  ): Promise<RestaurantDto> {
    return this.restaurants.create(dto, user.id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @SkipRestaurant()
  @ApiOperation({ summary: 'Obtener un local por id (ADMIN)' })
  findOne(@Param('id') id: string): Promise<RestaurantDto> {
    return this.restaurants.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @SkipRestaurant()
  @ApiOperation({ summary: 'Actualizar un local (ADMIN)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRestaurantDto,
    @CurrentUser() user: RequestUser,
  ): Promise<RestaurantDto> {
    return this.restaurants.update(id, dto, user.id);
  }

  // ----------------------------------------------------------------------
  // Membresías
  // ----------------------------------------------------------------------

  @Get(':id/members')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar miembros de un local (ADMIN)' })
  @ApiParam({ name: 'id', description: 'id del local' })
  listMembers(@Param('id') id: string): Promise<RestaurantMemberDto[]> {
    return this.restaurants.listMembers(id);
  }

  @Post(':id/members')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Agregar o reasignar un miembro (ADMIN)' })
  addMember(
    @Param('id') id: string,
    @Body() dto: CreateMemberDto,
    @CurrentUser() user: RequestUser,
  ): Promise<RestaurantMemberDto> {
    return this.restaurants.addMember(id, dto, user.id);
  }

  @Patch(':id/members/:memberId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar rol/estado de un miembro (ADMIN)' })
  updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberDto,
    @CurrentUser() user: RequestUser,
  ): Promise<RestaurantMemberDto> {
    return this.restaurants.updateMember(id, memberId, dto, user.id);
  }

  // ----------------------------------------------------------------------
  // Marca efectiva del local
  // ----------------------------------------------------------------------

  @Get(':id/theme')
  @SkipRestaurant()
  @ApiOperation({ summary: 'Marca visual efectiva del local (override o tenant)' })
  getTheme(@Param('id') id: string): Promise<RestaurantThemeDto> {
    return this.restaurants.getTheme(id);
  }
}

