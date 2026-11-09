import { MODULE_METADATA } from '@nestjs/common/constants';
import { GameGateway } from '../websocket/game.gateway';
import { WebsocketModule } from '../websocket/websocket.module';
import { MessagingModule } from './messaging.module';

describe('MessagingModule', () => {
  it('imports the module that exports GameGateway for message notifications', () => {
    const imports: unknown[] = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      MessagingModule,
    );
    const exports: unknown[] = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      WebsocketModule,
    );

    expect(imports).toContain(WebsocketModule);
    expect(exports).toContain(GameGateway);
  });
});
