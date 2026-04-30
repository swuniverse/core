import {
  Controller,
  Get,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StarmapService } from './starmap.service';

@Controller('starmap')
@UseGuards(AuthGuard('jwt'))
export class StarmapController {
  constructor(private readonly starmapService: StarmapService) {}

  @Get('layers')
  getLayers() {
    return this.starmapService.getLayers();
  }

  @Get('layers/:layerId/systems')
  getSystemsInLayer(@Param('layerId', ParseIntPipe) layerId: number) {
    return this.starmapService.getSystemsInLayer(layerId);
  }

  @Get('systems/:id')
  getSystemDetail(@Param('id', ParseIntPipe) id: number) {
    return this.starmapService.getSystemDetail(id);
  }
}
