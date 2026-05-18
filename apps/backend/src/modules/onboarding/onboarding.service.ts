import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Faction } from '@swuniverse/shared';
import {
  OnboardingSelection,
  OnboardingSelectionStatus,
} from './entities/onboarding-selection.entity';
import { FactionService } from '../faction/faction.service';
import { Layer } from '../starmap/entities/layer.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { CelestialObject } from '../starmap/entities/celestial-object.entity';
import { GalaxyField, FactionZone } from '../starmap/entities/galaxy-field.entity';
import { ColonySeedService } from '../colony/colony-seed.service';
import { SpacecraftService } from '../spacecraft/spacecraft.service';
import { User } from '../auth/user.entity';

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(OnboardingSelection)
    private readonly onboardingRepo: Repository<OnboardingSelection>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Layer)
    private readonly layerRepo: Repository<Layer>,
    @InjectRepository(StarSystem)
    private readonly starSystemRepo: Repository<StarSystem>,
    @InjectRepository(CelestialObject)
    private readonly objectRepo: Repository<CelestialObject>,
    @InjectRepository(GalaxyField)
    private readonly galaxyFieldRepo: Repository<GalaxyField>,
    private readonly factionService: FactionService,
    private readonly colonySeedService: ColonySeedService,
    private readonly spacecraftService: SpacecraftService,
  ) {}

  async getOrCreateSelection(userId: number): Promise<OnboardingSelection> {
    const existing = await this.onboardingRepo.findOne({ where: { userId } });
    if (existing) {
      return existing;
    }

    return this.onboardingRepo.save(this.onboardingRepo.create({ userId }));
  }

  async selectFaction(
    userId: number,
    factionKey: Faction,
  ): Promise<OnboardingSelection> {
    const faction = await this.factionService.findByKey(factionKey);
    if (!faction) {
      throw new NotFoundException('Faction not found');
    }

    const selection = await this.getOrCreateSelection(userId);
    selection.factionId = faction.id;
    await this.userRepo.update(userId, {
      faction: faction.key as Faction,
      factionId: faction.id,
    });
    return this.onboardingRepo.save(selection);
  }

  async listSectors(userId: number) {
    const selection = await this.getOrCreateSelection(userId);
    const layers = await this.layerRepo.find({ order: { id: 'ASC' } });

    return layers.map((layer) => ({
      layerId: layer.id,
      layerName: layer.name,
      sectorSize: layer.sectorSize,
      sectorColumns: Math.ceil(layer.width / layer.sectorSize),
      sectorRows: Math.ceil(layer.height / layer.sectorSize),
      suggestedFactionId: selection.factionId,
    }));
  }

  async listSystems(
    userId: number,
    layerId: number,
    sectorX: number,
    sectorY: number,
  ) {
    const selection = await this.getOrCreateSelection(userId);
    const layer = await this.layerRepo.findOneBy({ id: layerId });
    if (!layer) {
      throw new NotFoundException('Layer not found');
    }

    const sectorSize = layer.sectorSize;
    const minX = sectorX * sectorSize;
    const maxX = minX + sectorSize - 1;
    const minY = sectorY * sectorSize;
    const maxY = minY + sectorSize - 1;

    const allowedZones = this.getAllowedFactionZones(selection.factionId);

    let systemIds: number[] | null = null;
    if (allowedZones.length > 0) {
      const zoneFields = await this.galaxyFieldRepo
        .createQueryBuilder('gf')
        .select('DISTINCT gf.starSystemId', 'starSystemId')
        .where('gf.layerId = :layerId', { layerId })
        .andWhere('gf.cx BETWEEN :minX AND :maxX', { minX, maxX })
        .andWhere('gf.cy BETWEEN :minY AND :maxY', { minY, maxY })
        .andWhere('gf.starSystemId IS NOT NULL')
        .andWhere('gf.factionZone IN (:...zones)', { zones: allowedZones })
        .getRawMany<{ starSystemId: number }>();
      systemIds = zoneFields.map((f) => f.starSystemId);
    }

    const query = this.starSystemRepo
      .createQueryBuilder('system')
      .where('system.layerId = :layerId', { layerId })
      .andWhere('system.cx BETWEEN :minX AND :maxX', { minX, maxX })
      .andWhere('system.cy BETWEEN :minY AND :maxY', { minY, maxY });

    if (systemIds !== null) {
      if (systemIds.length === 0) {
        return [];
      }
      query.andWhere('system.id IN (:...systemIds)', { systemIds });
    }

    const systems = await query.orderBy('system.name', 'ASC').getMany();

    selection.selectedLayerId = layerId;
    selection.selectedSectorX = sectorX;
    selection.selectedSectorY = sectorY;
    await this.onboardingRepo.save(selection);

    return systems;
  }

  async listPlanets(userId: number, systemId: number) {
    const selection = await this.getOrCreateSelection(userId);
    const system = await this.starSystemRepo.findOneBy({ id: systemId });
    if (!system) {
      throw new NotFoundException('System not found');
    }

    const objects = await this.objectRepo.find({
      where: { systemId, isColonizable: true },
      order: { posX: 'ASC', posY: 'ASC' },
    });

    selection.selectedSystemId = systemId;
    await this.onboardingRepo.save(selection);

    return objects;
  }

  async claimHomeworld(userId: number, celestialObjectId: number) {
    const selection = await this.getOrCreateSelection(userId);
    if (!selection.factionId) {
      throw new BadRequestException('Faction must be selected first');
    }

    const object = await this.objectRepo.findOneBy({
      id: celestialObjectId,
      isColonizable: true,
    });
    if (!object) {
      throw new NotFoundException('Colonizable celestial object not found');
    }

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (
      user.onboardingCompleted ||
      user.starterColonyId ||
      user.starterShipId
    ) {
      throw new BadRequestException('Onboarding already completed');
    }
    if (
      selection.status === OnboardingSelectionStatus.COMPLETED ||
      selection.completedAt !== null
    ) {
      throw new BadRequestException('Homeworld already claimed');
    }

    const existingClaim = await this.objectRepo
      .createQueryBuilder('object')
      .innerJoin('colonies', 'colony', 'colony.celestialObjectId = object.id')
      .where('object.id = :celestialObjectId', { celestialObjectId })
      .getOne();
    if (existingClaim) {
      throw new BadRequestException('Celestial object already claimed');
    }

    selection.selectedCelestialObjectId = celestialObjectId;
    selection.status = OnboardingSelectionStatus.COMPLETED;
    selection.completedAt = new Date();
    await this.onboardingRepo.save(selection);

    const colony = await this.colonySeedService.createStarterColony(
      user.id,
      user.username,
      celestialObjectId,
    );
    const starterShip = await this.spacecraftService.spawnStarterShip(
      user.id,
      selection.factionId,
      celestialObjectId,
    );

    user.onboardingCompleted = true;
    user.starterColonyId = colony.id;
    user.starterShipId = starterShip.id;
    user.factionId = selection.factionId;
    await this.userRepo.save(user);

    return {
      success: true,
      celestialObjectId,
      selectionId: selection.id,
      starterColonyId: colony.id,
      starterShipId: starterShip.id,
    };
  }

  private getAllowedFactionZones(factionId: number | null): FactionZone[] {
    if (!factionId) return [];
    // factionId 1 = Rebel, factionId 2 = Empire (based on faction seeding)
    if (factionId === 1) {
      return [FactionZone.REBEL, FactionZone.CONTESTED, FactionZone.NEUTRAL];
    }
    if (factionId === 2) {
      return [FactionZone.EMPIRE, FactionZone.CONTESTED, FactionZone.NEUTRAL];
    }
    return [FactionZone.CONTESTED, FactionZone.NEUTRAL, FactionZone.UNKNOWN];
  }
}
