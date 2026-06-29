import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { LoginResponse, MeResponse } from '@restaurante/shared-types';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { SkipRestaurant } from '../../common/decorators/skip-restaurant.decorator';
import { RequestRestaurant } from '../../common/decorators/current-restaurant.decorator';
import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookie,
  setRefreshCookie,
} from '../../common/cookie/cookie';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión. Devuelve el access token en el body y el refresh en cookie httpOnly.',
  })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const result = await this.authService.login(dto.email, dto.password);
    if (result.refreshToken) {
      setRefreshCookie(req, res, this.configService, result.refreshToken);
    }
    return result;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(REFRESH_COOKIE_NAME)
  @ApiOperation({
    summary: 'Renovar el access token. Lee el refresh de la cookie httpOnly y lo rota.',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE_NAME];
    if (!token) {
      throw new UnauthorizedException('No hay sesión activa.');
    }
    const result = await this.authService.refresh(token);
    setRefreshCookie(req, res, this.configService, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiCookieAuth(REFRESH_COOKIE_NAME)
  @ApiOperation({
    summary: 'Cerrar sesión. Revoca el refresh token y limpia la cookie httpOnly.',
  })
  async logout(
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE_NAME];
    await this.authService.logout(user.id, token);
    clearRefreshCookie(req, res, this.configService);
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
