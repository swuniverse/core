import { useState } from 'react';
import {
  Plus,
  X,
  Lock,
  Zap,
  Gauge,
  Crosshair,
  Shield,
  Radar,
  Package,
  Heart,
  HardDrive,
  Magnet,
  Sparkles,
} from 'lucide-react';
import {
  ModuleType,
  ModuleCategory,
  BlueprintModule,
  MODULE_CATEGORY_NAMES,
  MODULE_CATEGORY_COLORS,
} from '../../types/blueprint';

// Icon-Mapping
const CategoryIcon = ({ category }: { category: ModuleCategory }) => {
  const iconClass = 'w-4 h-4';
  switch (category) {
    case 'HYPERDRIVE':
      return <Zap className={iconClass} />;
    case 'SUBLIGHT_ENGINE':
      return <Gauge className={iconClass} />;
    case 'WEAPONS':
      return <Crosshair className={iconClass} />;
    case 'SHIELDS':
      return <Shield className={iconClass} />;
    case 'SENSORS':
      return <Radar className={iconClass} />;
    case 'CARGO':
      return <Package className={iconClass} />;
    case 'LIFE_SUPPORT':
      return <Heart className={iconClass} />;
    case 'HULL':
      return <HardDrive className={iconClass} />;
    case 'TRACTOR_BEAM':
      return <Magnet className={iconClass} />;
    case 'SPECIAL':
      return <Sparkles className={iconClass} />;
    default:
      return <Package className={iconClass} />;
  }
};

interface ModuleSlotProps {
  slotPosition: number;
  module: BlueprintModule | null;
  availableModules: ModuleType[];
  onModuleSelect: (moduleTypeId: number, level: number) => void;
  onModuleRemove: () => void;
  onLevelChange: (level: number) => void;
}

export default function ModuleSlot({
  slotPosition,
  module,
  availableModules,
  onModuleSelect,
  onModuleRemove,
  onLevelChange,
}: ModuleSlotProps) {
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ModuleCategory | null>(
    null
  );

  const selectedModuleType = module
    ? availableModules.find((m) => m.id === module.moduleTypeId)
    : null;

  // Gruppiere Module nach Kategorie
  const categories = [...new Set(availableModules.map((m) => m.category))];
  const filteredModules = selectedCategory
    ? availableModules.filter((m) => m.category === selectedCategory)
    : availableModules;

  return (
    <div
      className={`
      relative rounded-lg border transition-all duration-200
      ${
        module
          ? `bg-gradient-to-br ${
              selectedModuleType
                ? MODULE_CATEGORY_COLORS[selectedModuleType.category]
                : 'bg-gray-800/50 border-gray-700'
            }`
          : 'bg-gray-900/30 border-gray-800 border-dashed hover:border-gray-600'
      }
    `}
    >
      {/* Slot Header */}
      <div className="px-3 py-2 border-b border-gray-700/50 flex items-center justify-between">
        <span className="text-xs text-gray-500 font-mono">SLOT {slotPosition}</span>
        {module && (
          <button
            onClick={onModuleRemove}
            className="text-gray-500 hover:text-red-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Module Content */}
      <div className="p-3">
        {module && selectedModuleType ? (
          <div className="space-y-3">
            {/* Module Info */}
            <div className="flex items-start gap-2">
              <div
                className={`p-2 rounded ${
                  MODULE_CATEGORY_COLORS[selectedModuleType.category]
                }`}
              >
                <CategoryIcon category={selectedModuleType.category} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {selectedModuleType.name}
                </p>
                <p className="text-xs text-gray-400">
                  {MODULE_CATEGORY_NAMES[selectedModuleType.category]}
                </p>
              </div>
            </div>

            {/* Level Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Level</span>
                <span className="text-sm font-mono text-cyan-400">
                  {module.level} / {selectedModuleType.maxLevel}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={
                  selectedModuleType.isUnlocked
                    ? selectedModuleType.unlockedLevel
                    : 1
                }
                value={module.level}
                onChange={(e) => onLevelChange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-cyan-500
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:transition-all
                  [&::-webkit-slider-thumb]:hover:bg-cyan-400
                  [&::-webkit-slider-thumb]:hover:scale-110"
              />
              <div className="flex justify-between text-xs text-gray-600">
                <span>1</span>
                <span>{selectedModuleType.maxLevel}</span>
              </div>
            </div>

            {/* Quick Stats Preview */}
            {module.calculatedStats && (
              <div className="grid grid-cols-2 gap-1 text-xs">
                {module.calculatedStats.damage > 0 && (
                  <div className="flex items-center gap-1 text-red-400">
                    <Crosshair className="w-3 h-3" />
                    {module.calculatedStats.damage}
                  </div>
                )}
                {module.calculatedStats.shieldStrength > 0 && (
                  <div className="flex items-center gap-1 text-purple-400">
                    <Shield className="w-3 h-3" />
                    {module.calculatedStats.shieldStrength}
                  </div>
                )}
                {module.calculatedStats.speed > 0 && (
                  <div className="flex items-center gap-1 text-cyan-400">
                    <Gauge className="w-3 h-3" />
                    {module.calculatedStats.speed}
                  </div>
                )}
                {module.calculatedStats.hullPoints > 0 && (
                  <div className="flex items-center gap-1 text-gray-400">
                    <HardDrive className="w-3 h-3" />
                    {module.calculatedStats.hullPoints}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setIsSelectOpen(true)}
            className="w-full py-6 flex flex-col items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <Plus className="w-8 h-8" />
            <span className="text-xs">Modul hinzufuegen</span>
          </button>
        )}
      </div>

      {/* Module Selection Modal */}
      {isSelectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Modul auswaehlen</h3>
              <button
                onClick={() => {
                  setIsSelectOpen(false);
                  setSelectedCategory(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Category Filter */}
            <div className="px-6 py-3 border-b border-gray-800 flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === null
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                Alle
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                    selectedCategory === cat
                      ? MODULE_CATEGORY_COLORS[cat]
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  <CategoryIcon category={cat} />
                  {MODULE_CATEGORY_NAMES[cat]}
                </button>
              ))}
            </div>

            {/* Module List */}
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {filteredModules.map((mod) => (
                  <button
                    key={mod.id}
                    onClick={() => {
                      if (mod.isUnlocked) {
                        onModuleSelect(mod.id, 1);
                        setIsSelectOpen(false);
                        setSelectedCategory(null);
                      }
                    }}
                    disabled={!mod.isUnlocked}
                    className={`
                      p-4 rounded-lg border text-left transition-all
                      ${
                        mod.isUnlocked
                          ? `${MODULE_CATEGORY_COLORS[mod.category]} hover:scale-[1.02] cursor-pointer`
                          : 'bg-gray-900/50 border-gray-800 opacity-50 cursor-not-allowed'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded ${
                          mod.isUnlocked
                            ? MODULE_CATEGORY_COLORS[mod.category]
                            : 'bg-gray-800'
                        }`}
                      >
                        {mod.isUnlocked ? (
                          <CategoryIcon category={mod.category} />
                        ) : (
                          <Lock className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium text-sm ${
                            mod.isUnlocked ? 'text-white' : 'text-gray-500'
                          }`}
                        >
                          {mod.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {MODULE_CATEGORY_NAMES[mod.category]}
                        </p>
                        {!mod.isUnlocked && mod.requiredResearchName && (
                          <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            {mod.requiredResearchName}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                      {mod.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
