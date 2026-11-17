import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ArrayMaxSize, IsArray, IsInt, IsString, MaxLength, MinLength } from 'class-validator';
import { AdminGuard } from '../auth/admin.guard';
import { OrderBroadcastService } from './order-broadcast.service';

class SendOrderBroadcastDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message: string;
}

class AcknowledgeDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  ids: number[];
}

@Controller('order-broadcasts')
@UseGuards(AuthGuard('jwt'))
export class OrderBroadcastController {
  constructor(private readonly service: OrderBroadcastService) {}

  @Get('pending')
  pending(@Request() req: { user: { sub: number } }) {
    return this.service.listPending(req.user.sub);
  }

  @Post('acknowledge')
  async acknowledge(
    @Request() req: { user: { sub: number } },
    @Body() body: AcknowledgeDto,
  ) {
    await this.service.acknowledge(req.user.sub, body.ids);
    return { ok: true };
  }

  @UseGuards(AdminGuard)
  @Post()
  send(@Body() body: SendOrderBroadcastDto) {
    return this.service.send(body.message);
  }
}
