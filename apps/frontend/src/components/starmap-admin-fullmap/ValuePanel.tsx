import { useState, useMemo } from 'react';
import { useFullmapEditorStore } from '../../stores/fullmap-editor.store';
import { starTileImage } from '../../lib/assets';
import type { StarmapFieldTypeDto } from '@swuniverse/shared';

const CATEGORY_LABELS: Record<string, string> = {
  space: 'Weltraum',
  wormhole: 'Wurmlöcher',
  nebula: 'Nebulae',
  planet: 'Planeten',
  asteroid: 'Asteroiden',
  tradepost: 'Handelsposten',
  system_space: 'System: Weltraum',
  system_star: 'System: Sterne',
  system_binary: 'System: Binärsysteme',
  system_nebula: 'System: Nebulae',
};

const EFFECTS: { key: string; label: string }[] = [
  { key: 'WARPDRIVE_LEAK', label: 'Leck am Warpantrieb' },
  { key: 'REACTOR_LEAK', label: 'Leck am Reaktor' },
  { key: 'EPS_LEAK', label: 'Leck am EPS' },
  { key: 'CLOAK_UNUSEABLE', label: 'Ausfall der Tarnung' },
  { key: 'NFS_MALFUNCTION_COOLDOWN', label: 'Ausfall Nahbereichssensoren' },
  { key: 'LSS_MALFUNCTION', label: 'Störung Langstreckensensoren' },
  { key: 'SHIELD_MALFUNCTION', label: 'Störung Schildemitter' },
  { key: 'NO_SPACECRAFT_COUNT', label: 'Versteckte Signaturen' },
  { key: 'DUBIOUS_SPACECRAFT_COUNT', label: 'Verschleierte Signaturen' },
  { key: 'NO_SUBSPACE_LINES', label: 'Versteckte Subraumspuren' },
  { key: 'ENERGY_WEAPON_BUFF', label: 'Energiewaffen-Buff' },
  { key: 'REGENERATION_CHANCE', label: 'Regenerationschance' },
  { key: 'ENERGY_WEAPON_NERF', label: 'Energiewaffen-Nerf' },
  { key: 'HIT_CHANCE_INTERFERENCE', label: 'Zielerfassung gestört' },
  { key: 'EVADE_CHANCE_INTERFERENCE', label: 'Manövrierbarkeit gestört' },
  { key: 'NO_PIRATES', label: 'Keine Piraten' },
  { key: 'NO_ANOMALIES', label: 'Keine Anomalien' },
  { key: 'NO_MEASUREPOINT', label: 'Kein Messpunkt' },
  { key: 'NO_STATION_CONSTRUCTION', label: 'Kein Stationsbau' },
  { key: 'LSS_BLOCKADE', label: 'LSS-Blockade' },
];

export function ValuePanel() {
  const fieldTypes = useFullmapEditorStore((s) => s.fieldTypes);
  const systemTypes = useFullmapEditorStore((s) => s.systemTypes);
  const regions = useFullmapEditorStore((s) => s.regions);
  const borderTypes = useFullmapEditorStore((s) => s.borderTypes);
  const selectedFieldTypeId = useFullmapEditorStore((s) => s.selectedFieldTypeId);
  const selectedSystemTypeId = useFullmapEditorStore((s) => s.selectedSystemTypeId);
  const selectedRegionId = useFullmapEditorStore((s) => s.selectedRegionId);
  const selectedBorderTypeId = useFullmapEditorStore((s) => s.selectedBorderTypeId);
  const selectedPassableOverride = useFullmapEditorStore((s) => s.selectedPassableOverride);
  const effectMode = useFullmapEditorStore((s) => s.effectMode);
  const selectedEffects = useFullmapEditorStore((s) => s.selectedEffects);
  const setSelectedFieldTypeId = useFullmapEditorStore((s) => s.setSelectedFieldTypeId);
  const setSelectedSystemTypeId = useFullmapEditorStore((s) => s.setSelectedSystemTypeId);
  const setSelectedRegionId = useFullmapEditorStore((s) => s.setSelectedRegionId);
  const setSelectedBorderTypeId = useFullmapEditorStore((s) => s.setSelectedBorderTypeId);
  const setSelectedPassableOverride = useFullmapEditorStore((s) => s.setSelectedPassableOverride);
  const setEffectMode = useFullmapEditorStore((s) => s.setEffectMode);
  const setSelectedEffects = useFullmapEditorStore((s) => s.setSelectedEffects);

  // Group field types by category
  const grouped = useMemo(() => {
    const groups: Record<string, StarmapFieldTypeDto[]> = {};
    for (const ft of fieldTypes) {
      const cat = ft.category || 'space';
      (groups[cat] ??= []).push(ft);
    }
    return groups;
  }, [fieldTypes]);

  // Only show galaxy-level categories by default
  const galaxyCategories = ['space', 'wormhole', 'nebula', 'planet', 'asteroid', 'tradepost'];
  const systemCategories = ['system_space', 'system_star', 'system_binary', 'system_nebula'];

  return (
    <section className="border-b border-swu-border/50 pb-3 space-y-3">
      <h3 className="font-bold text-xs text-swu-primary">Werte</h3>

      {/* Feldtyp tile grid - grouped by category */}
      {[...galaxyCategories, ...systemCategories].map((cat) => {
        const types = grouped[cat];
        if (!types?.length) return null;
        return (
          <FieldTypeGroup
            key={cat}
            label={CATEGORY_LABELS[cat] || cat}
            types={types}
            selectedId={selectedFieldTypeId}
            onSelect={setSelectedFieldTypeId}
          />
        );
      })}

      {/* Systemtyp */}
      <div>
        <div className="text-xs text-swu-text mb-1">Systemtyp</div>
        <select
          value={selectedSystemTypeId ?? ''}
          onChange={(e) => setSelectedSystemTypeId(e.target.value ? Number(e.target.value) : null)}
          className="w-full rounded border border-swu-border bg-swu-surface px-2 py-1 text-xs text-swu-text"
        >
          <option value="">Systemtyp entfernen</option>
          {systemTypes.map((st) => (
            <option key={st.id} value={st.id}>{st.name}</option>
          ))}
        </select>
      </div>

      {/* Region */}
      <div>
        <div className="text-xs text-swu-text mb-1">Region</div>
        <select
          value={selectedRegionId ?? ''}
          onChange={(e) => setSelectedRegionId(e.target.value ? Number(e.target.value) : null)}
          className="w-full rounded border border-swu-border bg-swu-surface px-2 py-1 text-xs text-swu-text"
        >
          <option value="">Region entfernen</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      {/* Passierbarkeit */}
      <div>
        <div className="text-xs text-swu-text mb-1">Passierbarkeit</div>
        <select
          value={selectedPassableOverride === null ? '' : selectedPassableOverride ? 'true' : 'false'}
          onChange={(e) => {
            const v = e.target.value;
            setSelectedPassableOverride(v === '' ? null : v === 'true');
          }}
          className="w-full rounded border border-swu-border bg-swu-surface px-2 py-1 text-xs text-swu-text"
        >
          <option value="">Auto (Feldtyp)</option>
          <option value="true">Passierbar</option>
          <option value="false">Unpassierbar</option>
        </select>
      </div>

      {/* Grenze */}
      <div>
        <div className="text-xs text-swu-text mb-1">Grenze</div>
        <select
          value={selectedBorderTypeId ?? ''}
          onChange={(e) => setSelectedBorderTypeId(e.target.value ? Number(e.target.value) : null)}
          className="w-full rounded border border-swu-border bg-swu-surface px-2 py-1 text-xs text-swu-text"
        >
          <option value="">Grenze entfernen</option>
          {borderTypes.map((bt) => (
            <option key={bt.id} value={bt.id}>{bt.name}</option>
          ))}
        </select>
      </div>

      {/* Effektmodus */}
      <div>
        <div className="text-xs text-swu-text mb-1">Effektmodus</div>
        <select
          value={effectMode}
          onChange={(e) => setEffectMode(e.target.value as 'add' | 'remove')}
          className="w-full rounded border border-swu-border bg-swu-surface px-2 py-1 text-xs text-swu-text"
        >
          <option value="add">Hinzufügen</option>
          <option value="remove">Entfernen</option>
        </select>
      </div>

      {/* Effekte */}
      <div>
        <div className="text-xs text-swu-text mb-1">Effekte</div>
        <div className="max-h-48 overflow-auto border border-swu-border/50 bg-black/50 p-1 space-y-0.5 resize-y min-h-[72px]">
          {EFFECTS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-xs text-swu-text cursor-pointer">
              <input
                type="checkbox"
                checked={selectedEffects.includes(key)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedEffects([...selectedEffects, key]);
                  } else {
                    setSelectedEffects(selectedEffects.filter((ef) => ef !== key));
                  }
                }}
                className="accent-swu-accent"
              />
              {label}
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}

function FieldTypeGroup({
  label,
  types,
  selectedId,
  onSelect,
}: {
  label: string;
  types: StarmapFieldTypeDto[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex justify-between items-center w-full px-1.5 py-1 border border-swu-border bg-swu-surface text-xs text-swu-text text-left"
      >
        <span>{label} ({types.length})</span>
        <span className="text-swu-accent font-bold">{open ? '[-]' : '[+]'}</span>
      </button>
      {open && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(34px,1fr))] gap-1 mt-1 p-1 border border-swu-border/50 bg-black/50 max-h-48 overflow-auto resize-y">
          {types.map((ft) => (
            <button
              key={ft.id}
              onClick={() => onSelect(ft.id)}
              title={`${ft.name} (${ft.id})`}
              className={[
                'w-[34px] h-[34px] p-0.5 border cursor-pointer',
                selectedId === ft.id
                  ? 'border-yellow-400 shadow-[0_0_0_1px_#ffe06b_inset]'
                  : 'border-swu-border/50',
              ].join(' ')}
            >
              <img
                src={starTileImage(ft.id)}
                alt={ft.name}
                className="w-[30px] h-[30px] object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
