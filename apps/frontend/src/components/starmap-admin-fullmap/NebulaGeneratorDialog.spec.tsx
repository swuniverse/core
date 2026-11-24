import { act, fireEvent, render, screen } from '@testing-library/react';
import type { NebulaPreviewDto } from '@swuniverse/shared';
import { planetThumbnail, starTileImage, systemTypeImage } from '../../lib/assets';
import { NebulaGeneratorDialog } from './NebulaGeneratorDialog';
import { FullMapToolbar } from './FullMapToolbar';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  storeState: {
    fieldTypes: [
      { id: 1, name: 'Leerer Raum', key: 'EMPTY_SPACE', category: 'space' },
      { id: 2, name: 'Sternsystem', key: 'STAR_CORE', category: 'star' },
      { id: 100, name: 'Dünner Nebel', key: 'NEBULA', category: 'nebula' },
    ],
    loadFields: vi.fn(),
    layers: [],
    selectedLayerId: null,
    selectLayer: vi.fn(),
    deleteSelectedLayer: vi.fn(),
    status: '',
    initializeDefaultStarWarsGalaxy: vi.fn(),
    initializeLayerGrid: vi.fn(),
    generateSystemsForLayer: vi.fn(),
    worldResetTactical: vi.fn(),
    setEmptyPlanetsToSwu: vi.fn(),
    setEmptyPlanetsToStu: vi.fn(),
    resetUninhabitedColonies: vi.fn(),
    exportLayer: vi.fn(),
    importLayer: vi.fn(),
  },
}));

vi.mock('../../services/api', () => ({ api: { post: mocks.post } }));
vi.mock('../../stores/fullmap-editor.store', () => ({
  useFullmapEditorStore: (selector: (state: typeof mocks.storeState) => unknown) =>
    selector(mocks.storeState),
}));

const preview: NebulaPreviewDto = {
  layerId: 12,
  settings: { seed: 'swu-nebula-v1', target: 'BOTH', density: 'BALANCED' },
  fingerprint: 'preview-fingerprint',
  maps: [
    {
      scope: 'GALAXY',
      id: 12,
      name: 'Hauptgalaxie',
      width: 2,
      height: 1,
      fields: [
        { id: 101, x: 1, y: 1, fieldTypeId: 1, label: 'Leerer Raum', objectClassId: null, systemTypeId: null },
        { id: 102, x: 2, y: 1, fieldTypeId: 2, label: 'Alderaan', objectClassId: null, systemTypeId: 3 },
      ],
      changes: [{ fieldId: 102, x: 2, y: 1, fieldTypeId: 100 }],
    },
    {
      scope: 'SYSTEM',
      id: 44,
      name: 'Alderaan',
      width: 8,
      height: 8,
      systemTypeId: 1049,
      fields: [
        { id: 201, x: 1, y: 1, fieldTypeId: 1, label: 'Organischer Planet', objectClassId: 55, systemTypeId: null },
        { id: 202, x: 4, y: 4, fieldTypeId: 2, label: 'Stern A', objectClassId: 9001, systemTypeId: null },
      ],
      changes: [{ fieldId: 201, x: 1, y: 1, fieldTypeId: 100 }],
    },
  ],
  summary: {
    changedFields: 2,
    protectedFields: 3,
    byFieldType: [
      {
        id: 100,
        name: 'Dünner Nebel',
        count: 2,
        energyCost: 4,
        damage: 5,
        specialDamage: 6,
        miningResources: [{ commodityId: 27, rate: 12 }],
        effects: ['SENSORSCHATTEN'],
      },
    ],
  },
};

describe('NebulaGeneratorDialog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.storeState.fieldTypes = [
      { id: 1, name: 'Leerer Raum', key: 'EMPTY_SPACE', category: 'space' },
      { id: 2, name: 'Sternsystem', key: 'STAR_CORE', category: 'star' },
      { id: 100, name: 'Dünner Nebel', key: 'NEBULA', category: 'nebula' },
    ];
    mocks.storeState.layers = [];
    mocks.storeState.selectedLayerId = null;
    mocks.storeState.status = '';
  });

  it('uses the standard settings and previews galaxy and system maps with current tile values', async () => {
    mocks.post.mockResolvedValue(preview);
    render(<NebulaGeneratorDialog layerId={12} onClose={vi.fn()} />);

    expect(screen.getByLabelText('Seed')).toHaveProperty('value', 'swu-nebula-v1');
    expect(screen.getByLabelText('Ziel')).toHaveProperty('value', 'BOTH');
    expect(screen.getByLabelText('Dichte')).toHaveProperty('value', 'BALANCED');
    fireEvent.click(screen.getByRole('button', { name: 'Vorschau erstellen' }));

    await screen.findByText('Spezialschaden');
    expect(mocks.post).toHaveBeenCalledWith(
      '/starmap/admin/layers/12/nebula/preview',
      { seed: 'swu-nebula-v1', target: 'BOTH', density: 'BALANCED' },
    );
    expect(screen.getByText('2', { selector: 'strong' })).not.toBeNull();
    expect(screen.getByText('3', { selector: 'strong' })).not.toBeNull();
    expect(screen.getByText('Dünner Nebel')).not.toBeNull();
    expect(screen.getByText('SENSORSCHATTEN')).not.toBeNull();
    expect(screen.getByText('Ware 27: 12')).not.toBeNull();
    const galaxyChangedCell = screen.getByRole('gridcell', { name: 'Alderaan, aktuell Sternsystem (ID 2), Vorschau Dünner Nebel (ID 100)' });
    expect(galaxyChangedCell.querySelector(`img[src="${systemTypeImage(3)}"]`)).not.toBeNull();
    expect(galaxyChangedCell.querySelector('img[src="/assets/map/100.png"]')).not.toBeNull();
    expect(galaxyChangedCell.querySelectorAll('img').length).toBe(2);
    expect((screen.getByLabelText('Änderungen markieren') as HTMLInputElement).checked).toBe(false);
    expect(galaxyChangedCell.className).toContain('border-white/10');
    fireEvent.click(screen.getByLabelText('Änderungen markieren'));
    expect(galaxyChangedCell.className).toContain('border-emerald-300/70');
    expect(mocks.storeState.loadFields).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Vorschaukarte'), { target: { value: 'SYSTEM:44' } });
    const systemChangedCell = screen.getByRole('gridcell', { name: 'Organischer Planet, aktuell Leerer Raum (ID 1), Vorschau Dünner Nebel (ID 100)' });
    expect(systemChangedCell.querySelector(`img[src="${planetThumbnail(55)}"]`)).not.toBeNull();
    const starCell = screen.getByRole('gridcell', { name: 'Stern A, Sternsystem (ID 2)' });
    expect(starCell.querySelector(`img[src="${starTileImage(104913)}"]`)).not.toBeNull();
    expect(starCell.querySelector(`img[src="${planetThumbnail(9001)}"]`)).toBeNull();
  });

  it('uses a system marker for a star object when system type metadata is missing', async () => {
    mocks.post.mockResolvedValue({
      ...preview,
      maps: [{ ...preview.maps[1], systemTypeId: undefined }],
    });
    render(<NebulaGeneratorDialog layerId={12} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Vorschau erstellen' }));
    await screen.findByRole('gridcell', { name: 'Stern A, Sternsystem (ID 2)' });
    const starCell = screen.getByRole('gridcell', { name: 'Stern A, Sternsystem (ID 2)' });
    expect(starCell.querySelector(`img[src="${systemTypeImage(1001)}"]`)).not.toBeNull();
    expect(starCell.querySelector(`img[src="${planetThumbnail(9001)}"]`)).toBeNull();
  });

  it('discards the preview when a setting changes and ignores an older pending response', async () => {
    let resolvePreview!: (value: NebulaPreviewDto) => void;
    mocks.post.mockImplementationOnce(() => new Promise((resolve) => { resolvePreview = resolve; }));
    render(<NebulaGeneratorDialog layerId={12} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Vorschau erstellen' }));
    expect(screen.getByRole('button', { name: 'Vorschau wird erstellt…' })).not.toBeNull();
    fireEvent.change(screen.getByLabelText('Dichte'), { target: { value: 'RICH' } });
    await act(async () => resolvePreview(preview));

    expect(screen.queryByText('2', { selector: 'strong' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Nebelgebiete übernehmen' })).toBeNull();
    expect(screen.getByLabelText('Dichte')).toHaveProperty('value', 'RICH');
  });

  it('keeps preview and apply requests bound to the layer captured when the dialog opened', async () => {
    const canonicalPreview = { ...preview, settings: { ...preview.settings, seed: 'nebula-custom' } };
    mocks.post.mockResolvedValueOnce(canonicalPreview).mockResolvedValueOnce({ changedFields: 2 });
    const onClose = vi.fn();
    const view = render(<NebulaGeneratorDialog layerId={12} onClose={onClose} />);
    view.rerender(<NebulaGeneratorDialog layerId={99} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText('Seed'), { target: { value: '  nebula-custom  ' } });

    fireEvent.click(screen.getByRole('button', { name: 'Vorschau erstellen' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Nebelgebiete übernehmen' }));

    await screen.findByRole('status');
    expect(mocks.post).toHaveBeenNthCalledWith(
      1,
      '/starmap/admin/layers/12/nebula/preview',
      { seed: 'nebula-custom', target: 'BOTH', density: 'BALANCED' },
    );
    expect(mocks.post).toHaveBeenNthCalledWith(
      2,
      '/starmap/admin/layers/12/nebula/apply',
      { seed: 'nebula-custom', target: 'BOTH', density: 'BALANCED', fingerprint: 'preview-fingerprint' },
    );
    expect(screen.getByLabelText('Seed')).toHaveProperty('value', 'nebula-custom');
    expect(mocks.storeState.loadFields).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status').textContent).toContain('2 Felder wurden mit Nebelgebieten ergänzt.');
    expect(screen.queryByText('2', { selector: 'strong' })).toBeNull();
  });

  it('shows preview failures and leaves apply unavailable', async () => {
    mocks.post.mockRejectedValue(new Error('Berechtigung fehlt'));
    render(<NebulaGeneratorDialog layerId={12} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Vorschau erstellen' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Berechtigung fehlt');
    expect(screen.queryByRole('button', { name: 'Nebelgebiete übernehmen' })).toBeNull();
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });

  it('closes without sending a preview or apply request and disables the toolbar action without a layer', () => {
    const onClose = vi.fn();
    const { rerender } = render(<NebulaGeneratorDialog layerId={12} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mocks.post).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);

    rerender(<FullMapToolbar />);
    expect((screen.getByRole('button', { name: 'Nebelgebiete' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
