import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { SpacecraftDetailDto, StationTradePostDto } from '@swuniverse/shared';
import { StationTradePostPanel } from './StationTradePostPanel';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(), put: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));

const post: StationTradePostDto = {
  tradePostId: 7,
  name: 'Handelsposten',
  description: 'Treffpunkt am Rand',
  networkId: 120,
  networkName: 'Handelsnetz von Lando',
  storage: { used: 1200, capacity: 10000 },
  condition: { commodityId: 50, commodityName: 'Aurodium', amount: 5, durationDays: 7 },
  licenseeCount: 3,
  tradeableCommodities: [
    { id: 50, name: 'Aurodium' },
    { id: 10101, name: 'Durastahl' },
  ],
};
const station = { id: 2, kind: 'STATION', stationRole: 'OUTPOST' } as SpacecraftDetailDto;

const renderPanel = (ship = station) =>
  render(
    <MemoryRouter>
      <StationTradePostPanel ship={ship} />
    </MemoryRouter>,
  );

describe('StationTradePostPanel', () => {
  beforeEach(() => {
    apiMocks.get.mockReset().mockResolvedValue(post);
    apiMocks.patch.mockReset().mockResolvedValue({});
    apiMocks.put.mockReset().mockResolvedValue({});
  });

  it('renders nothing and loads nothing for ships', () => {
    const { container } = renderPanel({ ...station, kind: 'SHIP' } as SpacecraftDetailDto);
    expect(container.firstChild).toBeNull();
    expect(apiMocks.get).not.toHaveBeenCalled();
  });

  it('renders nothing for a station without trade post', async () => {
    apiMocks.get.mockResolvedValue(null);
    const { container } = renderPanel();
    await waitFor(() => expect(apiMocks.get).toHaveBeenCalledWith('/trade/stations/2/post'));
    expect(container.firstChild).toBeNull();
  });

  it('shows name, network, storage, condition and licensees with a link to the trade page', async () => {
    renderPanel();
    const box = await screen.findByRole('region', { name: 'Handelsposten' });
    expect(box.textContent).toContain('Handelsnetz von Lando');
    expect(box.textContent).toContain('1.200 / 10.000');
    expect(box.textContent).toContain('5 Aurodium für 7 Tage');
    expect(box.textContent).toContain('Lizenznehmer3');
    expect(screen.getByRole('link', { name: 'Zum Handel' }).getAttribute('href')).toBe('/trade?tab=posts&post=7');
  });

  it('renames the post and reloads it', async () => {
    renderPanel();
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'Bespin' } });
    fireEvent.change(screen.getByLabelText('Beschreibung'), { target: { value: 'Wolkenstadt' } });
    fireEvent.click(screen.getByRole('button', { name: 'Umbenennen' }));
    await waitFor(() =>
      expect(apiMocks.patch).toHaveBeenCalledWith('/trade/posts/7', { name: 'Bespin', description: 'Wolkenstadt' }),
    );
    expect(await screen.findByRole('status')).toBeTruthy();
    expect(apiMocks.get).toHaveBeenCalledTimes(2);
  });

  it('saves the license condition and shows server errors', async () => {
    apiMocks.put.mockRejectedValueOnce(new Error('Ware ist nicht handelbar'));
    renderPanel();
    fireEvent.change(await screen.findByLabelText('Ware'), { target: { value: '10101' } });
    fireEvent.change(screen.getByLabelText('Menge'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Tage'), { target: { value: '14' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bedingung speichern' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Ware ist nicht handelbar');

    fireEvent.click(screen.getByRole('button', { name: 'Bedingung speichern' }));
    await waitFor(() =>
      expect(apiMocks.put).toHaveBeenLastCalledWith('/trade/posts/7/license-info', {
        commodityId: 10101,
        amount: 20,
        durationDays: 14,
      }),
    );
  });
});
