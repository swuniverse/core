import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type {
  FoundAllianceRequest,
  SetAllianceRoleRequest,
  UpdateAllianceRequest,
} from '@swuniverse/shared';
import { AllianceService } from './alliance.service';

type AuthRequest = { user: { sub: number } };

@Controller('alliances')
@UseGuards(AuthGuard('jwt'))
export class AllianceController {
  constructor(private readonly allianceService: AllianceService) {}

  @Get()
  list() {
    return this.allianceService.list();
  }

  @Get('mine')
  async mine(@Request() req: AuthRequest) {
    return { alliance: await this.allianceService.getRef(req.user.sub) };
  }

  @Post()
  found(@Request() req: AuthRequest, @Body() body: FoundAllianceRequest) {
    return this.allianceService.found(req.user.sub, {
      name: body?.name,
      description: body?.description,
    });
  }

  @Post('leave')
  leave(@Request() req: AuthRequest) {
    return this.allianceService.leave(req.user.sub);
  }

  @Post('applications/:applicationId/accept')
  acceptApplication(
    @Request() req: AuthRequest,
    @Param('applicationId', ParseIntPipe) applicationId: number,
  ) {
    return this.allianceService.acceptApplication(req.user.sub, applicationId);
  }

  @Post('applications/:applicationId/decline')
  declineApplication(
    @Request() req: AuthRequest,
    @Param('applicationId', ParseIntPipe) applicationId: number,
  ) {
    return this.allianceService.declineApplication(
      req.user.sub,
      applicationId,
    );
  }

  @Get(':id/relationships/:relationshipId/contract')
  relationshipContract(
    @Param('id', ParseIntPipe) id: number,
    @Param('relationshipId', ParseIntPipe) relationshipId: number,
  ) {
    return this.allianceService.getPublicRelationshipContract(id, relationshipId);
  }

  @Get(':id')
  detail(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.allianceService.getDetail(req.user.sub, id);
  }

  @Patch(':id')
  update(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAllianceRequest,
  ) {
    return this.allianceService.update(req.user.sub, id, {
      name: body?.name,
      description: body?.description,
      homepage: body?.homepage,
      color: body?.color,
      acceptsApplications: body?.acceptsApplications,
      titles: body?.titles,
    });
  }

  @Delete(':id')
  dissolve(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.allianceService.dissolve(req.user.sub, id);
  }

  @Get(':id/applications')
  listApplications(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.allianceService.listApplications(req.user.sub, id);
  }

  @Post(':id/applications')
  apply(@Request() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.allianceService.apply(req.user.sub, id);
  }

  @Delete(':id/applications/mine')
  withdrawApplication(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.allianceService.withdrawApplication(req.user.sub, id);
  }

  @Delete(':id/members/:userId')
  kick(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.allianceService.kick(req.user.sub, id, userId);
  }

  @Put(':id/members/:userId/role')
  setRole(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: SetAllianceRoleRequest,
  ) {
    return this.allianceService.setRole(req.user.sub, id, userId, body?.role);
  }

  @Post(':id/members/:userId/transfer-presidency')
  transferPresidency(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.allianceService.transferPresidency(req.user.sub, id, userId);
  }
}
