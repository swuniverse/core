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
import { AuthService } from './auth.service';
import { RegisterRequestDto } from './dto/register.dto';
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

  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getProfile(@Request() req: { user: { sub: number } }) {
    return this.authService.getProfile(req.user.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('invites')
  getMyInvites(@Request() req: { user: { sub: number } }) {
    return this.authService.getMyInvites(req.user.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('invites')
  createMyInvite(@Request() req: { user: { sub: number } }) {
    return this.authService.createMyInvite(req.user.sub);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('admin/invites')
  getAdminInvites() {
    return this.authService.getAdminInvites();
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Post('admin/invites')
  adminCreateInvites(
    @Request() req: { user: { sub: number } },
    @Body()
    body: { ownerUserId?: number; keyCount?: number; additionalQuota?: number },
  ) {
    return this.authService.adminCreateInvites(req.user.sub, body ?? {});
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('admin/users')
  listUsers() {
    return this.authService.listUsers();
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Patch('admin/users/:id/permissions')
  updatePermissions(
    @Param('id') id: string,
    @Body() body: { permissions: string[] },
  ) {
    return this.authService.updatePermissions(Number(id), body.permissions);
  }
}
