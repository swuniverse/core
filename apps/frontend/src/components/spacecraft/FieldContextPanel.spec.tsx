import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FieldContextPanel } from './FieldContextPanel';

vi.mock('../../services/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
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
});
