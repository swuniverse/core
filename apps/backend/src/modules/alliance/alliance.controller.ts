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
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type {
  FoundAllianceRequest,
  ProposeAllianceRelationshipChangeRequest,
  ProposeAllianceRelationshipRequest,
  SetAllianceRoleRequest,
  UpdateAllianceRequest,
} from '@swuniverse/shared';
import { AllianceService } from './alliance.service';
import { MemberOverviewService } from './member-overview.service';

type AuthRequest = { user: { sub: number } };

@Controller('alliances')
@UseGuards(AuthGuard('jwt'))
export class AllianceController {
  constructor(
    private readonly allianceService: AllianceService,
    private readonly memberOverview: MemberOverviewService,
  ) {}

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
    return this.allianceService.declineApplication(req.user.sub, applicationId);
  }

  @Post(':id/relationships/:targetAllianceId/war')
  declareWar(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Param('targetAllianceId', ParseIntPipe) targetAllianceId: number,
  ) {
    return this.allianceService.declareWar(req.user.sub, id, targetAllianceId);
  }

  @Get(':id/chronicle')
  chronicle(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.allianceService.listChronicle(
      req.user.sub,
      id,
      cursor,
      limit === undefined ? undefined : Number(limit),
    );
  }

  @Get(':id/diplomacy/chronicle')
  diplomacyChronicle(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.allianceService.listDiplomacyChronicle(
      req.user.sub,
      id,
      cursor,
      limit === undefined ? undefined : Number(limit),
    );
  }

  @Get(':id/diplomacy')
  getDiplomacyManagement(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.allianceService.getDiplomacyManagement(req.user.sub, id);
  }

  @Get(':id/diplomacy/proposals')
  listRelationshipProposals(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.allianceService.listRelationshipProposals(req.user.sub, id);
  }

  @Post(':id/diplomacy/proposals')
  proposeRelationship(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ProposeAllianceRelationshipRequest,
  ) {
    return this.allianceService.proposeRelationship(req.user.sub, id, {
      recipientAllianceId: body?.recipientAllianceId,
      type: body?.type,
      contract: body?.contract,
      permissions: body?.permissions,
    });
  }

  @Get(':id/diplomacy/changes')
  listRelationshipChangeProposals(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.allianceService.listRelationshipChangeProposals(
      req.user.sub,
      id,
    );
  }

  @Post('relationships/:relationshipId/changes')
  proposeRelationshipChange(
    @Request() req: AuthRequest,
    @Param('relationshipId', ParseIntPipe) relationshipId: number,
    @Body() body: ProposeAllianceRelationshipChangeRequest,
  ) {
    return this.allianceService.proposeRelationshipChange(
      req.user.sub,
      relationshipId,
      { contract: body?.contract, permissions: body?.permissions },
    );
  }

  @Post('diplomacy/changes/:proposalId/accept')
  acceptRelationshipChange(
    @Request() req: AuthRequest,
    @Param('proposalId', ParseIntPipe) proposalId: number,
  ) {
    return this.allianceService.acceptRelationshipChange(
      req.user.sub,
      proposalId,
    );
  }

  @Post('diplomacy/changes/:proposalId/decline')
  declineRelationshipChange(
    @Request() req: AuthRequest,
    @Param('proposalId', ParseIntPipe) proposalId: number,
  ) {
    return this.allianceService.declineRelationshipChange(
      req.user.sub,
      proposalId,
    );
  }

  @Delete('diplomacy/changes/:proposalId')
  withdrawRelationshipChange(
    @Request() req: AuthRequest,
    @Param('proposalId', ParseIntPipe) proposalId: number,
  ) {
    return this.allianceService.withdrawRelationshipChange(
      req.user.sub,
      proposalId,
    );
  }

  @Post('diplomacy/proposals/:proposalId/accept')
  acceptRelationshipProposal(
    @Request() req: AuthRequest,
    @Param('proposalId', ParseIntPipe) proposalId: number,
  ) {
    return this.allianceService.acceptRelationshipProposal(
      req.user.sub,
      proposalId,
    );
  }

  @Post('diplomacy/proposals/:proposalId/decline')
  declineRelationshipProposal(
    @Request() req: AuthRequest,
    @Param('proposalId', ParseIntPipe) proposalId: number,
  ) {
    return this.allianceService.declineRelationshipProposal(
      req.user.sub,
      proposalId,
    );
  }

  @Delete('diplomacy/proposals/:proposalId')
  withdrawRelationshipProposal(
    @Request() req: AuthRequest,
    @Param('proposalId', ParseIntPipe) proposalId: number,
  ) {
    return this.allianceService.withdrawRelationshipProposal(
      req.user.sub,
      proposalId,
    );
  }

  @Delete('relationships/:relationshipId')
  endRelationship(
    @Request() req: AuthRequest,
    @Param('relationshipId', ParseIntPipe) relationshipId: number,
  ) {
    return this.allianceService.endRelationship(req.user.sub, relationshipId);
  }

  @Get(':id/relationships/:relationshipId/contract')
  relationshipContract(
    @Param('id', ParseIntPipe) id: number,
    @Param('relationshipId', ParseIntPipe) relationshipId: number,
  ) {
    return this.allianceService.getPublicRelationshipContract(
      id,
      relationshipId,
    );
  }

  @Get(':id/member-overview')
  memberOverviewOf(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.memberOverview.getOverview(req.user.sub, id);
  }

  @Get(':id')
  detail(@Request() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
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
  dissolve(@Request() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
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
