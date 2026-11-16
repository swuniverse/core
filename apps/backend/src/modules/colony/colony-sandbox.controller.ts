import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, MaxLength } from 'class-validator';
import type { ColonySandboxNameDto } from '@swuniverse/shared';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { ColonySandboxService } from './colony-sandbox.service';

class SandboxNameDto implements ColonySandboxNameDto {
  @IsString()
  @MaxLength(100)
  name: string;
}

@Controller('colonies')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class ColonySandboxController {
  constructor(private readonly sandboxes: ColonySandboxService) {}

  @Get('sandboxes')
  list(@Request() req: { user: { sub: number } }) {
    return this.sandboxes.list(req.user.sub);
  }

  @Get('sandboxes/:sandboxId')
  get(
    @Request() req: { user: { sub: number } },
    @Param('sandboxId', ParseIntPipe) id: number,
  ) {
    return this.sandboxes.get(req.user.sub, id);
  }

  @Post(':colonyId/sandboxes')
  create(
    @Request() req: { user: { sub: number } },
    @Param('colonyId', ParseIntPipe) id: number,
    @Body() body: SandboxNameDto,
  ) {
    return this.sandboxes.create(req.user.sub, id, body.name);
  }

  @Patch('sandboxes/:sandboxId')
  rename(
    @Request() req: { user: { sub: number } },
    @Param('sandboxId', ParseIntPipe) id: number,
    @Body() body: SandboxNameDto,
  ) {
    return this.sandboxes.rename(req.user.sub, id, body.name);
  }

  @Delete('sandboxes/:sandboxId')
  remove(
    @Request() req: { user: { sub: number } },
    @Param('sandboxId', ParseIntPipe) id: number,
  ) {
    return this.sandboxes.remove(req.user.sub, id);
  }
}
