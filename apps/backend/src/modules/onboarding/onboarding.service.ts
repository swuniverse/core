import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Faction,
  STU_STARTER_PLANET_CLASS_IDS,
  isStarterPlanetClass,
} from '@swuniverse/shared';
import {
  OnboardingSelection,
  OnboardingSelectionStatus,
} from './entities/onboarding-selection.entity';
import { FactionService } from '../faction/faction.service';
import { Layer } from '../starmap/entities/layer.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import {
  CelestialObject,
  CelestialObjectType,
} from '../starmap/entities/celestial-object.entity';
import {
  GalaxyField,
  FactionZone,
} from '../starmap/entities/galaxy-field.entity';
import { ColonySeedService } from '../colony/colony-seed.service';
import { SpacecraftService } from '../spacecraft/spacecraft.service';
import { User } from '../auth/user.entity';
import { sectorToFieldRange } from './onboarding-sector.util';

const INVALID_STARTER_PLANET_MESSAGE =
  'Only colonizable M, L or O class planets can be claimed as homeworld';

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
    const factionId = await this.getEffectiveFactionId(userId, selection);
    const allowedZones = this.getStarterFactionZones(factionId);

    return Promise.all(
      layers.map(async (layer) => {
        const sectorSize = layer.sectorSize;
        const sectorColumns = Math.ceil(layer.width / sectorSize);
        const sectorRows = Math.ceil(layer.height / sectorSize);
        const rows = allowedZones.length
          ? ((await this.galaxyFieldRepo.query(
              `SELECT
                 FLOOR((gf.cx - 1) / $2)::int AS "sectorX",
                 FLOOR((gf.cy - 1) / $2)::int AS "sectorY",
                 COUNT(DISTINCT s.id)::int AS "playableSystemCount",
                 COUNT(DISTINCT co.id)::int AS "totalStarterPlanets",
                 COUNT(DISTINCT CASE WHEN c.id IS NULL THEN co.id END)::int AS "availableStarterPlanets",
                 MIN(gf."factionZone") AS "dominantFactionZone"
               FROM "galaxy_fields" gf
               JOIN "star_systems" s
                 ON s.id = gf."starSystemId"
                AND s."landmarkKey" IS NULL
               LEFT JOIN "celestial_objects" co
                 ON co."systemId" = s.id
                AND co."objectType" = $3
                AND co."isColonizable" = true
                AND co."classId" = ANY($4::int[])
               LEFT JOIN "colonies" c
                 ON c."celestialObjectId" = co.id
               WHERE gf."layerId" = $1
                 AND gf."factionZone" = ANY($5::text[])
               GROUP BY FLOOR((gf.cx - 1) / $2), FLOOR((gf.cy - 1) / $2)`,
              [
                layer.id,
                sectorSize,
                CelestialObjectType.PLANET,
                STU_STARTER_PLANET_CLASS_IDS,
                allowedZones,
              ],
            )) as Array<{
          sectorX: number;
          sectorY: number;
          playableSystemCount: number;
          totalStarterPlanets: number;
          availableStarterPlanets: number;
          dominantFactionZone: FactionZone | null;
        }>)
          : [];

        const statsBySector = new Map(
          rows.map((row) => [`${row.sectorX}:${row.sectorY}`, row]),
        );

        return {
          layerId: layer.id,
          layerName: layer.name,
          sectorSize,
          sectorColumns,
          sectorRows,
          suggestedFactionId: selection.factionId,
          sectors: Array.from(
            { length: sectorColumns * sectorRows },
            (_, index) => {
              const sectorX = index % sectorColumns;
              const sectorY = Math.floor(index / sectorColumns);
              const stats = statsBySector.get(`${sectorX}:${sectorY}`);
              return {
                layerId: layer.id,
                sectorX,
                sectorY,
                minX: sectorX * sectorSize + 1,
                minY: sectorY * sectorSize + 1,
                maxX: Math.min((sectorX + 1) * sectorSize, layer.width),
                maxY: Math.min((sectorY + 1) * sectorSize, layer.height),
                fieldCount:
                  (Math.min((sectorX + 1) * sectorSize, layer.width) -
                    (sectorX * sectorSize + 1) +
                    1) *
                  (Math.min((sectorY + 1) * sectorSize, layer.height) -
                    (sectorY * sectorSize + 1) +
                    1),
                systemCount: Number(stats?.playableSystemCount ?? 0),
                playableSystemCount: Number(stats?.playableSystemCount ?? 0),
                totalStarterPlanets: Number(stats?.totalStarterPlanets ?? 0),
                availableStarterPlanets: Number(
                  stats?.availableStarterPlanets ?? 0,
                ),
                dominantFactionZone: stats?.dominantFactionZone ?? null,
              };
            },
          ),
        };
      }),
    );
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
    const { minX, maxX, minY, maxY } = sectorToFieldRange(
      sectorX,
      sectorY,
      sectorSize,
    );

    const factionId = await this.getEffectiveFactionId(userId, selection);
    const allowedZones = this.getStarterFactionZones(factionId);
    if (allowedZones.length === 0) return [];

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
      .andWhere('system.cy BETWEEN :minY AND :maxY', { minY, maxY })
      .andWhere('system.landmarkKey IS NULL');

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
    if (!system || system.landmarkKey) {
      throw new NotFoundException('System not found');
    }
    const factionId = await this.getEffectiveFactionId(userId, selection);
    await this.assertSystemInStarterFaction(system, factionId);

    const objects = await this.objectRepo.find({
      where: {
        systemId,
        objectType: CelestialObjectType.PLANET,
        isColonizable: true,
        classId: In(STU_STARTER_PLANET_CLASS_IDS),
      },
      order: { posX: 'ASC', posY: 'ASC' },
    });

    selection.selectedSystemId = systemId;
    await this.onboardingRepo.save(selection);

    return objects;
  }

  async claimHomeworld(userId: number, celestialObjectId: number) {
    const selection = await this.getOrCreateSelection(userId);
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const factionId = selection.factionId ?? user.factionId;
    if (!factionId) {
      throw new BadRequestException('Faction must be selected first');
    }
    if (!selection.factionId) {
      selection.factionId = factionId;
    }

    const object = await this.objectRepo.findOneBy({ id: celestialObjectId });
    if (!object) {
      throw new NotFoundException('Celestial object not found');
    }
    const system = await this.starSystemRepo.findOneBy({ id: object.systemId });
    if (!system || system.landmarkKey) {
      throw new BadRequestException(INVALID_STARTER_PLANET_MESSAGE);
    }
    if (!this.isAllowedStarterPlanet(object)) {
      throw new BadRequestException(INVALID_STARTER_PLANET_MESSAGE);
    }
    await this.assertSystemInStarterFaction(system, factionId);

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
      factionId,
      celestialObjectId,
    );

    user.onboardingCompleted = true;
    user.starterColonyId = colony.id;
    user.starterShipId = starterShip.id;
    user.factionId = factionId;
    await this.userRepo.save(user);

    return {
      success: true,
      celestialObjectId,
      selectionId: selection.id,
      starterColonyId: colony.id,
      starterShipId: starterShip.id,
    };
  }

  private isAllowedStarterPlanet(object: CelestialObject): boolean {
    return (
      object.objectType === CelestialObjectType.PLANET &&
      object.isColonizable &&
      isStarterPlanetClass(object.classId)
    );
  }

  private async getEffectiveFactionId(
    userId: number,
    selection: OnboardingSelection,
  ): Promise<number | null> {
    if (selection.factionId) return selection.factionId;
    const user = await this.userRepo.findOneBy({ id: userId });
    return user?.factionId ?? null;
  }

  private getStarterFactionZones(factionId: number | null): FactionZone[] {
    if (!factionId) return [];
    // factionId 1 = Rebel, factionId 2 = Empire (based on faction seeding)
    if (factionId === 1) return [FactionZone.REBEL];
    if (factionId === 2) return [FactionZone.EMPIRE];
    return [];
  }

  private async assertSystemInStarterFaction(
    system: StarSystem,
    factionId: number | null,
  ): Promise<void> {
    const allowedZones = this.getStarterFactionZones(factionId);
    if (allowedZones.length === 0) {
      throw new BadRequestException('Faction must be selected first');
    }
    const field = await this.galaxyFieldRepo.findOne({
      where: { starSystemId: system.id },
    });
    if (!field || !allowedZones.includes(field.factionZone)) {
      throw new BadRequestException(
        'Selected system is not in your faction starter zone',
      );
    }
  }
}
