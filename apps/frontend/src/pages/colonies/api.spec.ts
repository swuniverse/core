import { api } from '../../services/api';
import { colonyApi } from './api';

describe('colony repair API', () => {
  afterEach(() => vi.restoreAllMocks());

  it('requests the single field repair preview with its field index', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({
      fields: [],
      totalEnergyCost: 0,
      totalCosts: [],
    });

    await colonyApi.fetchBuildingRepairPreview(31, [82]);

    expect(get).toHaveBeenCalledWith(
      '/colonies/31/buildings/repair-preview?fieldIndexes=82',
    );
  });

  it('posts a single repair to the selected field route', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({});

    await colonyApi.repairBuilding(31, 82);

    expect(post).toHaveBeenCalledWith('/colonies/31/fields/82/repair', {});
  });
});
