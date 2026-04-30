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

export function StarmapPage() {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<Layer | null>(null);
  const [systems, setSystems] = useState<StarSystem[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<StarSystem | null>(null);
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

  if (loading) return <div className="p-6 text-swu-muted">Loading starmap...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold text-swu-accent">Starmap</h1>
        {layers.length > 1 && (
          <select
            value={selectedLayer?.id || ''}
            onChange={(e) => {
              const l = layers.find((l) => l.id === Number(e.target.value));
              if (l) {
                setSelectedLayer(l);
                loadSystems(l.id);
              }
            }}
            className="bg-swu-bg border border-swu-border rounded px-3 py-1 text-swu-text"
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
          <div
            className="bg-swu-surface border border-swu-border rounded-lg p-4 overflow-auto"
            style={{ maxHeight: '70vh' }}
          >
            <div
              className="grid gap-px"
              style={{
                gridTemplateColumns: `repeat(${selectedLayer.width}, 40px)`,
              }}
            >
              {Array.from({ length: selectedLayer.width * selectedLayer.height }).map(
                (_, idx) => {
                  const x = idx % selectedLayer.width;
                  const y = Math.floor(idx / selectedLayer.width);
                  const system = systems.find((s) => s.cx === x && s.cy === y);
                  return (
                    <div
                      key={idx}
                      onClick={() => system && setSelectedSystem(system)}
                      className={`w-10 h-10 border flex items-center justify-center text-xs cursor-pointer transition-colors ${
                        system
                          ? selectedSystem?.id === system.id
                            ? 'border-swu-accent bg-swu-accent/20 text-swu-accent'
                            : 'border-swu-border bg-swu-bg text-swu-primary hover:border-swu-primary'
                          : 'border-swu-border/30 bg-swu-bg/50'
                      }`}
                    >
                      {system ? '★' : ''}
                    </div>
                  );
                },
              )}
            </div>
          </div>

          {/* System Detail */}
          {selectedSystem && (
            <div className="w-64 bg-swu-surface border border-swu-border rounded-lg p-4">
              <h3 className="font-bold text-swu-accent">{selectedSystem.name}</h3>
              <p className="text-xs text-swu-muted mt-1">
                Position: [{selectedSystem.cx}, {selectedSystem.cy}]
              </p>
              <p className="text-xs text-swu-muted">Type: {selectedSystem.systemTypeId}</p>
            </div>
          )}
        </div>
      )}

      {layers.length === 0 && (
        <p className="text-swu-muted">No explored regions yet.</p>
      )}
    </div>
  );
}
