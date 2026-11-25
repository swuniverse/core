import { act, fireEvent, render, screen } from '@testing-library/react';
import type { NebulaPreviewDto, NebulaVisualDto } from '@swuniverse/shared';
import { spaceBackgroundTile, starTileImage, systemTypeImage } from '../../lib/assets';
import { NebulaGeneratorDialog } from './NebulaGeneratorDialog';
import { FullMapToolbar } from './FullMapToolbar';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  getNebulaDomStyle: vi.fn(),
  organicNebulaEdgeMask: vi.fn(),
  storeState: {
    fieldTypes: [
      { id: 1, name: 'Leerer Raum', key: 'EMPTY_SPACE', category: 'space' },
      { id: 2, name: 'Sternsystem', key: 'STAR_CORE', category: 'star' },
      { id: 100, name: 'Dünner Nebel', key: 'NEBULA', category: 'nebula' },
      { id: 0, name: 'Unbekannt', key: 'UNKNOWN', category: null },
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
vi.mock('../../lib/nebula-texture', () => ({ getNebulaDomStyle: mocks.getNebulaDomStyle }));
vi.mock('../../lib/nebula-contour', () => ({ organicNebulaEdgeMask: mocks.organicNebulaEdgeMask }));
vi.mock('../../stores/fullmap-editor.store', () => ({
  useFullmapEditorStore: (selector: (state: typeof mocks.storeState) => unknown) =>
    selector(mocks.storeState),
}));

const generatedVisual: NebulaVisualDto = {
  version: 2,
  seed: 'nebula-new',
  width: 4,
  height: 1,
  density: 'BALANCED',
};
const existingVisual: NebulaVisualDto = {
  version: 2,
  seed: 'nebula-old',
  width: 4,
  height: 1,
  density: 'SUBTLE',
};

const preview: NebulaPreviewDto = {
  layerId: 12,
  settings: { seed: 'swu-nebula-v1', target: 'GALAXY', density: 'BALANCED' },
  fingerprint: 'preview-fingerprint',
  maps: [
    {
      scope: 'GALAXY',
      id: 12,
      name: 'Hauptgalaxie',
      width: 5,
      height: 1,
      nebulaVisual: generatedVisual,
      fields: [
        { id: 101, x: 1, y: 1, fieldTypeId: 1, label: 'Leerer Raum', objectClassId: null, systemTypeId: null },
        { id: 102, x: 2, y: 1, fieldTypeId: 2, label: 'Alderaan', objectClassId: null, systemTypeId: 3 },
        { id: 103, x: 3, y: 1, fieldTypeId: 100, label: 'Rücksetzfeld', objectClassId: null, systemTypeId: null, nebulaVisual: existingVisual },
        { id: 104, x: 4, y: 1, fieldTypeId: 100, label: 'Bestehendes Nebelfeld', objectClassId: null, systemTypeId: null, nebulaVisual: existingVisual },
        { id: 105, x: 5, y: 1, fieldTypeId: 0, label: 'Unbekanntes Feld', objectClassId: null, systemTypeId: null, nebulaVisual: existingVisual },
      ],
      changes: [
        { fieldId: 102, x: 2, y: 1, fieldTypeId: 100 },
        { fieldId: 103, x: 3, y: 1, fieldTypeId: 1, restore: true },
      ],
    },
  ],
  summary: {
    changedFields: 2,
    protectedFields: 3,
    byFieldType: [
      {
        id: 100,
        name: 'Dünner Nebel',
        count: 1,
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
      { id: 0, name: 'Unbekannt', key: 'UNKNOWN', category: null },
    ];
    mocks.storeState.layers = [];
    mocks.storeState.selectedLayerId = null;
    mocks.storeState.status = '';
    mocks.getNebulaDomStyle.mockImplementation((visual: NebulaVisualDto, x: number, y: number) => ({
      backgroundImage: `url(/nebula-${visual.seed}-${x}-${y}.png)`,
    }));
    mocks.organicNebulaEdgeMask.mockReturnValue({ maskImage: 'url(/organic-mask.png)' });
  });

  it('uses GALAXY defaults, shows only the galaxy, and renders generated, unchanged and restored visuals correctly', async () => {
    mocks.post.mockResolvedValue(preview);
    render(<NebulaGeneratorDialog layerId={12} onClose={vi.fn()} />);

    expect(screen.getByLabelText('Seed')).toHaveProperty('value', 'swu-nebula-v1');
    expect(screen.getByLabelText('Dichte')).toHaveProperty('value', 'BALANCED');
    expect(screen.queryByLabelText('Ziel')).toBeNull();
    expect(screen.queryByLabelText('Vorschaukarte')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Vorschau erstellen' }));

    await screen.findByText('Spezialschaden');
    expect(mocks.post).toHaveBeenCalledWith(
      '/starmap/admin/layers/12/nebula/preview',
      { seed: 'swu-nebula-v1', target: 'GALAXY', density: 'BALANCED' },
    );
    expect(screen.getByRole('grid', { name: 'Galaxie — Hauptgalaxie 5 mal 1' })).not.toBeNull();
    expect(screen.getByText('2', { selector: 'strong' })).not.toBeNull();
    expect(screen.getByText('3', { selector: 'strong' })).not.toBeNull();
    expect(screen.getByText('Dünner Nebel')).not.toBeNull();
    expect(screen.getByText('SENSORSCHATTEN')).not.toBeNull();
    expect(screen.getByText('Ware 27: 12')).not.toBeNull();

    const generatedCell = screen.getByRole('gridcell', {
      name: 'Alderaan: Nebel wird erzeugt; aktuell Sternsystem (ID 2), danach Dünner Nebel (ID 100)',
    });
    expect(generatedCell.querySelector(`img[src="${spaceBackgroundTile(2, 1)}"]`)).not.toBeNull();
    expect(generatedCell.querySelector(`img[src="${starTileImage(100)}"]`)).toBeNull();
    expect(generatedCell.querySelector('[data-nebula-visual="true"]')?.getAttribute('style')).toContain('/nebula-nebula-new-2-1.png');
    expect(generatedCell.querySelector(`img[src="${systemTypeImage(3)}"]`)).not.toBeNull();
    expect(mocks.getNebulaDomStyle).toHaveBeenCalledWith(generatedVisual, 2, 1);
    expect(mocks.organicNebulaEdgeMask).toHaveBeenCalledWith(
      { id: 100, key: 'NEBULA', category: 'nebula' },
      2, 1,
      [
        undefined,
        { id: 1, key: 'EMPTY_SPACE', category: 'space' },
        undefined,
        { id: 1, key: 'EMPTY_SPACE', category: 'space' },
        undefined, undefined, undefined, undefined,
      ],
    );
    expect(mocks.organicNebulaEdgeMask).toHaveBeenCalledTimes(2);

    const restoredCell = screen.getByRole('gridcell', {
      name: 'Rücksetzfeld: Nebel wird zurückgenommen; aktuell Dünner Nebel (ID 100), danach Leerer Raum (ID 1)',
    });
    expect(restoredCell.querySelector('[data-nebula-visual="true"]')).toBeNull();
    expect(restoredCell.querySelector(`img[src="${starTileImage(100)}"]`)).toBeNull();
    expect(restoredCell.querySelector(`img[src="${spaceBackgroundTile(3, 1)}"]`)).not.toBeNull();
    expect(mocks.getNebulaDomStyle).not.toHaveBeenCalledWith(existingVisual, 3, 1);

    const unchangedCell = screen.getByRole('gridcell', {
      name: 'Bestehendes Nebelfeld, bestehender filmischer Nebel (ID 100)',
    });
    expect(unchangedCell.querySelector('[data-nebula-visual="true"]')?.getAttribute('style')).toContain('/nebula-nebula-old-4-1.png');
    expect(mocks.getNebulaDomStyle).toHaveBeenCalledWith(existingVisual, 4, 1);
    expect(mocks.storeState.loadFields).not.toHaveBeenCalled();

    expect((screen.getByLabelText('Änderungen markieren') as HTMLInputElement).checked).toBe(false);
    expect(generatedCell.className).toContain('border-white/10');
    fireEvent.click(screen.getByLabelText('Änderungen markieren'));
    expect(generatedCell.className).toContain('border-emerald-300/70');
  });

  it('invalidates a pending preview when density changes', async () => {
    let resolvePreview!: (value: NebulaPreviewDto) => void;
    mocks.post.mockImplementationOnce(() => new Promise((resolve) => { resolvePreview = resolve; }));
    render(<NebulaGeneratorDialog layerId={12} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Vorschau erstellen' }));
    expect(screen.getByRole('button', { name: 'Vorschau wird erstellt…' })).not.toBeNull();
    fireEvent.change(screen.getByLabelText('Dichte'), { target: { value: 'RICH' } });
    await act(async () => resolvePreview(preview));

    expect(screen.queryByText('2', { selector: 'strong' })).toBeNull();
    expect(document.querySelector('[data-nebula-visual="true"]')).toBeNull();
    expect(screen.getByLabelText('Dichte')).toHaveProperty('value', 'RICH');
  });

  it('keeps preview and apply bound to the captured layer and sends the fingerprint unchanged', async () => {
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
      { seed: 'nebula-custom', target: 'GALAXY', density: 'BALANCED' },
    );
    expect(mocks.post).toHaveBeenNthCalledWith(
      2,
      '/starmap/admin/layers/12/nebula/apply',
      { seed: 'nebula-custom', target: 'GALAXY', density: 'BALANCED', fingerprint: 'preview-fingerprint' },
    );
    expect(screen.getByLabelText('Seed')).toHaveProperty('value', 'nebula-custom');
    expect(mocks.storeState.loadFields).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status').textContent).toContain('2 Felder wurden durch die Nebelvorschau geändert.');
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

  it('closes without mutation and disables the toolbar action without a layer', () => {
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
