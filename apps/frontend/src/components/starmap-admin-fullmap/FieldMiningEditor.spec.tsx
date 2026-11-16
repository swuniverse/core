import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FieldMiningEditor } from './FieldMiningEditor';
import type { StarmapFieldTypeDto } from '@swuniverse/shared';
const mocks = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock('../../services/api', () => ({ api: mocks }));
it('edits named resources and rates for an entire field type', async () => {
  mocks.get.mockResolvedValue([
    { id: 3, name: 'Tibanna-Gas' },
    { id: 9, name: 'Phrik-Erz' },
  ]);
  mocks.patch.mockResolvedValue([{ commodityId: 9, rate: 75 }]);
  const saved = vi.fn();
  render(
    <FieldMiningEditor
      fieldType={
        {
          id: 8,
          name: 'Nebel',
          miningResources: [{ commodityId: 3, rate: 100 }],
        } as StarmapFieldTypeDto
      }
      onSaved={saved}
    />,
  );
  await screen.findByRole('option', { name: 'Phrik-Erz' });
  fireEvent.change(screen.getByLabelText('Ware 1'), { target: { value: '9' } });
  fireEvent.change(screen.getByLabelText('Rate 1'), {
    target: { value: '75' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Ressourcen speichern' }));
  await waitFor(() =>
    expect(saved).toHaveBeenCalledWith([{ commodityId: 9, rate: 75 }]),
  );
  expect(mocks.patch).toHaveBeenCalledWith(
    '/starmap/admin/field-types/8/mining',
    { resources: [{ commodityId: 9, rate: 75 }] },
  );
});
