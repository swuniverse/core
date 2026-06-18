import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useStarmapAdminStore } from '../stores/starmap-admin.store';
import { LayerPanel } from '../components/starmap-admin/LayerPanel';
import { FieldTypeLegend } from '../components/starmap-admin/FieldTypeLegend';
import { SectorGrid } from '../components/starmap-admin/SectorGrid';
import { GalaxyFieldGrid } from '../components/starmap-admin/GalaxyFieldGrid';
import { SectorFillPanel } from '../components/starmap-admin/SectorFillPanel';
import { FieldEditor } from '../components/starmap-admin/FieldEditor';
import { SystemList } from '../components/starmap-admin/SystemList';
import { SystemEditor } from '../components/starmap-admin/SystemEditor';
import { BrushToolbar } from '../components/starmap-admin/BrushToolbar';
import { RegionEditor } from '../components/starmap-admin/RegionEditor';
import { BorderTypeEditor } from '../components/starmap-admin/BorderTypeEditor';
import type { StarWarsPresetModeDto, UserProfile } from '@swuniverse/shared';
import { api } from '../services/api';

export function StarmapAdminPage() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);

  const {
    loading,
    message,
    error,
    bootstrap,
    ensureDefaults,
    applyStarWarsPreset,
    layers,
    selectedLayerId,
    selectedSector,
    selectedSystemId,
    selectLayer,
    selectSector,
    deleteSelectedLayer,
  } = useStarmapAdminStore();

  const [starWarsMode, setStarWarsMode] =
    useState<StarWarsPresetModeDto>('curated');
  const [starWarsRecreateRoutes, setStarWarsRecreateRoutes] = useState(true);
  const [starWarsOverwriteExisting, setStarWarsOverwriteExisting] =
    useState(true);

  const hasAccess = user?.isAdmin || user?.permissions?.includes('MAP_EDITOR');

  useEffect(() => {
    if (!accessToken) return;
    if (hasAccess) {
      void bootstrap();
      return;
    }
    void api.get<UserProfile>('/auth/me').then((profile) => {
      setUser(profile);
      if (profile.isAdmin || profile.permissions?.includes('MAP_EDITOR')) void bootstrap();
    });
  }, [accessToken]);

  if (!hasAccess) {
    return (
      <div className="p-6">
        <div className="rounded border border-swu-danger/40 bg-swu-danger/10 px-4 py-3 text-sm text-red-300">
          Kein Zugriff. Du benötigst Admin- oder Karteneditor-Rechte.
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 text-swu-muted">Lade Karten-Admin...</div>;
  }

  const selectedLayer =
    layers.find((layer) => layer.id === selectedLayerId) ?? null;
  const viewMode = selectedSystemId
    ? 'system'
    : selectedSector
      ? 'sector'
      : 'galaxy';

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-swu-muted">
            <Link to="/admin" className="hover:text-swu-accent">
              Admin
            </Link>
            <span>/</span>
            <span>Starmap</span>
          </div>
          <h1 className="text-2xl font-bold text-swu-accent">Starmap Admin</h1>
          <p className="text-sm text-swu-muted mt-1">
            Gleiche Navigation wie Sternenkarte: Karte → Sektor → System. Felder
            per Klick textbasiert bearbeiten.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded border border-amber-400/50 bg-amber-950/10 p-2 text-xs text-amber-100">
            <div className="mb-2 font-bold text-amber-300">
              Star Wars Preset
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={starWarsMode}
                onChange={(event) =>
                  setStarWarsMode(event.target.value as StarWarsPresetModeDto)
                }
                className="rounded border border-swu-border bg-swu-surface px-2 py-1 text-swu-text"
              >
                <option value="landmarks">Landmarken</option>
                <option value="curated">Kuratiert</option>
              </select>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={starWarsRecreateRoutes}
                  onChange={(event) =>
                    setStarWarsRecreateRoutes(event.target.checked)
                  }
                />
                Routen
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={starWarsOverwriteExisting}
                  onChange={(event) =>
                    setStarWarsOverwriteExisting(event.target.checked)
                  }
                />
                Überschreiben
              </label>
              <button
                onClick={() =>
                  void applyStarWarsPreset({
                    mode: starWarsMode,
                    recreateRoutes: starWarsRecreateRoutes,
                    overwriteExisting: starWarsOverwriteExisting,
                  })
                }
                disabled={!selectedLayerId}
                className="rounded border border-amber-400 px-3 py-1 text-amber-300 enabled:hover:bg-amber-400/10 disabled:opacity-50"
              >
                Anwenden
              </button>
            </div>
          </div>
          <button
            onClick={() => void ensureDefaults()}
            className="rounded border border-swu-accent px-3 py-2 text-sm text-swu-accent hover:bg-swu-accent/10"
          >
            Default FieldTypes
          </button>
          <select
            value={selectedLayerId ?? ''}
            onChange={(e) => void selectLayer(Number(e.target.value))}
            className="rounded border border-swu-border bg-swu-surface px-3 py-2 text-sm text-swu-text"
          >
            {layers.map((layer) => (
              <option key={layer.id} value={layer.id}>
                {layer.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => void deleteSelectedLayer()}
            disabled={!selectedLayerId}
            className="rounded border border-red-600 px-3 py-2 text-sm text-red-300 enabled:hover:bg-red-950/40 disabled:opacity-50"
          >
            Layer loeschen
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-swu-muted">
        <button
          disabled={!selectedLayer}
          onClick={() => selectedLayer && void selectLayer(selectedLayer.id)}
          className={[
            'rounded border px-2 py-1 disabled:opacity-40',
            viewMode === 'galaxy'
              ? 'border-swu-accent text-swu-accent'
              : 'border-swu-border',
          ].join(' ')}
        >
          Karte
        </button>
        <span>/</span>
        <button
          disabled={!selectedSector}
          onClick={() => selectedSector && void selectSector(selectedSector)}
          className={[
            'rounded border px-2 py-1 disabled:opacity-40',
            viewMode === 'sector'
              ? 'border-swu-accent text-swu-accent'
              : 'border-swu-border',
          ].join(' ')}
        >
          {selectedSector
            ? `Sektor ${selectedSector.sectorX + 1}|${selectedSector.sectorY + 1}`
            : 'Sektor'}
        </button>
        <span>/</span>
        <button
          disabled={!selectedSystemId}
          className={[
            'rounded border px-2 py-1 disabled:opacity-40',
            viewMode === 'system'
              ? 'border-swu-accent text-swu-accent'
              : 'border-swu-border',
          ].join(' ')}
        >
          {selectedSystemId ? `System #${selectedSystemId}` : 'System'}
        </button>
      </div>

      {message && (
        <div className="rounded border border-swu-success/40 bg-swu-success/10 px-4 py-3 text-sm text-swu-success">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded border border-swu-danger/40 bg-swu-danger/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <main className="min-w-0">
          {viewMode === 'galaxy' && <SectorGrid />}
          {viewMode === 'sector' && <GalaxyFieldGrid />}
          {viewMode === 'system' && <SystemEditor />}
        </main>

        <aside className="space-y-4">
          <LayerPanel />
          {viewMode === 'galaxy' && <FieldTypeLegend />}
          {viewMode === 'sector' && (
            <>
              <FieldEditor />
              <SystemList />
              <BrushToolbar />
              <SectorFillPanel />
            </>
          )}
          {viewMode === 'system' && (
            <>
              <SystemList />
              <FieldEditor />
            </>
          )}
        </aside>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <RegionEditor />
        <BorderTypeEditor />
      </section>
    </div>
  );
}
