import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DishDto, MenuCategoryDto, UserRole } from '@restaurante/shared-types';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentRestaurant } from '../../common/decorators/current-restaurant.decorator';
import { MenuService } from './menu.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateDishDto } from './dto/create-dish.dto';
import { UpdateDishDto } from './dto/update-dish.dto';

@ApiTags('Carta')
@ApiBearerAuth()
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // --------------------------------------------------------------------
  // Categorías
  // --------------------------------------------------------------------

  @Get('categories')
  @ApiOperation({ summary: 'Listar categorías del local activo' })
  listCategories(@CurrentRestaurant('id') restaurantId: string): Promise<MenuCategoryDto[]> {
    return this.menuService.listCategories(restaurantId);
  }

  @Post('categories')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear una categoría' })
  createCategory(
    @Body() dto: CreateCategoryDto,
    @CurrentUser('id') actorId: string,
    @CurrentRestaurant('id') restaurantId: string,
  ): Promise<MenuCategoryDto> {
    return this.menuService.createCategory(dto, actorId, restaurantId);
  }

  @Patch('categories/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar una categoría' })
  updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser('id') actorId: string,
    @CurrentRestaurant('id') restaurantId: string,
  ): Promise<MenuCategoryDto> {
    return this.menuService.updateCategory(id, dto, actorId, restaurantId);
  }

  @Delete('categories/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una categoría' })
  deleteCategory(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
    @CurrentRestaurant('id') restaurantId: string,
  ): Promise<void> {
    return this.menuService.deleteCategory(id, actorId, restaurantId);
  }

  // --------------------------------------------------------------------
  // Platos
  // --------------------------------------------------------------------

  @Get('dishes')
  @ApiOperation({ summary: 'Listar platos del local activo' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  listDishes(
    @CurrentRestaurant('id') restaurantId: string,
    @Query('categoryId') categoryId?: string,
    @Query('active') active?: string,
  ): Promise<DishDto[]> {
    return this.menuService.listDishes({
      restaurantId,
      categoryId,
      active: this.parseBoolean(active),
    });
  }

  @Get('dishes/:id')
  @ApiOperation({ summary: 'Obtener un plato' })
  getDish(
    @Param('id') id: string,
    @CurrentRestaurant('id') restaurantId: string,
  ): Promise<DishDto> {
    return this.menuService.getDish(id, restaurantId);
  }

  @Post('dishes')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear un plato' })
  createDish(
    @Body() dto: CreateDishDto,
    @CurrentUser('id') actorId: string,
    @CurrentRestaurant('id') restaurantId: string,
  ): Promise<DishDto> {
    return this.menuService.createDish(dto, actorId, restaurantId);
  }

  @Patch('dishes/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar un plato' })
  updateDish(
    @Param('id') id: string,
    @Body() dto: UpdateDishDto,
    @CurrentUser('id') actorId: string,
    @CurrentRestaurant('id') restaurantId: string,
  ): Promise<DishDto> {
    return this.menuService.updateDish(id, dto, actorId, restaurantId);
  }

  @Delete('dishes/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Desactivar un plato' })
  deleteDish(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
    @CurrentRestaurant('id') restaurantId: string,
  ): Promise<DishDto> {
    return this.menuService.deleteDish(id, actorId, restaurantId);
  }

  private parseBoolean(value?: string): boolean | undefined {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  }
}
