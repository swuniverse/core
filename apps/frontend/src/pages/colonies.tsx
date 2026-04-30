import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface ColonyField {
  id: number;
  fieldIndex: number;
  fieldType: number;
  buildingId: number | null;
  isBuilding: boolean;
  buildProgress: number;
  buildFinishesAt: string | null;
}

interface ColonyStorageItem {
  id: number;
  commodityId: number;
  amount: number;
}

interface Colony {
  id: number;
  name: string;
  energy: number;
  energyMax: number;
  population: number;
  populationMax: number;
  storageUsed: number;
  storageMax: number;
  starSystem?: { name: string };
  fields?: ColonyField[];
  storage?: ColonyStorageItem[];
}

const FIELD_TYPE_COLORS: Record<number, string> = {
  1: 'bg-green-900/40',   // PLAIN
  2: 'bg-stone-700/60',   // ROCK
  3: 'bg-blue-900/40',    // WATER
  4: 'bg-emerald-900/50', // FOREST
};

const FIELD_TYPE_NAMES: Record<number, string> = {
  1: 'Plains',
  2: 'Rock',
  3: 'Water',
  4: 'Forest',
};

const BUILDING_NAMES: Record<number, string> = {
  1: 'HQ',
  2: 'Mine',
  3: 'Solar Plant',
  4: 'Farm',
  5: 'Barracks',
  6: 'Research Lab',
  7: 'Shipyard',
  8: 'Storage Depot',
};

const COMMODITY_NAMES: Record<number, string> = {
  1: 'Credits',
  2: 'Durasteel',
  3: 'Energy Cells',
};

export function ColoniesPage() {
  const [colonies, setColonies] = useState<Colony[]>([]);
  const [selected, setSelected] = useState<Colony | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Colony[]>('/colonies').then((data) => {
      setColonies(data);
      if (data.length > 0) loadColonyDetail(data[0].id);
      setLoading(false);
    });
  }, []);

  const loadColonyDetail = async (colonyId: number) => {
    const detail = await api.get<Colony>(`/colonies/${colonyId}`);
    setSelected(detail);
  };

  if (loading) return <div className="p-6 text-swu-muted">Loading colonies...</div>;

  if (colonies.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-swu-accent">Colonies</h1>
        <p className="text-swu-muted mt-4">No colonies yet. Your first colony will be assigned upon registration.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-swu-accent mb-4">Colonies</h1>
      <div className="flex gap-4">
        <div className="w-48 space-y-2">
          {colonies.map((c) => (
            <button
              key={c.id}
              onClick={() => loadColonyDetail(c.id)}
              className={`w-full text-left p-3 rounded border transition-colors ${
                selected?.id === c.id
                  ? 'border-swu-accent bg-swu-accent/10 text-swu-accent'
                  : 'border-swu-border text-swu-muted hover:border-swu-primary'
              }`}
            >
              <div className="font-bold text-sm">{c.name}</div>
              <div className="text-xs mt-1">{c.starSystem?.name || 'Unknown'}</div>
            </button>
          ))}
        </div>

        {selected && (
          <ColonyDetail
            colony={selected}
            onBuild={(fieldIndex, buildingId) => handleBuild(selected.id, fieldIndex, buildingId)}
          />
        )}
      </div>
    </div>
  );

  async function handleBuild(colonyId: number, fieldIndex: number, buildingId: number) {
    await api.post(`/colonies/${colonyId}/build`, { fieldIndex, buildingId });
    loadColonyDetail(colonyId);
  }
}

function ColonyDetail({
  colony,
  onBuild,
}: {
  colony: Colony;
  onBuild: (fieldIndex: number, buildingId: number) => void;
}) {
  const [selectedField, setSelectedField] = useState<ColonyField | null>(null);
  const [showBuildMenu, setShowBuildMenu] = useState(false);

  const gridSize = 7;
  const fields = colony.fields || [];

  return (
    <div className="flex-1 space-y-4">
      {/* Resource Bars */}
      <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
        <h2 className="text-lg font-bold text-swu-primary mb-3">{colony.name}</h2>
        <div className="grid grid-cols-3 gap-4">
          <ResourceBar label="Energy" current={colony.energy} max={colony.energyMax} color="text-yellow-400" barColor="bg-yellow-500" />
          <ResourceBar label="Population" current={colony.population} max={colony.populationMax} color="text-swu-success" barColor="bg-swu-success" />
          <ResourceBar label="Storage" current={colony.storageUsed} max={colony.storageMax} color="text-swu-primary" barColor="bg-swu-primary" />
        </div>
      </div>

      <div className="flex gap-4">
        {/* Colony Grid */}
        <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
          <h3 className="text-sm font-bold text-swu-muted mb-2">Colony Grid</h3>
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
          >
            {Array.from({ length: gridSize * gridSize }, (_, i) => {
              const field = fields.find((f) => f.fieldIndex === i);
              return (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedField(field || null);
                    setShowBuildMenu(false);
                  }}
                  className={`w-10 h-10 rounded border text-xs flex items-center justify-center transition-all
                    ${field && selectedField?.fieldIndex === i ? 'border-swu-accent ring-1 ring-swu-accent' : 'border-swu-border/50'}
                    ${field ? FIELD_TYPE_COLORS[field.fieldType] || 'bg-swu-bg' : 'bg-swu-bg'}
                    ${field?.isBuilding ? 'animate-pulse' : ''}
                    hover:border-swu-primary
                  `}
                  title={field ? `${FIELD_TYPE_NAMES[field.fieldType] || 'Unknown'} (${i})` : `Empty (${i})`}
                >
                  {field?.buildingId && (
                    <span className="text-[10px] font-bold text-swu-accent">
                      {BUILDING_NAMES[field.buildingId]?.slice(0, 2) || '??'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Field Detail / Build Menu */}
        <div className="w-64 space-y-4">
          {selectedField && (
            <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
              <h3 className="text-sm font-bold text-swu-primary mb-2">
                Field #{selectedField.fieldIndex}
              </h3>
              <div className="text-xs text-swu-muted space-y-1">
                <p>Terrain: {FIELD_TYPE_NAMES[selectedField.fieldType] || 'Unknown'}</p>
                {selectedField.buildingId && (
                  <p>
                    Building: <span className="text-swu-accent">{BUILDING_NAMES[selectedField.buildingId] || `#${selectedField.buildingId}`}</span>
                    {selectedField.isBuilding && <span className="text-yellow-400 ml-1">(constructing...)</span>}
                  </p>
                )}
              </div>
              {!selectedField.buildingId && !selectedField.isBuilding && (
                <button
                  onClick={() => setShowBuildMenu(!showBuildMenu)}
                  className="mt-3 px-3 py-1 bg-swu-accent/20 border border-swu-accent text-swu-accent text-xs rounded hover:bg-swu-accent/30 transition-colors"
                >
                  Build...
                </button>
              )}
            </div>
          )}

          {showBuildMenu && selectedField && !selectedField.buildingId && (
            <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
              <h3 className="text-sm font-bold text-swu-muted mb-2">Select Building</h3>
              <div className="space-y-1">
                {Object.entries(BUILDING_NAMES)
                  .filter(([id]) => Number(id) !== 1) // Can't build HQ
                  .map(([id, name]) => (
                    <button
                      key={id}
                      onClick={() => {
                        onBuild(selectedField.fieldIndex, Number(id));
                        setShowBuildMenu(false);
                        setSelectedField(null);
                      }}
                      className="w-full text-left px-2 py-1 text-xs text-swu-muted hover:text-swu-accent hover:bg-swu-accent/10 rounded transition-colors"
                    >
                      {name}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Storage */}
          {colony.storage && colony.storage.length > 0 && (
            <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
              <h3 className="text-sm font-bold text-swu-muted mb-2">Storage</h3>
              <div className="space-y-1">
                {colony.storage.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs">
                    <span className="text-swu-muted">{COMMODITY_NAMES[item.commodityId] || `Item #${item.commodityId}`}</span>
                    <span className="text-swu-primary font-mono">{item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResourceBar({
  label,
  current,
  max,
  color,
  barColor,
}: {
  label: string;
  current: number;
  max: number;
  color: string;
  barColor: string;
}) {
  const pct = max > 0 ? (current / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-swu-muted mb-1">
        <span>{label}</span>
        <span className={color}>
          {current}/{max}
        </span>
      </div>
      <div className="h-2 bg-swu-bg rounded-full overflow-hidden border border-swu-border">
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
