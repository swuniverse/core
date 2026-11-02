import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StationShipyardPanel } from './StationShipyardPanel';
import { api } from '../../services/api';

jest.mock('../../services/api', () => ({ api: { get: jest.fn(), post: jest.fn() } }));

describe('StationShipyardPanel', () => {
  it('shows role-filtered build options and starts construction', async () => {
    (api.get as jest.Mock).mockResolvedValue({ options: [{ id: 3, name: 'CR90 Korvette', buildTimeTicks: 4, buildCosts: [{ commodityId: 7, amount: 2, stored: 3 }] }], queues: [] });
    (api.post as jest.Mock).mockResolvedValue({});
    render(<StationShipyardPanel stationId={9} onChanged={jest.fn()} />);
    expect(await screen.findByText('CR90 Korvette')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Schiffsname'), { target: { value: 'Hoffnung' } });
    fireEvent.click(screen.getByRole('button', { name: 'Schiff bauen' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/spacecraft/9/station-shipyard/build', { shipClassId: 3, name: 'Hoffnung', moduleSelections: [] }));
  });
});
