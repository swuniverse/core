import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { WidgetOnlinePlayers } from './WidgetOnlinePlayers';
import type { DashboardData } from '../types';

function createDashboardData(): DashboardData {
  return {
    activeResearch: null,
    queuedResearch: null,
    buildJobs: [],
    holonetPosts: [],
    colonizationLimits: null,
    crewInfo: null,
    onlinePlayers: [
      {
        id: 7,
        username: 'Leia',
        faction: 'REBEL_ALLIANCE',
        avatar: '/avatar.png',
      },
    ],
    colonyCount: 0,
    fleetTotal: 0,
    fleetInFlight: 0,
    shipsInFlight: [],
    allShips: [],
    researchCompleted: 0,
    unreadMessages: 0,
    warnings: [],
    colonyEvents: [],
    serverStats: null,
    inboxMessages: [],
    tickStatus: null,
    currentObjective: null,
    baustelleAlerts: [],
  };
}

describe('WidgetOnlinePlayers', () => {
  it('links online player avatars to profiles', () => {
    render(
      <MemoryRouter>
        <WidgetOnlinePlayers data={createDashboardData()} />
      </MemoryRouter>,
    );

    const image = screen.getByRole('img', { name: 'Leia Profilbild' });
    expect(image.getAttribute('alt')).toBe('Leia Profilbild');
    expect(
      screen
        .getByRole('link', { name: 'Leia Profilbild' })
        .getAttribute('href'),
    ).toBe('/players/7');
  });
});
