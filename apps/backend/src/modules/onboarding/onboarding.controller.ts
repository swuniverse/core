import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Faction } from '@swuniverse/shared';
import { OnboardingService } from './onboarding.service';

class SelectFactionDto {
  @IsEnum(Faction)
  faction: Faction;
}

class ListSystemsQueryDto {
  @Type(() => Number)
  @IsInt()
  layerId: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  sectorX: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  sectorY: number;
}

class ListPlanetsQueryDto {
  @Type(() => Number)
  @IsInt()
  systemId: number;
}

class ClaimHomeworldDto {
  @Type(() => Number)
  @IsInt()
  celestialObjectId: number;
}

@UseGuards(AuthGuard('jwt'))
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('selection')
  getSelection(@Request() req: { user: { sub: number } }) {
    return this.onboardingService.getOrCreateSelection(req.user.sub);
  }

  @Post('faction')
  selectFaction(
    @Request() req: { user: { sub: number } },
    @Body() dto: SelectFactionDto,
  ) {
    return this.onboardingService.selectFaction(req.user.sub, dto.faction);
  }

  @Get('sectors')
  listSectors(@Request() req: { user: { sub: number } }) {
    return this.onboardingService.listSectors(req.user.sub);
  }

  @Get('systems')
  listSystems(
    @Request() req: { user: { sub: number } },
    @Query() query: ListSystemsQueryDto,
  ) {
    return this.onboardingService.listSystems(
      req.user.sub,
      query.layerId,
      query.sectorX,
      query.sectorY,
    );
  }

  @Get('planets')
  listPlanets(
    @Request() req: { user: { sub: number } },
    @Query() query: ListPlanetsQueryDto,
  ) {
    return this.onboardingService.listPlanets(req.user.sub, query.systemId);
  }

  @Post('claim-homeworld')
  claimHomeworld(
    @Request() req: { user: { sub: number } },
    @Body() dto: ClaimHomeworldDto,
  ) {
    return this.onboardingService.claimHomeworld(req.user.sub, dto.celestialObjectId);
  }
}
