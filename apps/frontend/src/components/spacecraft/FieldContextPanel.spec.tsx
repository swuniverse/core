import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FieldContextPanel } from './FieldContextPanel';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api', () => ({
  api: apiMocks,
}));

describe('FieldContextPanel', () => {
  it('disables system exit when no hyperdrive is available', () => {
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={1}
          context={{
            coordinates: { x: 5, y: 23 },
            starSystem: {
              id: 7,
              name: 'Testsystem',
              canLeave: false,
              leaveReason: 'Kein Hyperantrieb installiert',
            },
            colony: null,
            information: {
              canSectorScan: false,
              cartographyKnown: false,
            },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    const button = screen.getByRole('button', { name: 'System verlassen' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute('title')).toBe('Kein Hyperantrieb installiert');
  });

  it('lands from the ship colony controls after both transfer buttons', async () => {
    apiMocks.post.mockResolvedValue({});
    const onLanded = vi.fn();
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={7}
          context={{
            coordinates: { x: 1, y: 4 },
            starSystem: null,
            colony: {
              id: 3,
              name: 'Alpha',
              planetName: 'Alpha',
              isOwn: true,
              canLand: true,
            },
            information: {
              canSectorScan: false,
              cartographyKnown: true,
            },
          }}
          onUpdate={vi.fn()}
          onLanded={onLanded}
        />
      </MemoryRouter>,
    );

    const buttons = screen.getAllByRole('button');
    const unloadIndex = buttons.indexOf(
      screen.getByRole('button', { name: 'Entladen' }),
    );
    const landIndex = buttons.indexOf(
      screen.getByRole('button', { name: 'Landen' }),
    );
    const loadIndex = buttons.indexOf(
      screen.getByRole('button', { name: 'Verladen' }),
    );
    expect(loadIndex).toBe(unloadIndex + 1);
    expect(landIndex).toBe(loadIndex + 1);

    fireEvent.click(screen.getByRole('button', { name: 'Landen' }));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/colonies/3/ships/7/land',
        {},
      ),
    );
    expect(onLanded).toHaveBeenCalledWith(3);
  });

  it('hides landing when the current ship cannot land', () => {
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={7}
          context={{
            coordinates: { x: 1, y: 4 },
            starSystem: null,
            colony: {
              id: 3,
              name: 'Alpha',
              planetName: 'Alpha',
              isOwn: true,
              canLand: false,
            },
            information: {
              canSectorScan: false,
              cartographyKnown: true,
            },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: 'Landen' })).toBeNull();
  });

  it('shows landing errors in the ship context', async () => {
    apiMocks.post.mockRejectedValue(new Error('Nicht genug Lagerraum'));
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={7}
          context={{
            coordinates: { x: 1, y: 4 },
            starSystem: null,
            colony: {
              id: 3,
              name: 'Alpha',
              planetName: 'Alpha',
              isOwn: true,
              canLand: true,
            },
            information: {
              canSectorScan: false,
              cartographyKnown: true,
            },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Landen' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Nicht genug Lagerraum',
    );
  });

  it('shows the STU-style colonization action for an uncolonized target', () => {
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={7}
          canColonize
          context={{
            coordinates: { x: 1, y: 4 },
            starSystem: null,
            colony: null,
            information: {
              canSectorScan: false,
              cartographyKnown: true,
              colonizationTarget: {
                celestialObjectId: 9,
                name: 'Tatooine',
                classId: 701,
                className: 'Klasse M',
                isAbandoned: false,
              },
            },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Klasse M')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /Kolonie gründen/ }),
    ).toBeTruthy();
  });

  it('does not show a colonization action for an occupied colony', () => {
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={7}
          canColonize
          context={{
            coordinates: { x: 1, y: 4 },
            starSystem: null,
            colony: {
              id: 3,
              name: 'Alpha',
              planetName: 'Alpha',
              isOwn: true,
              canLand: false,
            },
            information: {
              canSectorScan: false,
              cartographyKnown: true,
              colonizationTarget: null,
            },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(
      screen.queryByRole('button', { name: /Kolonie gründen/ }),
    ).toBeNull();
    expect(screen.getByText('Alpha')).toBeTruthy();
  });

  it('labels abandoned colonies as a takeover target', () => {
    render(
      <MemoryRouter>
        <FieldContextPanel
          shipId={7}
          canColonize
          context={{
            coordinates: { x: 1, y: 4 },
            starSystem: null,
            colony: null,
            information: {
              canSectorScan: false,
              cartographyKnown: true,
              colonizationTarget: {
                celestialObjectId: 9,
                name: 'Tatooine',
                classId: 701,
                className: 'Klasse M',
                isAbandoned: true,
              },
            },
          }}
          onUpdate={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('button', { name: /Ruinen übernehmen/ }),
    ).toBeTruthy();
  });
});
