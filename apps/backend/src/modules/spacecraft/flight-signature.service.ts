import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { And, EntityManager, In, LessThan, MoreThan, Repository } from 'typeorm';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import {
  FlightDirection,
  FlightSignature,
} from './entities/flight-signature.entity';
import { Spacecraft } from './entities/spacecraft.entity';
import { ShipClassService } from './ship-class.service';
import { SignatureMaskService } from './signature-mask.service';
import { isCloaked } from './spacecraft-cloak';

const HOUR = 60 * 60 * 1000;
export const FLIGHT_SIGNATURE_RETENTION_MS = 48 * HOUR;

export interface VisibleFlightSignature {
  id: number;
  spacecraftId: number;
  shipClassId: number | null;
  shipClassName: string | null;
  spacecraftName: string | null;
  fromDirection: FlightDirection | null;
  toDirection: FlightDirection | null;
  isCloaked: boolean;
  createdAt: string;
}

@Injectable()
export class FlightSignatureService {
  constructor(
    @InjectRepository(FlightSignature)
    private readonly signatureRepo: Repository<FlightSignature>,
    private readonly shipClassService: ShipClassService,
    @Optional() private readonly masks?: SignatureMaskService,
  ) {}

  async createMovement(
    ship: Spacecraft,
    origin: SpaceLocation | null,
    destination: SpaceLocation | null,
    direction: FlightDirection | null,
    manager?: EntityManager,
  ): Promise<void> {
    if (!origin || !destination || ship.rpgHidden) return;
    const emit = async (
      transaction?: EntityManager,
      maskedHull: ShipClassDef | null = null,
      suppressed = false,
    ) => {
      if (suppressed) return;
      const repository =
        transaction?.getRepository(FlightSignature) ?? this.signatureRepo;
      const shipClass =
        maskedHull ??
        (transaction
          ? await transaction.findOneBy(ShipClassDef, { id: ship.shipClassId })
          : await this.shipClassService.findById(ship.shipClassId));
      const common = {
        userId: ship.userId,
        spacecraftId: ship.id,
        spacecraftName: ship.name,
        shipClassId: shipClass?.id ?? ship.shipClassId,
        shipClassName: shipClass?.name ?? `Klasse #${ship.shipClassId}`,
        isCloaked: isCloaked(ship),
      };
      await repository.save([
        repository.create({
          ...common,
          locationId: origin.id,
          fromDirection: null,
          toDirection: direction,
        }),
        repository.create({
          ...common,
          locationId: destination.id,
          fromDirection: direction === null ? null : this.opposite(direction),
          toDirection: null,
        }),
      ]);
    };
    if (this.masks) await this.masks.withSnapshot(ship, manager, emit);
    else await emit(manager);
  }

  async getVisibleAt(
    locationId: number,
    userId: number,
    now = new Date(),
    includeCloaked = false,
  ): Promise<{
    signatures: VisibleFlightSignature[];
    fadedSignatures: { uncloaked: number; cloaked: number };
  }> {
    const rows = await this.signatureRepo.find({
      where: {
        locationId,
        createdAt: LessThan(now),
      },
      order: { createdAt: 'DESC' },
    });
    return this.classify(rows, userId, now, includeCloaked);
  }

  /**
   * Signature count per location, same rules as `getVisibleAt(..., true)`
   * (visible + faded, cloaked included; STU `getVisibleSignatureCount`).
   */
  async countVisibleAt(
    locationIds: number[],
    userId: number,
    now = new Date(),
  ): Promise<Map<number, number>> {
    const counts = new Map<number, number>();
    if (locationIds.length === 0) return counts;
    // Rows older than the longest window (48 h uncloaked) never count; the list
    // must not load the whole flight history of every colony location.
    const rows = await this.signatureRepo.find({
      where: {
        locationId: In(locationIds),
        createdAt: And(
          MoreThan(new Date(now.getTime() - FLIGHT_SIGNATURE_RETENTION_MS)),
          LessThan(now),
        ),
      },
      order: { createdAt: 'DESC' },
    });
    const byLocation = new Map<number, FlightSignature[]>();
    for (const row of rows) {
      const list = byLocation.get(row.locationId) ?? [];
      list.push(row);
      byLocation.set(row.locationId, list);
    }
    for (const [locationId, list] of byLocation) {
      const { signatures, fadedSignatures } = this.classify(
        list,
        userId,
        now,
        true,
      );
      counts.set(
        locationId,
        signatures.length + fadedSignatures.uncloaked + fadedSignatures.cloaked,
      );
    }
    return counts;
  }

  /** `rows` are the rows of ONE location, newest first. */
  private classify(
    rows: FlightSignature[],
    userId: number,
    now: Date,
    includeCloaked: boolean,
  ): {
    signatures: VisibleFlightSignature[];
    fadedSignatures: { uncloaked: number; cloaked: number };
  } {
    const latest = new Map<number, FlightSignature>();
    for (const row of rows) {
      if (row.userId !== userId && !latest.has(row.spacecraftId)) {
        latest.set(row.spacecraftId, row);
      }
    }
    const signatures: VisibleFlightSignature[] = [];
    const fadedSignatures = { uncloaked: 0, cloaked: 0 };
    for (const row of latest.values()) {
      if (row.isCloaked && !includeCloaked) continue;
      const age = now.getTime() - row.createdAt.getTime();
      const signatureWindow = row.isCloaked ? 18 * HOUR : 48 * HOUR;
      const classWindow = row.isCloaked ? 12 * HOUR : 24 * HOUR;
      const nameWindow = row.isCloaked ? 0 : 12 * HOUR;
      if (age >= signatureWindow) continue;
      if (age >= classWindow) {
        fadedSignatures[row.isCloaked ? 'cloaked' : 'uncloaked'] += 1;
        continue;
      }
      signatures.push({
        id: row.id,
        spacecraftId: row.spacecraftId,
        shipClassId: row.shipClassId,
        shipClassName: row.shipClassName,
        spacecraftName: age < nameWindow ? row.spacecraftName : null,
        fromDirection: row.fromDirection,
        toDirection: row.toDirection,
        isCloaked: row.isCloaked,
        createdAt: row.createdAt.toISOString(),
      });
    }
    return { signatures, fadedSignatures };
  }

  deleteExpired(now = new Date()): Promise<unknown> {
    return this.signatureRepo.delete({
      createdAt: LessThan(
        new Date(now.getTime() - FLIGHT_SIGNATURE_RETENTION_MS),
      ),
    });
  }

  private opposite(direction: FlightDirection): FlightDirection {
    return {
      NORTH: 'SOUTH',
      EAST: 'WEST',
      SOUTH: 'NORTH',
      WEST: 'EAST',
    }[direction] as FlightDirection;
  }
}
