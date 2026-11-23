import { fireEvent, render, screen } from '@testing-library/react';
import { TractorBeamPanel } from './TractorBeamPanel';

vi.mock('../../lib/assets', () => ({ shipImage: (id: number) => `/ships/${id}.png` }));

const peer = { id: 5, name: 'Defiant1', shipClassId: 9, shipClassKey: null };
const handlers = () => ({ onDeactivate: vi.fn(), onDock: vi.fn(), onEscape: vi.fn() });

describe('TractorBeamPanel', () => {
  it('is absent without an active tractor beam like STU', () => {
    const { container } = render(
      <TractorBeamPanel holding={null} heldBy={null} isStation={false} deflectorHealthy {...handlers()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows the held ship and deactivates the beam', () => {
    const h = handlers();
    render(<TractorBeamPanel holding={peer} heldBy={null} isStation={false} deflectorHealthy {...h} />);
    expect(screen.getByText('Gerichtet auf: Defiant1')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Defiant1' }).getAttribute('src')).toBe('/ships/9.png');
    expect(screen.queryByRole('button', { name: 'Gehaltenes Schiff andocken' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'deaktivieren' }));
    expect(h.onDeactivate).toHaveBeenCalled();
  });

  it('offers docking on a station', () => {
    const h = handlers();
    render(<TractorBeamPanel holding={peer} heldBy={null} isStation deflectorHealthy {...h} />);
    fireEvent.click(screen.getByRole('button', { name: 'Gehaltenes Schiff andocken' }));
    expect(h.onDock).toHaveBeenCalled();
  });

  it('offers an escape attempt only with a healthy deflector', () => {
    const h = handlers();
    const { rerender } = render(
      <TractorBeamPanel holding={null} heldBy={peer} isStation={false} deflectorHealthy {...h} />,
    );
    expect(screen.getByText('Gehalten von: Defiant1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Fluchtversuch' }));
    expect(h.onEscape).toHaveBeenCalled();
    rerender(<TractorBeamPanel holding={null} heldBy={peer} isStation={false} deflectorHealthy={false} {...h} />);
    expect(screen.queryByRole('button', { name: 'Fluchtversuch' })).toBeNull();
  });
});
