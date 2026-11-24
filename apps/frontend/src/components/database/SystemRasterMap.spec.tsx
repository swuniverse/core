import { fireEvent, render, screen } from '@testing-library/react';
import { SystemRasterMap, type SystemRasterDetail } from './SystemRasterMap';

const detail: SystemRasterDetail = {
  systemTypeId: 0,
  maxX: 3,
  maxY: 1,
  fields: [
    {
      id: 1,
      sx: 1,
      sy: 1,
      fieldType: { id: 120, key: 'neon_nebel_120', name: 'Neon-Nebel' },
      celestialObject: null,
    },
    {
      id: 2,
      sx: 2,
      sy: 1,
      fieldType: { id: 121, key: 'neon_nebel_121', name: 'Dünner Neon-Nebel' },
      celestialObject: {
        id: 3,
        objectType: 1,
        name: 'Planet',
        description: null,
        posX: 2,
        posY: 1,
        classId: 201,
        isColonizable: true,
      },
    },
  ],
};

describe('system database terrain', () => {
  it('shows nebula terrain beneath objects, preserves selection and hides missing fields', () => {
    const select = vi.fn();
    render(
      <SystemRasterMap
        detail={detail}
        selectedFieldId={null}
        onSelectField={select}
      />,
    );
    const cloud = screen.getByRole('button', { name: 'Feld 1:1: Neon-Nebel' });
    expect(cloud.querySelector('img')?.getAttribute('src')).toContain(
      '/map/120.png',
    );
    const planet = screen.getByRole('button', { name: 'Feld 2:1: Planet' });
    expect(planet.querySelector('img[src$="/map/121.png"]')).not.toBeNull();
    expect(planet.querySelectorAll('img').length).toBe(2);
    fireEvent.click(planet);
    expect(select).toHaveBeenCalledWith(2);
    const unknown = screen.getByRole('button', {
      name: /Feld 3:1: Unkartographiertes/,
    });
    expect((unknown as HTMLButtonElement).disabled).toBe(true);
    expect(unknown.querySelector('img')).toBeNull();
  });
});
