import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useFullmapEditorStore } from '../stores/fullmap-editor.store';
import { FullMapToolbar } from '../components/starmap-admin-fullmap/FullMapToolbar';
import { FullMapCanvas } from '../components/starmap-admin-fullmap/FullMapCanvas';
import { FullMapPanel } from '../components/starmap-admin-fullmap/FullMapPanel';
import { SystemViewDialog } from '../components/starmap-admin-fullmap/SystemViewDialog';

export function StarmapAdminFullmapPage() {
  const user = useAuthStore((s) => s.user);
  const hasAccess = user?.isAdmin || user?.permissions?.includes('MAP_EDITOR');
  const { loading, error, bootstrap } = useFullmapEditorStore();
  const systemViewId = useFullmapEditorStore((s) => s.systemViewId);

  useEffect(() => {
    if (hasAccess) void bootstrap();
  }, [hasAccess]);

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
    return <div className="p-6 text-swu-muted">Lade Karteneditor...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100svh-60px)]">
      <div className="flex items-center gap-2 px-3 py-1 text-xs text-swu-muted border-b border-swu-border bg-swu-surface/50">
        <Link to="/admin" className="hover:text-swu-accent">Admin</Link>
        <span>/</span>
        <span className="text-swu-text">Karteneditor Vollkarte</span>
      </div>

      <FullMapToolbar />

      {error && (
        <div className="mx-2 rounded border border-swu-danger/40 bg-swu-danger/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="flex-1 grid grid-cols-[minmax(420px,1fr)_360px] gap-2 p-2 min-h-0 max-md:grid-cols-1 max-md:h-auto">
        <FullMapCanvas />
        <FullMapPanel />
      </div>

      {systemViewId && <SystemViewDialog />}
    </div>
  );
}
