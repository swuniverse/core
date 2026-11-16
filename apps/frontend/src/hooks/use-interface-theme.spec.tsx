import { act, renderHook, waitFor } from '@testing-library/react';
import { Faction } from '@swuniverse/shared';
import { applyInterfaceTheme, useInterfaceTheme } from './use-interface-theme';
const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../services/api', () => ({ api }));
describe('Persistent interface palettes', () => {
  beforeEach(() => api.get.mockReset());
  it('loads the stored palette for the account and applies its faction', async () => {
    api.get.mockResolvedValue({ css_color_sheet: 'faction' });
    const view = renderHook(() =>
      useInterfaceTheme(1, Faction.GALACTIC_EMPIRE),
    );
    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe('faction'),
    );
    expect(document.documentElement.dataset.faction).toBe(
      Faction.GALACTIC_EMPIRE,
    );
    view.unmount();
    expect(document.documentElement.dataset.theme).toBe('default');
  });
  it('does not overwrite a newer selection with a late settings response', async () => {
    let finish!: (value: Record<string, string>) => void;
    api.get.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    renderHook(() => useInterfaceTheme(1, Faction.REBEL_ALLIANCE));
    act(() => applyInterfaceTheme('contrast', Faction.REBEL_ALLIANCE));
    await act(async () => finish({ css_color_sheet: 'default' }));
    expect(document.documentElement.dataset.theme).toBe('contrast');
  });
});
