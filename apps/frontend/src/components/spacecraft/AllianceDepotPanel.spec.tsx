import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AllianceDepotPanel } from './AllianceDepotPanel';
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('../../services/api', () => ({ api: mocks }));
const data = {
  alliance: null,
  ownAlliance: { id: 3, name: 'Logistik' },
  blockReason: null,
};
describe('AllianceDepotPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue(data);
    mocks.put.mockResolvedValue({});
    mocks.delete.mockResolvedValue({});
  });
  it('assigns and releases the owner depot, refreshing its visible association', async () => {
    const changed = vi.fn();
    render(
      <AllianceDepotPanel stationId={7} refreshKey={0} onChanged={changed} />,
    );
    const assign = await screen.findByRole('button', {
      name: 'Der Allianz Logistik zuordnen',
    });
    mocks.get.mockResolvedValue({ ...data, alliance: data.ownAlliance });
    fireEvent.click(assign);
    const remove = await screen.findByRole('button', {
      name: 'Zuordnung lösen',
    });
    expect(mocks.put).toHaveBeenCalledWith('/spacecraft/7/alliance-depot', {});
    mocks.get.mockResolvedValue(data);
    fireEvent.click(remove);
    await screen.findByText('Keiner Allianz zugeordnet.');
    expect(mocks.delete).toHaveBeenCalledWith('/spacecraft/7/alliance-depot');
    expect(changed).toHaveBeenCalledTimes(2);
  });
  it('explains missing membership and does not offer assignment', async () => {
    mocks.get.mockResolvedValue({
      ...data,
      ownAlliance: null,
      blockReason: 'Du bist in keiner Allianz',
    });
    render(
      <AllianceDepotPanel stationId={7} refreshKey={0} onChanged={vi.fn()} />,
    );
    await screen.findByText('Du bist in keiner Allianz');
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('disables an unsuitable station and keeps API errors visible', async () => {
    mocks.get.mockResolvedValue({
      ...data,
      blockReason: 'Depotstation ist nicht betriebsbereit',
    });
    const view = render(
      <AllianceDepotPanel stationId={7} refreshKey={0} onChanged={vi.fn()} />,
    );
    const button = await screen.findByRole('button');
    expect((button as HTMLButtonElement).disabled).toBe(true);
    mocks.get.mockResolvedValue(data);
    view.rerender(
      <AllianceDepotPanel stationId={7} refreshKey={1} onChanged={vi.fn()} />,
    );
    await screen.findByText('Keiner Allianz zugeordnet.');
    mocks.put.mockRejectedValue(new Error('Station wird gerade geändert'));
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(
        'Station wird gerade geändert',
      ),
    );
  });
});
