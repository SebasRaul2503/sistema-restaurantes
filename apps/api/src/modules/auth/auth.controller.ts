import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoginResponse, MeResponse } from '@restaurante/shared-types';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { SkipRestaurant } from '../../common/decorators/skip-restaurant.decorator';
import { RequestRestaurant } from '../../common/decorators/current-restaurant.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión y obtener tokens' })
  login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto.email, dto.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar el token de acceso' })
  refresh(@Body() dto: RefreshDto): Promise<LoginResponse> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @SkipRestaurant()
  @ApiOperation({
    summary:
      'Usuario autenticado + locales disponibles + local activo (header X-Restaurant-Id)',
  })
  me(
    @CurrentUser() user: RequestUser,
    @Req() request: { restaurant?: RequestRestaurant },
  ): Promise<MeResponse> {
    const activeRestaurantId = request.restaurant?.id ?? null;
    return this.authService.me(user.id, user.role, activeRestaurantId);
  }
}
