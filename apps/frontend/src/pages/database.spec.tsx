import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { DatabasePage } from './database';


const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('../services/api', () => ({
  api: apiMocks,
}));

describe('DatabasePage', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/database/overview') {
        return Promise.resolve({
          settlers: 1,
          colonies: 0,
          ships: 0,
          totalTechs: 0,
          sections: [],
        });
      }
      if (url === '/database/settlers') {
        return Promise.resolve([
          {
            id: 1,
            username: 'vader',
            displayName: 'Vader',
            avatar: null,
            description: '[b]Böse[/b] [quote]Drohung[/quote]',
            factionName: 'Imperium',
            prestige: 10,
            colonies: 1,
            ships: 2,
            completedResearch: 3,
            onboardingCompleted: true,
            isAdmin: false,
            createdAt: '2026-08-04T00:00:00.000Z',
          },
        ]);
      }
      if (url === '/database/rankings') {
        return Promise.resolve({ research: [], prestige: [], colonies: [] });
      }
      throw new Error(`Unexpected URL ${url}`);
    });
  });

  it('renders settler descriptions through BBCode', async () => {
    const { container } = render(<DatabasePage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Siedlerliste' }));
    fireEvent.click(await screen.findByText('Vader'));

    await waitFor(() => {
      expect(container.querySelector('strong')?.textContent).toBe('Böse');
      expect(container.querySelector('blockquote')?.textContent).toBe('Drohung');
    });
    expect(container.textContent).not.toContain('[b]');
    expect(container.textContent).not.toContain('[quote]');
  });
});
