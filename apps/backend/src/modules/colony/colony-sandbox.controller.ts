import { ColonySandboxPreviewService } from './colony-sandbox-preview.service';
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
import {
  IsString,
  MaxLength,
  IsIn,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateIf,
} from 'class-validator';
import type {
  ColonySandboxActionDto,
  ColonySandboxNameDto,
} from '@swuniverse/shared';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { ColonySandboxService } from './colony-sandbox.service';
import { ColonySandboxPlanningService } from './colony-sandbox-planning.service';

class SandboxNameDto implements ColonySandboxNameDto {
  @IsString()
  @MaxLength(100)
  name: string;
}

class SandboxActionDto {
  @IsIn(['build', 'upgrade', 'terraform', 'demolish', 'toggle', 'mass-toggle'])
  action: ColonySandboxActionDto['action'];

  @ValidateIf((body: SandboxActionDto) => body.action !== 'mass-toggle')
  @IsInt()
  @Min(0)
  fieldIndex: number;

  @ValidateIf((body: SandboxActionDto) => body.action === 'build')
  @IsInt()
  @Min(1)
  buildingId: number;

  @ValidateIf((body: SandboxActionDto) => body.action === 'upgrade')
  @IsInt()
  @Min(1)
  upgradeId: number;

  @ValidateIf((body: SandboxActionDto) => body.action === 'terraform')
  @IsString()
  @MaxLength(100)
  terraformingId: string;

  @ValidateIf((body: SandboxActionDto) => body.action === 'mass-toggle')
  @IsInt()
  @Min(1)
  @Max(7)
  mode: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  fieldIndexes?: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  commodityId?: number;

  @ValidateIf(
    (body: SandboxActionDto) =>
      body.action === 'mass-toggle' || body.activate !== undefined,
  )
  @IsBoolean()
  activate: boolean;
}

@Controller('colonies')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class ColonySandboxController {
  constructor(
    private readonly sandboxes: ColonySandboxService,
    private readonly planning: ColonySandboxPlanningService,
    private readonly previews: ColonySandboxPreviewService,
  ) {}

  @Get('sandboxes/:sandboxId/preview')
  preview(@Request() req: { user: { sub: number } }, @Param('sandboxId', ParseIntPipe) id: number) {
    return this.previews.preview(req.user.sub, id);
  }

  @Get('sandboxes/:sandboxId/fields/:fieldIndex/options')
  options(
    @Request() req: { user: { sub: number } },
    @Param('sandboxId', ParseIntPipe) id: number,
    @Param('fieldIndex', ParseIntPipe) index: number,
  ) {
    return this.planning.options(req.user.sub, id, index);
  }

  @Post('sandboxes/:sandboxId/actions')
  act(
    @Request() req: { user: { sub: number } },
    @Param('sandboxId', ParseIntPipe) id: number,
    @Body() body: SandboxActionDto,
  ) {
    return this.planning.act(req.user.sub, id, body as ColonySandboxActionDto);
  }

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
