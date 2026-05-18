import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SettingsService } from './settings.service';

@Controller('user')
@UseGuards(AuthGuard('jwt'))
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('settings')
  getSettings(@Request() req: { user: { sub: number } }) {
    return this.settingsService.getSettings(req.user.sub);
  }

  @Patch('settings')
  updateSettings(
    @Request() req: { user: { sub: number } },
    @Body() body: Record<string, string>,
  ) {
    return this.settingsService.updateSettings(req.user.sub, body);
  }

  @Patch('password')
  changePassword(
    @Request() req: { user: { sub: number } },
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return this.settingsService.changePassword(
      req.user.sub,
      body.oldPassword,
      body.newPassword,
    );
  }

  @Patch('email')
  changeEmail(
    @Request() req: { user: { sub: number } },
    @Body() body: { password: string; newEmail: string },
  ) {
    return this.settingsService.changeEmail(
      req.user.sub,
      body.password,
      body.newEmail,
    );
  }

  @Patch('profile')
  updateProfile(
    @Request() req: { user: { sub: number } },
    @Body() body: { description: string },
  ) {
    return this.settingsService.updateProfile(req.user.sub, body.description);
  }

  @Post('vacation/activate')
  activateVacation(@Request() req: { user: { sub: number } }) {
    return this.settingsService.activateVacation(req.user.sub);
  }

  @Post('vacation/deactivate')
  deactivateVacation(@Request() req: { user: { sub: number } }) {
    return this.settingsService.deactivateVacation(req.user.sub);
  }

  @Post('delete')
  requestDeletion(
    @Request() req: { user: { sub: number } },
    @Body() body: { password: string },
  ) {
    return this.settingsService.requestDeletion(req.user.sub, body.password);
  }

  @Get('search')
  searchUsers(@Query('q') query: string) {
    return this.settingsService.searchUsers(query);
  }
}
