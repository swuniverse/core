import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardForum } from './DashboardForum';
import type { DashboardData } from './types';

const topic = {
  topicId: 7,
  title: 'Angriffsplan',
  boardId: 2,
  boardName: 'Strategie',
  allianceId: 3,
  lastActivityAt: '2026-10-09T10:00:00.000Z',
  linkTo: '/alliances/3/forum/topics/7',
};

function renderForum(forumTopics: DashboardData['forumTopics']) {
  return render(
    <MemoryRouter>
      <DashboardForum data={{ forumTopics } as DashboardData} />
    </MemoryRouter>,
  );
}

describe('DashboardForum', () => {
  it('shows each recent topic linked to the topic page', () => {
    renderForum([topic]);
    expect(screen.getByText('Letzte Forenthemen')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: /Angriffsplan/ }).getAttribute('href'),
    ).toBe('/alliances/3/forum/topics/7');
    expect(screen.getByText(/Strategie/)).toBeTruthy();
  });

  it('renders nothing without alliance topics', () => {
    const { container } = renderForum([]);
    expect(container.innerHTML).toBe('');
  });
});
