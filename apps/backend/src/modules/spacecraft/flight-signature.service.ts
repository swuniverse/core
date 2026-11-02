import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import {
  FlightDirection,
  FlightSignature,
} from './entities/flight-signature.entity';
import { Spacecraft } from './entities/spacecraft.entity';
import { ShipClassService } from './ship-class.service';
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
  ) {}

  async createMovement(
    ship: Spacecraft,
    origin: SpaceLocation | null,
    destination: SpaceLocation | null,
    direction: FlightDirection,
  ): Promise<void> {
    if (!origin || !destination) return;
    const shipClass = await this.shipClassService.findById(ship.shipClassId);
    const common = {
      userId: ship.userId,
      spacecraftId: ship.id,
      spacecraftName: ship.name,
      shipClassId: ship.shipClassId,
      shipClassName: shipClass?.name ?? `Klasse #${ship.shipClassId}`,
      isCloaked: isCloaked(ship),
    };
    await this.signatureRepo.save([
      this.signatureRepo.create({
        ...common,
        locationId: origin.id,
        fromDirection: null,
        toDirection: direction,
      }),
      this.signatureRepo.create({
        ...common,
        locationId: destination.id,
        fromDirection: this.opposite(direction),
        toDirection: null,
      }),
    ]);
  }

  async getVisibleAt(
    locationId: number,
    userId: number,
    now = new Date(),
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
    const latest = new Map<number, FlightSignature>();
    for (const row of rows) {
      if (row.userId !== userId && !latest.has(row.spacecraftId)) {
        latest.set(row.spacecraftId, row);
      }
    }
    const signatures: VisibleFlightSignature[] = [];
    const fadedSignatures = { uncloaked: 0, cloaked: 0 };
    for (const row of latest.values()) {
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
