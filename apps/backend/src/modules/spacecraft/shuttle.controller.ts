import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsInt, Min, Max } from 'class-validator';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { ShuttleService } from './shuttle.service';
export class ShuttleLaunchRequest {
  @IsInt() @Min(1) @Max(2147483647) commodityId: number;
}
export class ShuttleStoreRequest {
  @IsInt() @Min(1) @Max(2147483647) targetId: number;
}
export class ShuttleLandRequest {
  @IsInt() @Min(1) @Max(2147483647) colonyId: number;
}
@Controller('spacecraft')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class ShuttleController {
  constructor(private readonly shuttles: ShuttleService) {}
  @Get(':id/shuttles') get(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.shuttles.get(id, req.user.sub);
  }
  @Post(':id/shuttles/launch') launch(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() body: ShuttleLaunchRequest,
  ) {
    return this.shuttles.launch(id, req.user.sub, body.commodityId);
  }
  @Post(':id/shuttles/store') async store(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() body: ShuttleStoreRequest,
  ) {
    await this.shuttles.store(id, req.user.sub, body.targetId);
    return { message: 'Shuttle aufgenommen' };
  }
  @Post(':id/shuttles/land') async land(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() body: ShuttleLandRequest,
  ) {
    await this.shuttles.land(id, req.user.sub, body.colonyId);
    return { message: 'Shuttle gelandet' };
  }
}
