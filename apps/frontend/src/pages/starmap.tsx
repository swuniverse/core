import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface Layer {
  id: number;
  name: string;
  width: number;
  height: number;
}

interface StarSystem {
  id: number;
  name: string;
  cx: number;
  cy: number;
  systemTypeId: number;
}

interface CelestialObject {
  id: number;
  objectType: number;
  name: string | null;
  posX: number;
  posY: number;
  classId: number | null;
  isColonizable: boolean;
}

interface SystemDetail extends StarSystem {
  maxX: number;
  maxY: number;
  celestialObjects: CelestialObject[];
}

const OBJECT_TYPE_ICONS: Record<number, string> = {
  1: '🪐',
  2: '🌙',
  3: '☄️',
};

const OBJECT_TYPE_NAMES: Record<number, string> = {
  1: 'Planet',
  2: 'Moon',
  3: 'Asteroid',
};

export function StarmapPage() {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<Layer | null>(null);
  const [systems, setSystems] = useState<StarSystem[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<StarSystem | null>(null);
  const [systemDetail, setSystemDetail] = useState<SystemDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Layer[]>('/starmap/layers').then((data) => {
      setLayers(data);
      if (data.length > 0) {
        setSelectedLayer(data[0]);
        loadSystems(data[0].id);
      }
      setLoading(false);
    });
  }, []);

  async function loadSystems(layerId: number) {
    const data = await api.get<StarSystem[]>(`/starmap/layers/${layerId}/systems`);
    setSystems(data);
  }

  async function selectSystem(system: StarSystem) {
    setSelectedSystem(system);
    const detail = await api.get<SystemDetail>(`/starmap/systems/${system.id}`);
    setSystemDetail(detail);
  }

  if (loading) return <div className="p-6 text-swu-muted">Loading starmap...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold text-swu-accent">Starmap</h1>
        {selectedLayer && (
          <span className="text-sm text-swu-muted">
            {selectedLayer.name} — {systems.length} systems
          </span>
        )}
        {layers.length > 1 && (
          <select
            value={selectedLayer?.id || ''}
            onChange={(e) => {
              const l = layers.find((layer) => layer.id === Number(e.target.value));
              if (l) {
                setSelectedLayer(l);
                setSelectedSystem(null);
                setSystemDetail(null);
                loadSystems(l.id);
              }
            }}
            className="bg-swu-bg border border-swu-border rounded px-3 py-1 text-sm text-swu-primary"
          >
            {layers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedLayer && (
        <div className="flex gap-4">
          {/* Sector Grid */}
          <div className="bg-swu-surface border border-swu-border rounded-lg p-4 overflow-auto" style={{ maxHeight: '75vh' }}>
            <div
              className="grid gap-0.5"
              style={{ gridTemplateColumns: `repeat(${selectedLayer.width}, 56px)` }}
            >
              {Array.from({ length: selectedLayer.width * selectedLayer.height }).map((_, idx) => {
                const x = idx % selectedLayer.width;
                const y = Math.floor(idx / selectedLayer.width);
                const system = systems.find((s) => s.cx === x && s.cy === y);
                const isSelected = selectedSystem?.id === system?.id;
                return (
                  <div
                    key={idx}
                    onClick={() => system && selectSystem(system)}
                    className={`w-14 h-14 border rounded flex flex-col items-center justify-center text-xs transition-all ${
                      system
                        ? isSelected
                          ? 'border-swu-accent bg-swu-accent/20 text-swu-accent shadow-lg shadow-swu-accent/20'
                          : 'border-swu-border bg-swu-bg text-swu-primary hover:border-swu-primary hover:bg-swu-primary/5 cursor-pointer'
                        : 'border-swu-border/20 bg-swu-bg/30'
                    }`}
                  >
                    {system && (
                      <>
                        <span className="text-base">★</span>
                        <span className="text-[9px] truncate max-w-[48px] mt-0.5">{system.name}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Grid coordinates */}
            <div className="flex mt-2 text-[9px] text-swu-muted/50" style={{ paddingLeft: '4px' }}>
              {Array.from({ length: selectedLayer.width }, (_, i) => (
                <span key={i} className="w-14 text-center">{i}</span>
              ))}
            </div>
          </div>

          {/* System Detail Panel */}
          <div className="w-80 space-y-4">
            {systemDetail ? (
              <>
                <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
                  <h3 className="font-bold text-swu-accent text-lg">{systemDetail.name}</h3>
                  <div className="text-xs text-swu-muted mt-1 space-y-0.5">
                    <p>Sector: [{systemDetail.cx}, {systemDetail.cy}]</p>
                    <p>Size: {systemDetail.maxX}x{systemDetail.maxY}</p>
                    <p>Objects: {systemDetail.celestialObjects.length}</p>
                  </div>
                </div>

                {/* System Map Preview */}
                <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
                  <h4 className="text-xs font-bold text-swu-muted mb-2">System Objects</h4>
                  <div className="space-y-1">
                    {systemDetail.celestialObjects.map((obj) => (
                      <div
                        key={obj.id}
                        className="flex items-center gap-2 p-1.5 bg-swu-bg/50 rounded border border-swu-border/50"
                      >
                        <span className="text-sm">{OBJECT_TYPE_ICONS[obj.objectType] || '?'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-swu-primary truncate">
                            {obj.name || OBJECT_TYPE_NAMES[obj.objectType]}
                          </p>
                          <p className="text-[10px] text-swu-muted">
                            {OBJECT_TYPE_NAMES[obj.objectType]} · [{obj.posX},{obj.posY}]
                            {obj.isColonizable && <span className="text-green-400 ml-1">● colonizable</span>}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
                <p className="text-sm text-swu-muted">Select a star system to view details.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {layers.length === 0 && (
        <p className="text-swu-muted">No explored regions yet. Galaxy not seeded.</p>
      )}
    </div>
  );
}
