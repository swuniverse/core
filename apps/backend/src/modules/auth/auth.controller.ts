import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { AuthService } from './auth.service';
import { RegisterRequestDto } from './dto/register.dto';
import {
  ResendVerificationRequestDto,
  VerifyEmailRequestDto,
} from './dto/verify-email.dto';
import { LoginRequestDto } from './dto/login.dto';
import { AdminGuard } from './admin.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterRequestDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginRequestDto) {
    return this.authService.login(dto);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailRequestDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerificationRequestDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getProfile(@Request() req: { user: { sub: number } }) {
    return this.authService.getProfile(req.user.sub);
  }

  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('admin/users')
  listUsers() {
    return this.authService.listUsers();
  }

  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Patch('admin/users/:id/permissions')
  updatePermissions(
    @Param('id') id: string,
    @Body() body: { permissions: string[] },
  ) {
    return this.authService.updatePermissions(Number(id), body.permissions);
  }
}
