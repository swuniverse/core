import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  NotFoundException,
} from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { In } from 'typeorm';
import { defer, lastValueFrom } from 'rxjs';
import { Spacecraft } from './entities/spacecraft.entity';
import { RpgActionLockService } from './rpg-action-lock.service';

/** Covers direct player endpoints, including adapters outside the spacecraft module. */
@Injectable()
export class RpgSpacecraftAccessInterceptor implements NestInterceptor {
  constructor(private readonly actions: RpgActionLockService) {}
  async intercept(context: ExecutionContext, next: CallHandler) {
    if (context.getType() !== 'http') return next.handle();
    const controller = String(
      Reflect.getMetadata(PATH_METADATA, context.getClass()) ?? '',
    );
    const handler = String(
      Reflect.getMetadata(PATH_METADATA, context.getHandler()) ?? '',
    );
    if ((controller + '/' + handler).split('/').includes('admin'))
      return next.handle();
    const req = context.switchToHttp().getRequest();
    const ids = new Set<number>();
    const keys = new Set([
      'shipId',
      'spacecraftId',
      'attackerId',
      'defenderId',
      'sourceShipId',
      'targetShipId',
      'stationId',
      'carrierId',
      'leaderId',
      'shipIds',
    ]);
    if (controller.startsWith('spacecraft') || controller === 'combat') {
      keys.add('sourceId');
      keys.add('targetId');
    }
    if (controller === 'spacecraft' && handler.startsWith(':id'))
      keys.add('id');
    const collect = (value: unknown) => {
      if (!value || typeof value !== 'object') return;
      for (const [key, item] of Object.entries(value)) {
        if (keys.has(key))
          for (const candidate of Array.isArray(item) ? item : [item]) {
            const id = Number(candidate);
            if (Number.isInteger(id) && id > 0 && id <= 2147483647) ids.add(id);
          }
        if (typeof item === 'object') collect(item);
      }
    };
    collect(req.params);
    collect(req.query);
    collect(req.body);
    if (!ids.size) return next.handle();
    return defer(() =>
      this.actions.runPlayer([...ids], async (manager) => {
        if (
          await manager.existsBy(Spacecraft, {
            id: In([...ids]),
            rpgHidden: true,
          })
        )
          throw new NotFoundException('Spacecraft not found');
        return await lastValueFrom(next.handle());
      }),
    );
  }
}
