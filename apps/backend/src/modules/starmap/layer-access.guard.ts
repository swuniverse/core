import { CanActivate, ExecutionContext, Injectable, ParseIntPipe } from '@nestjs/common';
import { LayerAccessService, type LayerReader } from './layer-access.service';

@Injectable()
export class LayerAccessGuard implements CanActivate {
  constructor(private readonly access: LayerAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user: LayerReader;
      route: { path: string };
      params: { layerId?: string; id?: string };
      body?: { layerId?: number };
      query: { layerId?: string };
    }>();
    const path = request.route.path;
    if (path.includes('/admin/')) return true;
    if (path.includes('/layers/')) {
      const layerId = await new ParseIntPipe().transform(
        request.params.layerId ?? request.params.id ?? '',
        { type: 'param' },
      );
      await this.access.assertAccess(request.user, layerId);
    } else if (path.includes('/systems/:id')) {
      const id = await new ParseIntPipe().transform(request.params.id ?? '', { type: 'param' });
      await this.access.assertSystemAccess(request.user, id);
    } else if (path.includes('/planets/:id')) {
      const id = await new ParseIntPipe().transform(request.params.id ?? '', { type: 'param' });
      await this.access.assertPlanetAccess(request.user, id);
    } else if (path.includes('/regions/:id')) {
      const id = await new ParseIntPipe().transform(request.params.id ?? '', { type: 'param' });
      await this.access.assertRegionAccess(request.user, id);
    } else if (path.endsWith('/starmap-contacts')) {
      const layerId = await new ParseIntPipe().transform(request.query.layerId ?? '', { type: 'query' });
      await this.access.assertAccess(request.user, layerId);
    } else if (path.endsWith('/exploration/discover-field')) {
      const layerId = await new ParseIntPipe().transform(String(request.body?.layerId ?? ''), { type: 'body' });
      await this.access.assertAccess(request.user, layerId);
    }
    return true;
  }
}
