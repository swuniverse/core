import { fireEvent, render, screen } from '@testing-library/react';
import { LostCrewSection } from './LostCrewSection';

const apiMocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../../services/api', () => ({ api: apiMocks }));

describe('LostCrewSection', () => {
  it('lists pods with own crew on demand', async () => {
    apiMocks.get.mockResolvedValue([
      {
        podId: 5,
        originShipName: 'Falcon',
        crewCount: 3,
        displayName: 'Rettungskapseln',
        icon: null,
        location: { scope: 'GALAXY', layerId: 1, x: 4, y: 7 },
      },
    ]);
    render(<LostCrewSection />);

    fireEvent.click(screen.getByText('Verschollene Crew'));

    expect(await screen.findByText('Falcon')).toBeTruthy();
    expect(screen.getByText('4|7')).toBeTruthy();
    expect(apiMocks.get).toHaveBeenCalledWith('/spacecraft/lost-crew');
  });

  it('shows an empty hint', async () => {
    apiMocks.get.mockResolvedValue([]);
    render(<LostCrewSection />);
    fireEvent.click(screen.getByText('Verschollene Crew'));
    expect(await screen.findByText(/Keine deiner Crewmitglieder/)).toBeTruthy();
  });
});
