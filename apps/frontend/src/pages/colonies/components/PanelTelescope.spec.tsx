import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ColonyTelescopeDto } from '@swuniverse/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { colonyApi } from '../api';
import { PanelTelescope } from './PanelTelescope';

vi.mock('../api', () => ({
  colonyApi: { fetchTelescope: vi.fn(), scanTelescope: vi.fn() },
}));

const field = {
  id: 1,
  cx: 2,
  cy: 2,
  fieldTypeId: 1,
  fieldType: { id: 1, name: 'Leerer Raum' },
  systemTypeId: null,
  systemType: null,
  explorationLevel: 'FULL',
} as ColonyTelescopeDto['fields'][number];

const view = (required: number | null): ColonyTelescopeDto => ({
  layer: { id: 3, width: 101, height: 101 },
  origin: { x: 1, y: 1 },
  center: { x: 1, y: 1 },
  viewport: { width: 20, height: 20 },
  fields: [field],
  hiddenCount: 0,
  energy: { available: 123, required },
});

describe('PanelTelescope', () => {
  beforeEach(() => {
    vi.mocked(colonyApi.fetchTelescope).mockReset();
    vi.mocked(colonyApi.scanTelescope).mockReset();
  });

  it('scans the selected field and shows anonymous hull-category counts', async () => {
    vi.mocked(colonyApi.fetchTelescope).mockImplementation(
      (_colonyId, _centerX, _centerY, targetX, targetY) =>
        Promise.resolve(view(targetX != null && targetY != null ? 23 : null)),
    );
    vi.mocked(colonyApi.scanTelescope).mockResolvedValue({
      target: { x: 2, y: 2 },
      energy: { available: 100, spent: 23 },
      categories: [
        { category: 'Jäger', amount: 4 },
        { category: 'Kreuzer', amount: 1 },
      ],
    });

    render(<PanelTelescope colonyId={7} />);

    fireEvent.click(await screen.findByTitle('2|2 · Leerer Raum'));
    const scanButton = await screen.findByRole('button', { name: 'Scan starten' });
    await waitFor(() => expect((scanButton as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(scanButton);

    expect(await screen.findByText('Jäger')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('Kreuzer')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.queryByText(/Eigentümer/)).toBeNull();
    expect(colonyApi.scanTelescope).toHaveBeenCalledWith(7, 2, 2);
    expect(screen.getByText('Energie verfügbar / benötigt: 100 / 23')).toBeTruthy();
  });

  it('shows backend-calculated energy after selecting a field', async () => {
    vi.mocked(colonyApi.fetchTelescope).mockImplementation(
      (_colonyId, _centerX, _centerY, targetX, targetY) =>
        Promise.resolve(view(targetX != null && targetY != null ? 23 : null)),
    );

    render(<PanelTelescope colonyId={7} />);

    fireEvent.click(await screen.findByTitle('2|2 · Leerer Raum'));

    await waitFor(() => {
      expect(screen.getByText('Energie verfügbar / benötigt: 123 / 23')).toBeTruthy();
    });
    expect(colonyApi.fetchTelescope).toHaveBeenLastCalledWith(7, 1, 1, 2, 2);
    expect(
      (screen.getByRole('button', { name: /Scan starten/ }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });
});
