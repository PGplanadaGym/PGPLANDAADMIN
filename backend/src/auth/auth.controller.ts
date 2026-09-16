import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { setAuthCookies, clearAuthCookies } from './cookies.util';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(
      dto.email,
      dto.password,
      { userAgent: req.headers['user-agent'], ip: req.ip },
    );
    setAuthCookies(res, accessToken, refreshToken);
    return { success: true };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.refrescar(
      req.cookies?.refresh_token,
    );
    setAuthCookies(res, accessToken, refreshToken);
    return { success: true };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.cookies?.refresh_token);
    clearAuthCookies(res);
    return { success: true };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.solicitarResetPassword(dto.email);
    return { success: true };
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.password);
    return { success: true };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return user;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('sesiones')
  listarSesiones(@CurrentUser() user: RequestUser, @Req() req: Request) {
    return this.authService.listarSesiones(user.id, req.cookies?.refresh_token);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('sesiones/:id')
  revocarSesion(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.authService.revocarSesion(user.id, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('sesiones/cerrar-otras')
  cerrarOtrasSesiones(@CurrentUser() user: RequestUser, @Req() req: Request) {
    return this.authService.cerrarOtrasSesiones(
      user.id,
      req.cookies?.refresh_token,
    );
  }
}
