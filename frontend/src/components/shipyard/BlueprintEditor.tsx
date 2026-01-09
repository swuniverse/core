import { useState, useEffect, useCallback } from 'react';
import { Save, Rocket, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  ShipClass,
  ShipClassConfig,
  ModuleType,
  BlueprintModule,
  BlueprintStats,
  ConstructionCosts,
  ResearchValidationResult,
  CreateBlueprintInput,
} from '../../types/blueprint';
import { blueprintApi } from '../../lib/blueprintApi';
import HullSelector from './HullSelector';
import ModuleSlot from './ModuleSlot';
import StatsDisplay from './StatsDisplay';
import CostDisplay from './CostDisplay';

interface BlueprintEditorProps {
  onSave?: (blueprint: any) => void;
  onCancel?: () => void;
  initialBlueprint?: any;
  planetResources?: {
    credits: number;
    durastahl: number;
    kristallinesSilizium: number;
    tibannaGas: number;
    kyberKristalle: number;
    beskar: number;
    energiemodule: number;
  };
}

export default function BlueprintEditor({
  onSave,
  onCancel,
  initialBlueprint,
  planetResources,
}: BlueprintEditorProps) {
  // State
  const [shipClasses, setShipClasses] = useState<ShipClassConfig[]>([]);
  const [availableModules, setAvailableModules] = useState<ModuleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // Blueprint State
  const [name, setName] = useState(initialBlueprint?.name || '');
  const [selectedClass, setSelectedClass] = useState<ShipClass | null>(
    initialBlueprint?.shipClass || null
  );
  const [modules, setModules] = useState<Map<number, BlueprintModule>>(new Map());
  const [description] = useState(initialBlueprint?.description || '');

  // Calculated State
  const [stats, setStats] = useState<BlueprintStats | null>(null);
  const [costs, setCosts] = useState<ConstructionCosts | null>(null);
  const [validation, setValidation] = useState<ResearchValidationResult | null>(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [classesData, modulesData] = await Promise.all([
          blueprintApi.getShipClasses(),
          blueprintApi.getAvailableModules(),
        ]);
        setShipClasses(classesData);
        setAvailableModules(modulesData);

        // Load initial modules if editing
        if (initialBlueprint?.modules) {
          const moduleMap = new Map<number, BlueprintModule>();
          initialBlueprint.modules.forEach((m: BlueprintModule) => {
            moduleMap.set(m.slotPosition, m);
          });
          setModules(moduleMap);
        }
      } catch (error) {
        console.error('Failed to load blueprint data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [initialBlueprint]);

  // Calculate stats when modules change
  const calculateStats = useCallback(async () => {
    if (!selectedClass || modules.size === 0) {
      setStats(null);
      setCosts(null);
      setValidation(null);
      return;
    }

    setCalculating(true);
    try {
      const moduleArray = Array.from(modules.values()).map((m) => ({
        moduleTypeId: m.moduleTypeId,
        level: m.level,
        slotPosition: m.slotPosition,
      }));

      const result = await blueprintApi.calculateBlueprint(selectedClass, moduleArray);
      setStats(result.stats);
      setCosts(result.costs);
      setValidation(result.researchValidation);
    } catch (error) {
      console.error('Failed to calculate:', error);
    } finally {
      setCalculating(false);
    }
  }, [selectedClass, modules]);

  // Debounced calculation
  useEffect(() => {
    const timer = setTimeout(calculateStats, 300);
    return () => clearTimeout(timer);
  }, [calculateStats]);

  // Get max slots for selected class
  const maxSlots = shipClasses.find((c) => c.id === selectedClass)?.maxSlots ?? 0;

  // Handle module selection
  const handleModuleSelect = (slotPosition: number, moduleTypeId: number, level: number) => {
    const newModules = new Map(modules);
    newModules.set(slotPosition, {
      moduleTypeId,
      level,
      slotPosition,
    });
    setModules(newModules);
  };

  // Handle module removal
  const handleModuleRemove = (slotPosition: number) => {
    const newModules = new Map(modules);
    newModules.delete(slotPosition);
    setModules(newModules);
  };

  // Handle level change
  const handleLevelChange = (slotPosition: number, level: number) => {
    const mod = modules.get(slotPosition);
    if (mod) {
      const newModules = new Map(modules);
      newModules.set(slotPosition, { ...mod, level });
      setModules(newModules);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!name.trim() || !selectedClass || modules.size === 0) {
      alert('Bitte gib einen Namen ein und konfiguriere mindestens ein Modul.');
      return;
    }

    setSaving(true);
    try {
      const input: CreateBlueprintInput = {
        name: name.trim(),
        shipClass: selectedClass,
        description: description.trim() || undefined,
        modules: Array.from(modules.values()).map((m) => ({
          moduleTypeId: m.moduleTypeId,
          level: m.level,
          slotPosition: m.slotPosition,
        })),
      };

      const blueprint = initialBlueprint
        ? await blueprintApi.updateBlueprint(initialBlueprint.id, input)
        : await blueprintApi.createBlueprint(input);

      onSave?.(blueprint);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
            <Rocket className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white font-mono tracking-tight">
              SCHIFFS-BLUEPRINT EDITOR
            </h2>
            <p className="text-gray-400 text-sm">
              Konfiguriere dein individuelles Raumschiff
            </p>
          </div>
        </div>

        {/* Blueprint Name */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">
              Blueprint-Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Mein X-Wing Mk.II"
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
            />
          </div>
          <HullSelector
            shipClasses={shipClasses}
            selectedClass={selectedClass}
            onSelect={setSelectedClass}
          />
        </div>
      </div>

      {/* Main Grid */}
      {selectedClass && (
        <div className="grid grid-cols-3 gap-6">
          {/* Module Slots */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm text-gray-400 font-mono uppercase tracking-wider">
                Modul-Slots ({modules.size}/{maxSlots})
              </h3>
              {calculating && (
                <div className="flex items-center gap-2 text-cyan-400 text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Berechne...
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: maxSlots }, (_, i) => i + 1).map((slot) => (
                <ModuleSlot
                  key={slot}
                  slotPosition={slot}
                  module={modules.get(slot) || null}
                  availableModules={availableModules}
                  onModuleSelect={(moduleTypeId, level) =>
                    handleModuleSelect(slot, moduleTypeId, level)
                  }
                  onModuleRemove={() => handleModuleRemove(slot)}
                  onLevelChange={(level) => handleLevelChange(slot, level)}
                />
              ))}
            </div>
          </div>

          {/* Stats & Costs Panel */}
          <div className="space-y-4">
            <StatsDisplay stats={stats} isCalculating={calculating} />
            <CostDisplay costs={costs} planetResources={planetResources} />

            {/* Validation Warnings */}
            {validation && !validation.isValid && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold text-sm">Fehlende Forschung</span>
                </div>
                <ul className="space-y-1 text-xs text-red-300">
                  {validation.missingResearch.map((mr, i) => (
                    <li key={i}>
                      {mr.moduleName}: {mr.requiredResearchName}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={handleSave}
                disabled={
                  saving ||
                  !name.trim() ||
                  modules.size === 0 ||
                  !!(validation && !validation.isValid)
                }
                className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 disabled:from-gray-700 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Speichere...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Blueprint speichern
                  </>
                )}
              </button>

              {onCancel && (
                <button
                  onClick={onCancel}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedClass && (
        <div className="bg-gray-900/30 border border-dashed border-gray-700 rounded-xl p-12 text-center">
          <Rocket className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Waehle eine Schiffsklasse aus</p>
          <p className="text-gray-600 text-sm mt-2">
            Verschiedene Klassen bieten unterschiedliche Modul-Slots und Boni
          </p>
        </div>
      )}
    </div>
  );
}
