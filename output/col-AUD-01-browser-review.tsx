import React, { useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../apps/frontend/src/styles.css';
import { ColonyFieldDialog } from '../apps/frontend/src/pages/colonies/components/ColonyFieldDialog';
import { PanelBuildingManagement } from '../apps/frontend/src/pages/colonies/components/PanelBuildingManagement';

const building = { id: 100, name: 'Industriezentrum', description: 'Produziert Baumaterial für die Kolonie.', category: 'INDUSTRY', costs: { buildTime: 120 }, allowedFieldTypes: [101], isUnique: false, production: [], bonuses: { energy: 0, population: 0, storage: 0 }, epsProc: -4, bevUse: 5, bevPro: 0, integrity: 100, functions: [] };
const commodities = { 2: { id: 2, name: 'Baumaterial', nameShort: 'BM' }, 3: { id: 3, name: 'Durastahl', nameShort: 'DUR' } };
const noop = () => {};
const fieldBase = { id: 1, fieldIndex: 5, fieldType: 101, terrainTileId: 'G101', layer: 'SURFACE', buildingId: 100, isBuilding: false, isActive: false, integrity: 30, maxIntegrity: 100, buildProgress: 100, buildFinishesAt: null };
const buttonClass = 'border border-swu-border bg-swu-surface px-3 py-2 text-xs text-swu-primary';

function Harness() {
  const [field, setField] = useState(fieldBase);
  const [open, setOpen] = useState(false);
  const [energy, setEnergy] = useState(50);
  const [stock, setStock] = useState({ 2: 20, 3: 10 });
  const [view, setView] = useState('single');
  const [failed, setFailed] = useState(false);
  const preview = useCallback(async () => {
    const damaged = field.integrity < 100;
    const enough = energy >= 7 && stock[2] >= 7 && stock[3] >= 3;
    const reason = !damaged ? 'Nicht beschädigt' : energy < 7 ? `Nicht genug Energie: benötigt 7, vorhanden ${energy}` : stock[2] < 7 ? `Nicht genug Baumaterial: benötigt 7, vorhanden ${stock[2]}` : undefined;
    return { fields: [{ fieldIndex: 5, buildingId: 100, buildingName: building.name, integrity: field.integrity, maxIntegrity: 100, damageRatio: 0.7, energyCost: 7, costs: [{ commodityId: 2, amount: 7 }, { commodityId: 3, amount: 3 }], repairable: damaged && enough, reason }], totalEnergyCost: damaged && enough ? 7 : 0, totalCosts: damaged && enough ? [{ commodityId: 2, amount: 7 }, { commodityId: 3, amount: 3 }] : [] };
  }, [field.integrity, energy, stock]);
  const bulkPreview = useCallback(async () => {
    const single = await preview();
    return { ...single, fields: [...single.fields, { fieldIndex: 6, buildingId: 100, buildingName: 'Lagerzentrum', integrity: 20, maxIntegrity: 100, damageRatio: 0.8, energyCost: 10, costs: [{ commodityId: 2, amount: 30 }], repairable: false, reason: 'Nicht genug Baumaterial: benötigt 30, vorhanden 20' }, { fieldIndex: 7, buildingId: 100, buildingName: 'Baustelle', integrity: 0, maxIntegrity: 0, damageRatio: 0, energyCost: 0, costs: [], repairable: false, reason: 'Gebäude im Bau' }] };
  }, [preview]);
  const repair = async () => {
    if (failed) throw new Error('Cannot repair orbital buildings while colony is blockaded');
    setField({ ...field, integrity: 100 }); setEnergy(energy - 7); setStock({ 2: stock[2] - 7, 3: stock[3] - 3 });
  };
  const scenario = (kind: string) => { setField(fieldBase); setEnergy(kind === 'energy' ? 2 : 50); setStock({ 2: kind === 'stock' ? 2 : 20, 3: 10 }); setFailed(kind === 'error'); setView(kind === 'bulk' ? 'bulk' : 'single'); setOpen(kind !== 'bulk'); };
  return <main className="mx-auto max-w-4xl space-y-4 p-5"><h1 className="text-lg text-swu-primary">Gebäudereparatur – lokale Testdaten</h1><div className="flex flex-wrap gap-3"><button className={buttonClass} onClick={() => scenario('single')}>Einzelreparatur prüfen</button><button className={buttonClass} onClick={() => scenario('energy')}>Energiemangel prüfen</button><button className={buttonClass} onClick={() => scenario('stock')}>Warenmangel prüfen</button><button className={buttonClass} onClick={() => scenario('error')}>Fehlermeldung prüfen</button><button className={buttonClass} onClick={() => scenario('bulk')}>Sammelreparatur prüfen</button></div><p className="text-xs">Integrität {field.integrity}/100 · Energie {energy} · Baumaterial {stock[2]} · Durastahl {stock[3]}</p>
  {view === 'bulk' && <PanelBuildingManagement management={{ counts: { active: 0, inactive: 2, damaged: field.integrity < 100 ? 2 : 1, building: 1 }, fields: [{ ...field, buildingName: building.name, functions: [] }, { ...fieldBase, id: 2, fieldIndex: 6, integrity: 20, buildingName: 'Lagerzentrum', functions: [] }, { ...fieldBase, id: 3, fieldIndex: 7, isBuilding: true, integrity: 0, maxIntegrity: 0, buildingName: 'Baustelle', functions: [] }], usableCommodities: [commodities[2], commodities[3]] }} colonyId={1} energyAvailable={energy} storageAmounts={stock} commodityMap={commodities} onFetchRepairPreview={bulkPreview} onRepairDamaged={async () => { await repair(); return { action: 'REPAIR', repaired: [{ fieldIndex: 5, buildingId: 100, buildingName: building.name }], skipped: [{ fieldIndex: 6, buildingId: 100, reason: 'Nicht genug Baumaterial: benötigt 30, vorhanden 13' }, { fieldIndex: 7, buildingId: 100, reason: 'Gebäude im Bau' }], totalEnergyCost: 7, totalCosts: [{ commodityId: 2, amount: 7 }, { commodityId: 3, amount: 3 }], previewAfter: { fields: [], totalEnergyCost: 0, totalCosts: [] } }; }} onActivate={async () => ({ changed: [], skipped: [] })} onDeactivate={async () => ({ changed: [], skipped: [] })} />}
  {open && <ColonyFieldDialog field={field} building={building} buildingMap={{ 100: building }} commodityMap={commodities} terraformingDefs={[]} colonyId={1} energyAvailable={energy} storageAmounts={stock} onFetchRepairPreview={preview} onRepairBuilding={repair} onClose={() => setOpen(false)} onOpenContext={noop} onOpenBuildMenu={noop} onFilterBuildMenuByCommodity={noop} onOpenAcademy={noop} onTerraform={noop} onBuildDome={noop} onRepairWreck={noop} onUpgrade={noop} onDemolish={noop} onToggle={noop} />}
  </main>;
}
createRoot(document.getElementById('root')!).render(<Harness />);
