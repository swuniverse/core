import { fireEvent, render, screen } from '@testing-library/react';
import { ColonizationDialog } from './ColonizationDialog';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));

describe('ColonizationDialog', () => {
  it('shows allowed field types and only lets allowed fields be chosen', async () => {
    apiMocks.get.mockResolvedValue({
      canColonize: true,
      reasons: [],
      target: {},
      surface: {
        width: 2,
        allowedFieldTypes: [101],
        fields: [
          { fieldIndex: 0, fieldType: 101, terrainTileId: 101, layer: 'SURFACE', selectable: true },
          { fieldIndex: 1, fieldType: 201, terrainTileId: 201, layer: 'SURFACE', selectable: false },
        ],
      },
    });
    render(
      <ColonizationDialog
        shipId={1}
        celestialObjectId={2}
        planetName="Hoth"
        isRuins={false}
        onClose={vi.fn()}
        onColonized={vi.fn()}
      />,
    );

    expect(await screen.findByText(/Erlaubte Feldtypen/)).toBeTruthy();
    const fields = screen.getAllByTitle(/^Feld /) as HTMLButtonElement[];
    expect(fields.map((field) => field.disabled)).toEqual([false, true]);
    fireEvent.click(fields[0]);
    expect((screen.getByRole('button', { name: 'Kolonie gründen' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
