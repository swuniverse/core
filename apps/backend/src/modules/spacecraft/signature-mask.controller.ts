import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsInt, Max, Min } from 'class-validator';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { SignatureMaskService } from './signature-mask.service';

export class ActivateSignatureMaskRequest {
  @IsInt() @Min(1) @Max(2147483647) shipClassId: number;
}
@Controller('spacecraft')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class SignatureMaskController {
  constructor(private readonly masks: SignatureMaskService) {}
  @Get(':id/signature-mask')
  get(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.masks.get(id, req.user.sub);
  }
  @Post(':id/signature-mask')
  activate(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() body: ActivateSignatureMaskRequest,
  ) {
    return this.masks.activate(id, req.user.sub, body.shipClassId);
  }
  @Delete(':id/signature-mask')
  deactivate(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.masks.deactivate(id, req.user.sub);
  }
}
