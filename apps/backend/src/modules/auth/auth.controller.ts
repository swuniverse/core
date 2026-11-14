import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { AuthService } from './auth.service';
import { RegisterRequestDto } from './dto/register.dto';
import { LoginRequestDto } from './dto/login.dto';
import {
  LostPasswordRequestDto,
  ResetPasswordRequestDto,
} from './dto/password-reset.dto';
import { AdminGuard } from './admin.guard';
import {
  UpdateVerificationEmailRequestDto,
  VerifyEmailRequestDto,
} from './dto/email-verification.dto';

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
  @Post('logout')
  logout(@Request() req: { user: { sub: number } }) {
    return this.authService.logout(req.user.sub);
  }

  @Get('features')
  features() {
    return this.authService.features();
  }

  @Post('lost-password')
  lostPassword(@Body() dto: LostPasswordRequestDto) {
    return this.authService.lostPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordRequestDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('confirm-deletion')
  confirmDeletion(@Body('token') token: string) {
    return this.authService.confirmDeletion(token);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailRequestDto) {
    return this.authService.verifyEmail(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('verification/resend')
  resendEmailVerification(@Request() req: { user: { sub: number } }) {
    return this.authService.resendEmailVerification(req.user.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('verification/email')
  updateVerificationEmail(
    @Request() req: { user: { sub: number } },
    @Body() dto: UpdateVerificationEmailRequestDto,
  ) {
    return this.authService.updateVerificationEmail(req.user.sub, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getProfile(@Request() req: { user: { sub: number } }) {
    return this.authService.getProfile(req.user.sub);
  }

  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  @Get('invites')
  getMyInvites(@Request() req: { user: { sub: number } }) {
    return this.authService.getMyInvites(req.user.sub);
  }

  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  @Post('invites')
  createMyInvite(@Request() req: { user: { sub: number } }) {
    return this.authService.createMyInvite(req.user.sub);
  }

  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('admin/invites')
  getAdminInvites() {
    return this.authService.getAdminInvites();
  }

  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Post('admin/invites')
  adminCreateInvites(
    @Request() req: { user: { sub: number } },
    @Body()
    body: { ownerUserId?: number; keyCount?: number; additionalQuota?: number },
  ) {
    return this.authService.adminCreateInvites(req.user.sub, body ?? {});
  }

  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('admin/users')
  listUsers(@Query('q') query?: string) {
    return this.authService.listUsers(query);
  }

  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Post('admin/users/:id/delete')
  deleteUserNow(@Param('id') id: string) {
    return this.authService.deleteUserNow(Number(id));
  }

  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Patch('admin/users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() body: { username: string; description: string | null },
  ) {
    return this.authService.updateUser(Number(id), body);
  }

  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Post('admin/users/:id/lock')
  lockUser(
    @Param('id') id: string,
    @Body() body: { ticks: number; reason: string },
  ) {
    return this.authService.lockUser(Number(id), body);
  }

  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Delete('admin/users/:id/lock')
  unlockUser(@Param('id') id: string) {
    return this.authService.unlockUser(Number(id));
  }

  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Post('admin/users/:id/block')
  blockUser(@Param('id') id: string) {
    return this.authService.blockUser(Number(id));
  }

  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Patch('admin/users/:id/deletion-forbidden')
  setDeletionForbidden(
    @Param('id') id: string,
    @Body() body: { forbidden: boolean },
  ) {
    return this.authService.setDeletionForbidden(Number(id), body?.forbidden);
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
