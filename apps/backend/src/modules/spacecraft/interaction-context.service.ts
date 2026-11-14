import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { RelationshipResolverService } from '../alliance/relationship-resolver.service';
import { SpacecraftCrewService } from './spacecraft-crew.service';
import {
  Spacecraft,
  SpacecraftStatus,
} from './entities/spacecraft.entity';
import type { InteractionContext } from './interaction-policy';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';
import { isVacationEffective } from '@swuniverse/shared';

export type InteractionContextField = keyof InteractionContext;

const ALL_FIELDS: InteractionContextField[] = [
  'samePosition',
  'sourceHasSufficientCrew',
  'sourceCombatCapable',
  'sourceInHyperspace',
  'targetInHyperspace',
  'sourceCloaked',
  'targetCloaked',
  'sourceShieldsActive',
  'targetShieldsActive',
  'targetOnVacation',
  'sourceDestroyed',
  'targetDestroyed',
  'sourceBlocked',
  'sourceTractored',
  'targetBlocked',
  'stanceAllowed',
];

@Injectable()
export class InteractionContextService {
  constructor(
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly crewService: SpacecraftCrewService,
    private readonly runtimeState: SpacecraftRuntimeStateService,
    private readonly relationships: RelationshipResolverService,
  ) {}

  async load(
    sourceId: number,
    targetId: number,
    fields: readonly InteractionContextField[] = ALL_FIELDS,
    targetOwnerId?: number,
  ): Promise<InteractionContext> {
    const requested = new Set(fields);
    const needsHyperspace =
      requested.has('sourceInHyperspace') || requested.has('targetInHyperspace');
    const needsModules =
      needsHyperspace ||
      requested.has('sourceShieldsActive') ||
      requested.has('targetShieldsActive') ||
      requested.has('sourceCloaked') ||
      requested.has('targetCloaked');
    const relations = [
      ...(needsModules ? ['modules'] : []),
      ...(needsHyperspace ? ['location'] : []),
    ];
    const [source, target] = await Promise.all([
      this.shipRepo.findOne({ where: { id: sourceId }, relations }),
      this.shipRepo.findOne({ where: { id: targetId }, relations }),
    ]);
    if (!source || !target) throw new NotFoundException('Spacecraft not found');

    const [sourceHasSufficientCrew, targetOwner, stance] = await Promise.all([
      requested.has('sourceHasSufficientCrew')
        ? this.crewService.hasEnoughCrew(source)
        : false,
      requested.has('targetOnVacation')
        ? this.userRepo.findOneBy({ id: targetOwnerId ?? target.userId })
        : null,
      requested.has('stanceAllowed')
        ? this.relationships.resolve(source.userId, target.userId)
        : null,
    ]);
    const sourceTractor = requested.has('sourceTractored')
      ? await this.shipRepo.findOne({ where: { tractoredShipId: source.id } })
      : null;
    const sourceSystems =
      requested.has('sourceShieldsActive') ||
      requested.has('sourceCloaked') ||
      requested.has('sourceInHyperspace')
        ? this.runtimeState.initialize(source)
        : {};
    const targetSystems =
      requested.has('targetShieldsActive') ||
      requested.has('targetCloaked') ||
      requested.has('targetInHyperspace')
        ? this.runtimeState.initialize(target)
        : {};
    // STU `isWarped`: warp drive running in open space (as nearby-interaction).
    const inHyperspace = (ship: Spacecraft, systems: typeof sourceSystems) =>
      ship.location?.kind === 'GALAXY_FIELD' && systems.WARPDRIVE?.active === true;

    return {
      samePosition: source.locationId === target.locationId,
      sourceHasSufficientCrew,
      sourceCombatCapable: source.hull > 0,
      sourceInHyperspace: inHyperspace(source, sourceSystems),
      targetInHyperspace: inHyperspace(target, targetSystems),
      sourceCloaked: sourceSystems.CLOAK?.active === true,
      targetCloaked: targetSystems.CLOAK?.active === true,
      sourceShieldsActive: sourceSystems.SHIELDS?.active === true,
      targetShieldsActive: targetSystems.SHIELDS?.active === true,
      targetOnVacation:
        targetOwner != null && isVacationEffective(targetOwner),
      sourceDestroyed: source.status === SpacecraftStatus.DESTROYED || source.hull <= 0,
      targetDestroyed: target.status === SpacecraftStatus.DESTROYED || target.hull <= 0,
      sourceBlocked: false,
      ...(requested.has('sourceTractored')
        ? { sourceTractored: sourceTractor != null }
        : {}),
      targetBlocked: false,
      stanceAllowed: stance?.mayTransferSafely === true,
    };
  }
}
