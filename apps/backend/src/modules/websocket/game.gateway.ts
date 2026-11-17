import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { DataSource, In } from 'typeorm';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import type { SpacecraftVisibilityPayload } from '@swuniverse/shared';
import { Logger, Optional } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { WsEventType } from '@swuniverse/shared';

@WebSocketGateway({ namespace: '/game', cors: { origin: '*' } })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);
  private readonly userSockets = new Map<number, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    @Optional() private readonly db?: DataSource,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      client.data.userId = userId;

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      client.join(`user:${userId}`);
      this.logger.debug(`Client ${client.id} connected (user ${userId})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.userSockets.get(userId)?.delete(client.id);
      if (this.userSockets.get(userId)?.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  emitToUser(userId: number, event: WsEventType, payload: unknown) {
    return this.publish(
      () => this.server.to(`user:${userId}`).emit(event, payload),
      event,
      payload,
    );
  }

  emitToAll(event: WsEventType, payload: unknown) {
    return this.publish(() => this.server.emit(event, payload), event, payload);
  }

  /** Explicit post-commit removal/state publication, already audience-scoped. */
  emitVisibilityToUser(userId: number, payload: SpacecraftVisibilityPayload) {
    this.server
      .to(`user:${userId}`)
      .emit(WsEventType.SPACECRAFT_VISIBILITY_CHANGED, payload);
  }

  private publish(
    emit: () => void,
    event: WsEventType,
    payload: unknown,
  ): void | Promise<void> {
    if (
      !this.db ||
      ![
        WsEventType.SPACECRAFT_EVENT,
        WsEventType.SHIP_MOVED,
        WsEventType.DISTRESS_CHANGED,
        WsEventType.COMBAT_STARTED,
      ].includes(event)
    ) {
      emit();
      return;
    }
    const value = payload as {
      shipId?: number;
      spacecraftId?: number;
      attackerId?: number;
      defenderId?: number;
    };
    const ids = [
      value?.shipId,
      value?.spacecraftId,
      value?.attackerId,
      value?.defenderId,
    ].filter((id): id is number => Number.isInteger(id));
    if (!ids.length) {
      emit();
      return;
    }
    // A share lock orders ordinary events before a subsequent administrative hide.
    return this.db
      .transaction(async (manager) => {
        const ships = await manager.find(Spacecraft, {
          where: { id: In(ids) },
          lock: { mode: 'pessimistic_read' },
        });
        if (!ships.some((ship) => ship.rpgHidden)) emit();
      })
      .catch((error) =>
        this.logger.error('Spacecraft event visibility check failed', error),
      );
  }

  get onlineCount(): number {
    return this.userSockets.size;
  }

  get onlineUserIds(): number[] {
    return [...this.userSockets.keys()];
  }
}
