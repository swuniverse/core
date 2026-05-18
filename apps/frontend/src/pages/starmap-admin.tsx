import { useEffect } from 'react';
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
import { OverviewMap } from '../components/starmap-admin/OverviewMap';
import type { UserProfile } from '@swuniverse/shared';
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
    layers,
    selectedLayerId,
    selectLayer,
    deleteSelectedLayer,
  } = useStarmapAdminStore();

  useEffect(() => {
    if (!accessToken) return;
    if (user?.isAdmin) {
      void bootstrap();
      return;
    }
    void api.get<UserProfile>('/auth/me').then((profile) => {
      setUser(profile);
      if (profile.isAdmin) void bootstrap();
    });
  }, [accessToken]);

  if (!user?.isAdmin) {
    return (
      <div className="p-6">
        <div className="rounded border border-swu-danger/40 bg-swu-danger/10 px-4 py-3 text-sm text-red-300">
          Kein Admin-Zugriff. Setze deinen Benutzer auf `isAdmin = true` und
          melde dich neu an.
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 text-swu-muted">Lade Karten-Admin...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-swu-muted">
            <Link to="/admin" className="hover:text-swu-accent">
              Admin
            </Link>
            <span>/</span>
            <span>Map Admin</span>
          </div>
          <h1 className="text-2xl font-bold text-swu-accent">Starmap Admin</h1>
          <p className="text-sm text-swu-muted mt-1">
            STU-naher 20x20-Sektionseditor fuer Galaxy- und Systemfelder.
          </p>
        </div>
        <div className="flex items-center gap-3">
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
            {layers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
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

      <section className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <LayerPanel />
        <FieldTypeLegend />
      </section>

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <SectorGrid />
          <OverviewMap />
        </div>
        <GalaxyFieldGrid />
        <section className="space-y-4">
          <BrushToolbar />
          <SectorFillPanel />
          <FieldEditor />
          <SystemList />
          <SystemEditor />
        </section>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <RegionEditor />
        <BorderTypeEditor />
      </section>
    </div>
  );
}
