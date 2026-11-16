import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LostCrewSection } from './LostCrewSection';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../../services/api', () => ({ api: apiMocks }));

describe('LostCrewSection', () => {
  beforeEach(() => { apiMocks.get.mockReset(); apiMocks.post.mockReset(); });
  it('lists pods with own crew on demand', async () => {
    apiMocks.get.mockImplementation((path: string) => Promise.resolve(path === '/spacecraft/lost-crew' ? [
      {
        podId: 5,
        originShipName: 'Falcon',
        crewCount: 3,
        displayName: 'Rettungskapseln',
        icon: null,
        location: { scope: 'GALAXY', layerId: 1, x: 4, y: 7 },
      },
    ] : []));
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


it('lists waiting crew at posts and lets its owner withdraw crew from a foreign ship', async () => {
  apiMocks.get.mockImplementation((path: string) => Promise.resolve(path.endsWith('/trade-posts') ? [{ tradePostId: 1, name: 'Naboo', crewCount: 2, location: { x: 8, y: 9 } }] : path.endsWith('/ships') ? [{ crewId: 4, name: 'Leia', shipId: 5, shipName: 'Gastschiff' }] : []));
  apiMocks.post.mockResolvedValue({});
  render(<LostCrewSection />);
  fireEvent.click(screen.getByText('Verschollene Crew'));
  expect(await screen.findByText('Naboo')).toBeTruthy();
  expect(screen.getByText('8|9')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Leia abziehen' }));
  await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/5/crew/4/release', {}));
});
