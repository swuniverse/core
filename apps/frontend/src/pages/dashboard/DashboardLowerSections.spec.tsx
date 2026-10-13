import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  DashboardLimits,
  DashboardMessages,
  RecentEvents,
} from './DashboardLowerSections';
import type { DashboardData } from './types';

describe('STU-style Maindesk overview', () => {
  it('puts HoloNet posts beside colony and crew limits', () => {
    const data = {
      holonetPosts: [
        {
          id: 4,
          title: 'Neue Republik gegründet',
          createdAt: '2026-09-21T12:00:00.000Z',
          category: 'RP',
          commentCount: 3,
          authorName: 'Leia',
        },
      ],
      colonizationLimits: {
        limits: {
          planet: { type: 'PLANET', count: 1, limit: 2, max: 5 },
          moon: { type: 'MOON', count: 0, limit: 1, max: 3 },
          asteroid: { type: 'ASTEROID', count: 0, limit: 1, max: 3 },
        },
      },
      crewInfo: { assigned: 4, globalLimit: 12 },
    } as DashboardData;

    render(
      <MemoryRouter>
        <DashboardMessages data={data} />
        <DashboardLimits data={data} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Neue HoloNet-Beiträge (1)')).toBeTruthy();
    expect(screen.getByText('Neue Republik gegründet')).toBeTruthy();
    expect(screen.getByText('Kolonielimitierung')).toBeTruthy();
    expect(screen.getByText('Crewlimitierung')).toBeTruthy();
    expect(screen.getByText('4/12')).toBeTruthy();
    expect(
      screen.getByTitle('Planeten').querySelector('img')?.getAttribute('src'),
    ).toBe('/assets/planets/201s.png');
    expect(
      screen.getByTitle('Monde').querySelector('img')?.getAttribute('src'),
    ).toBe('/assets/planets/401s.png');
    expect(
      screen.getByTitle('Asteroiden').querySelector('img')?.getAttribute('src'),
    ).toBe('/assets/planets/701s.png');
    expect(
      screen.getByTitle('Crew auf Schiffen und Stationen').getAttribute('src'),
    ).toBe('/assets/navigation/menu_ships0.png');
    expect(screen.getByTitle('Globales Crewlimit').getAttribute('src')).toBe(
      '/assets/bev/bev_free_5_1.png',
    );
  });

  it('shows at most ten recent global events with their date, time, location, and history link', () => {
    const data = {
      recentEvents: Array.from({ length: 11 }, (_, index) => ({
        id: index + 1,
        type: 'SHIP_DESTROYED',
        text: `Ereignis ${index + 1}`,
        scope: 'GALAXY',
        layerId: 3,
        systemId: null,
        x: index + 10,
        y: index + 20,
        locationId: null,
        location: null,
        createdAt: '2026-10-13T14:30:00.000Z',
      })),
    } as DashboardData;

    render(
      <MemoryRouter>
        <RecentEvents data={data} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Ereignis 10')).toBeTruthy();
    expect(screen.queryByText('Ereignis 11')).toBeNull();
    expect(screen.getAllByText(/13\.10\.2026/)).toHaveLength(10);
    expect(screen.getAllByText(/16:30/)).toHaveLength(10);
    expect(screen.getByText('Ebene 3 · 10|20')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Alle Ereignisse' }).getAttribute('href'),
    ).toBe('/events');
  });

  it('explains when no recent global events exist', () => {
    render(
      <MemoryRouter>
        <RecentEvents data={{ recentEvents: [] } as unknown as DashboardData} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Keine aktuellen Ereignisse.')).toBeTruthy();
  });
});
