import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  locationLabel?: string;
  fieldCount?: number;
  storageItemCount?: number;
  starSystem?: { name: string };
  celestialObject?: { name: string | null };
  fields?: ColonyField[];
  storage?: ColonyStorageItem[];
}

interface BuildingDef {
  id: number;
  name: string;
  category: string;
  costs: Record<string, number>;
  allowedFieldTypes: number[];
  isUnique: boolean;
}

interface CommodityDef {
  id: number;
  name: string;
  nameShort: string;
}

const FIELD_TYPE_COLORS: Record<number, string> = {
  101: 'bg-green-900/40',
  111: 'bg-emerald-900/50',
  201: 'bg-blue-900/40',
  401: 'bg-amber-900/40',
  501: 'bg-cyan-900/30',
  601: 'bg-lime-900/40',
  701: 'bg-stone-700/60',
  703: 'bg-stone-600/70',
  801: 'bg-zinc-800/60',
  900: 'bg-indigo-900/30',
};

const FIELD_TYPE_NAMES: Record<number, string> = {
  101: 'Plains',
  111: 'Forest',
  201: 'Ocean',
  401: 'Desert',
  501: 'Ice',
  601: 'Swamp',
  701: 'Rock',
  703: 'Mountain',
  801: 'Underground',
  900: 'Orbit',
};

export function ColoniesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [colonies, setColonies] = useState<Colony[]>([]);
  const [selected, setSelected] = useState<Colony | null>(null);
  const [commodities, setCommodities] = useState<CommodityDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Colony[]>('/colonies'),
      api.get<CommodityDef[]>('/colonies/commodities/all'),
    ]).then(([data, comms]) => {
      setColonies(data);
      setCommodities(comms);
      const requestedId = Number(searchParams.get('selected'));
      const initialColony =
        data.find((colony) => colony.id === requestedId) ?? data[0];
      if (initialColony) loadColonyDetail(initialColony.id);
      setLoading(false);
    });
  }, [searchParams]);

  const loadColonyDetail = async (colonyId: number) => {
    const detail = await api.get<Colony>(`/colonies/${colonyId}`);
    setSelected(detail);
    setSearchParams({ selected: String(colonyId) }, { replace: true });
  };

  if (loading)
    return <div className="p-6 text-swu-muted">Loading colonies...</div>;

  if (colonies.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-swu-accent">Colonies</h1>
        <p className="text-swu-muted mt-4">
          No colonies yet. Claim your first homeworld in onboarding.
        </p>
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
              <div className="text-xs mt-1">
                {c.locationLabel ||
                  c.celestialObject?.name ||
                  c.starSystem?.name ||
                  'Unknown'}
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <ColonyDetail
            colony={selected}
            commodities={commodities}
            onBuild={(fieldIndex, buildingId) =>
              handleBuild(selected.id, fieldIndex, buildingId)
            }
          />
        )}
      </div>
    </div>
  );

  async function handleBuild(
    colonyId: number,
    fieldIndex: number,
    buildingId: number,
  ) {
    await api.post(`/colonies/${colonyId}/build`, { fieldIndex, buildingId });
    loadColonyDetail(colonyId);
  }
}

function ColonyDetail({
  colony,
  commodities,
  onBuild,
}: {
  colony: Colony;
  commodities: CommodityDef[];
  onBuild: (fieldIndex: number, buildingId: number) => void;
}) {
  const [selectedField, setSelectedField] = useState<ColonyField | null>(null);
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [availableBuildings, setAvailableBuildings] = useState<BuildingDef[]>(
    [],
  );

  const fields = colony.fields || [];

  const orbitFields = fields
    .filter((f) => f.fieldIndex < 6)
    .sort((a, b) => a.fieldIndex - b.fieldIndex);
  const surfaceFields = fields
    .filter((f) => f.fieldIndex >= 6 && f.fieldIndex < 66)
    .sort((a, b) => a.fieldIndex - b.fieldIndex);
  const undergroundFields = fields
    .filter((f) => f.fieldIndex >= 66)
    .sort((a, b) => a.fieldIndex - b.fieldIndex);

  const commodityMap = Object.fromEntries(commodities.map((c) => [c.id, c]));

  const loadBuildings = async (fieldType: number) => {
    const buildings = await api.get<BuildingDef[]>(
      `/colonies/buildings/available?fieldType=${fieldType}`,
    );
    setAvailableBuildings(buildings.filter((b) => b.id !== 1));
  };

  const handleFieldClick = (field: ColonyField | undefined) => {
    if (!field) return;
    setSelectedField(field);
    setShowBuildMenu(false);
    setAvailableBuildings([]);
  };

  const handleBuildClick = () => {
    if (!selectedField) return;
    setShowBuildMenu(true);
    loadBuildings(selectedField.fieldType);
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h2 className="text-lg font-bold text-swu-primary">
              {colony.name}
            </h2>
            <p className="text-xs text-swu-muted mt-1">
              {colony.locationLabel ||
                colony.celestialObject?.name ||
                colony.starSystem?.name ||
                'Unknown location'}
            </p>
          </div>
          <div className="text-right text-xs text-swu-muted">
            <p>Fields: {colony.fieldCount ?? colony.fields?.length ?? 0}</p>
            <p>
              Storage entries:{' '}
              {colony.storageItemCount ?? colony.storage?.length ?? 0}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <ResourceBar
            label="Energy"
            current={colony.energy}
            max={colony.energyMax}
            color="text-yellow-400"
            barColor="bg-yellow-500"
          />
          <ResourceBar
            label="Population"
            current={colony.population}
            max={colony.populationMax}
            color="text-swu-success"
            barColor="bg-swu-success"
          />
          <ResourceBar
            label="Storage"
            current={colony.storageUsed}
            max={colony.storageMax}
            color="text-swu-primary"
            barColor="bg-swu-primary"
          />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="bg-swu-surface border border-swu-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-bold text-swu-muted">Colony Grid</h3>

          {/* Orbit Row */}
          <div>
            <div className="text-[10px] text-indigo-400 font-bold uppercase mb-1">
              Orbit
            </div>
            <div className="grid grid-cols-6 gap-1">
              {Array.from({ length: 6 }, (_, i) => {
                const field = orbitFields.find((f) => f.fieldIndex === i);
                return (
                  <FieldCell
                    key={i}
                    index={i}
                    field={field}
                    selectedField={selectedField}
                    onClick={() => handleFieldClick(field)}
                  />
                );
              })}
            </div>
          </div>

          {/* Surface Grid 10×6 */}
          <div>
            <div className="text-[10px] text-green-400 font-bold uppercase mb-1">
              Surface
            </div>
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 60 }, (_, i) => {
                const idx = 6 + i;
                const field = surfaceFields.find((f) => f.fieldIndex === idx);
                return (
                  <FieldCell
                    key={idx}
                    index={idx}
                    field={field}
                    selectedField={selectedField}
                    onClick={() => handleFieldClick(field)}
                  />
                );
              })}
            </div>
          </div>

          {/* Underground Row */}
          <div>
            <div className="text-[10px] text-zinc-400 font-bold uppercase mb-1">
              Underground
            </div>
            <div className="grid grid-cols-6 gap-1">
              {Array.from({ length: 6 }, (_, i) => {
                const idx = 66 + i;
                const field = undergroundFields.find(
                  (f) => f.fieldIndex === idx,
                );
                return (
                  <FieldCell
                    key={idx}
                    index={idx}
                    field={field}
                    selectedField={selectedField}
                    onClick={() => handleFieldClick(field)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Field Detail / Build Menu / Storage */}
        <div className="w-72 space-y-4">
          {selectedField && (
            <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
              <h3 className="text-sm font-bold text-swu-primary mb-2">
                Field #{selectedField.fieldIndex}
              </h3>
              <div className="text-xs text-swu-muted space-y-1">
                <p>
                  Terrain:{' '}
                  {FIELD_TYPE_NAMES[selectedField.fieldType] || 'Unknown'}
                </p>
                {selectedField.buildingId && (
                  <p>
                    Building:{' '}
                    <span className="text-swu-accent">
                      #{selectedField.buildingId}
                    </span>
                    {selectedField.isBuilding && (
                      <span className="text-yellow-400 ml-1">
                        (constructing...)
                      </span>
                    )}
                  </p>
                )}
              </div>
              {!selectedField.buildingId && !selectedField.isBuilding && (
                <button
                  onClick={handleBuildClick}
                  className="mt-3 px-3 py-1 bg-swu-accent/20 border border-swu-accent text-swu-accent text-xs rounded hover:bg-swu-accent/30 transition-colors"
                >
                  Build...
                </button>
              )}
            </div>
          )}

          {showBuildMenu && selectedField && !selectedField.buildingId && (
            <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
              <h3 className="text-sm font-bold text-swu-muted mb-2">
                Available Buildings
              </h3>
              {availableBuildings.length === 0 ? (
                <p className="text-xs text-swu-muted">
                  No buildings for this terrain.
                </p>
              ) : (
                <div className="space-y-2">
                  {availableBuildings.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        onBuild(selectedField.fieldIndex, b.id);
                        setShowBuildMenu(false);
                        setSelectedField(null);
                      }}
                      className="w-full text-left px-2 py-2 text-xs text-swu-muted hover:text-swu-accent hover:bg-swu-accent/10 rounded transition-colors border border-transparent hover:border-swu-accent/30"
                    >
                      <div className="font-bold">{b.name}</div>
                      <div className="text-[10px] text-swu-muted/70 mt-0.5">
                        {formatCosts(b.costs, commodityMap)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {colony.storage && colony.storage.length > 0 && (
            <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
              <h3 className="text-sm font-bold text-swu-muted mb-2">Storage</h3>
              <div className="space-y-1">
                {colony.storage.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs">
                    <span className="text-swu-muted">
                      {commodityMap[item.commodityId]?.name ||
                        `Item #${item.commodityId}`}
                    </span>
                    <span className="text-swu-primary font-mono">
                      {item.amount.toLocaleString()}
                    </span>
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

function FieldCell({
  index,
  field,
  selectedField,
  onClick,
}: {
  index: number;
  field: ColonyField | undefined;
  selectedField: ColonyField | null;
  onClick: () => void;
}) {
  const isSelected = field && selectedField?.fieldIndex === index;
  return (
    <button
      onClick={onClick}
      className={`w-9 h-9 rounded border text-xs flex items-center justify-center transition-all
        ${isSelected ? 'border-swu-accent ring-1 ring-swu-accent' : 'border-swu-border/50'}
        ${field ? FIELD_TYPE_COLORS[field.fieldType] || 'bg-swu-bg' : 'bg-swu-bg/30'}
        ${field?.isBuilding ? 'animate-pulse' : ''}
        hover:border-swu-primary
      `}
      title={
        field
          ? `${FIELD_TYPE_NAMES[field.fieldType] || 'Unknown'} (${index})`
          : `Empty (${index})`
      }
    >
      {field?.buildingId && (
        <span className="text-[9px] font-bold text-swu-accent">
          {field.buildingId}
        </span>
      )}
    </button>
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

function formatCosts(
  costs: Record<string, number>,
  commodityMap: Record<number, CommodityDef>,
): string {
  const COST_COMMODITY_MAP: Record<string, number> = {
    credits: 1,
    durastahl: 2,
    tibannaGas: 3,
    kyberKristalle: 4,
    beskar: 5,
    kristallinesSilizium: 6,
    energiemodule: 7,
  };

  const parts: string[] = [];
  for (const [key, commodityId] of Object.entries(COST_COMMODITY_MAP)) {
    const amount = costs[key];
    if (amount && amount > 0) {
      const name = commodityMap[commodityId]?.nameShort || key;
      parts.push(`${amount} ${name}`);
    }
  }

  if (costs.buildTime) {
    parts.push(`${costs.buildTime}s`);
  }

  return parts.join(' · ');
}
