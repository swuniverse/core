import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import { EventsPage } from './events';

const apiMocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('../services/api', () => ({ api: apiMocks }));

const eventResponse = {
  events: [
    {
      id: 7,
      type: 'SHIP',
      text: 'Imperial corvette destroyed',
      scope: 'GALAXY',
      layerId: 3,
      systemId: null,
      x: 4,
      y: 8,
      locationId: null,
      location: null,
      createdAt: '2026-10-13T10:00:00.000Z',
    },
  ],
  counts: {
    SHIP: 3,
    STATION: 0,
    COLONY: 0,
    ALLIANCE: 0,
    OTHER: 0,
  },
};

function Location() {
  return <output data-testid="location">{useLocation().search}</output>;
}

function renderPage(initialEntry = '/events') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/events" element={<EventsPage />} />
        <Route path="/starmap" element={<Location />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('EventsPage', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.get.mockResolvedValue(eventResponse);
  });

  it('loads stable URL filters, counts, and event results', async () => {
    renderPage('/events?type=SHIP&q=imperial&limit=50');

    await waitFor(() =>
      expect(apiMocks.get).toHaveBeenCalledWith(
        '/events/recent?type=SHIP&search=imperial&limit=50',
      ),
    );

    expect(screen.getByLabelText('Ereignistyp')).toHaveProperty(
      'value',
      'SHIP',
    );
    expect(screen.getByLabelText('Suche')).toHaveProperty('value', 'imperial');
    expect(screen.getByLabelText('Ergebnislimit')).toHaveProperty(
      'value',
      '50',
    );
    expect(screen.getByText('Schiffe: 3')).toBeTruthy();
    expect(screen.getByText('Station: 0')).toBeTruthy();
    expect(screen.getByText('Kolonie: 0')).toBeTruthy();
    expect(screen.getByText('Diplomatie: 0')).toBeTruthy();
    expect(screen.getByText('Sonstiges: 0')).toBeTruthy();
    expect(screen.queryByText('Systemeintritte: 1')).toBeNull();
    expect(screen.getByText('Imperial corvette destroyed')).toBeTruthy();
  });

  it('updates the URL and request when filters change', async () => {
    renderPage();

    await waitFor(() => expect(apiMocks.get).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText('Ereignistyp'), {
      target: { value: 'SHIP' },
    });
    fireEvent.change(screen.getByLabelText('Suche'), {
      target: { value: 'scout' },
    });
    fireEvent.change(screen.getByLabelText('Ergebnislimit'), {
      target: { value: '50' },
    });

    await waitFor(() =>
      expect(apiMocks.get).toHaveBeenLastCalledWith(
        '/events/recent?type=SHIP&search=scout&limit=50',
      ),
    );
  });

  it('renders a clear empty state', async () => {
    apiMocks.get.mockResolvedValueOnce({
      events: [],
      counts: eventResponse.counts,
    });
    renderPage('/events?q=missing');

    expect(
      await screen.findByText(
        'Keine Ereignisse entsprechen den aktuellen Filtern.',
      ),
    ).toBeTruthy();
  });

  it('only offers safe galaxy targets', async () => {
    renderPage();

    const galaxyLink = await screen.findByRole('link', { name: '4|8' });
    expect(galaxyLink.getAttribute('href')).toBe('/starmap?layer=3&x=4&y=8');
  });
});
