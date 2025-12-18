import { X, Clock, Coins, Wrench, Hammer, Zap, Factory, Shield, Microscope, Building2, Gem, Wind, Battery, Sparkles, Heart } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useGameStore } from '../stores/gameStore';

interface BuildingType {
  id: number;
  name: string;
  description: string;
  category: string;
  buildCostCredits: number;
  buildCostDurastahl: number;
  buildCostKristallinesSilizium: number;
  buildCostTibannaGas: number;
  buildCostEnergiemodule: number;
  buildCostKyberKristalle: number;
  buildCostBacta: number;
  buildCostBeskar: number;
  buildTime: number;
  energyCostPerTick: number;
  energyCostToBuild: number;
  energyProduction: number;
  durastahlProduction: number;
  kristallinesSiliziumProduction: number;
  tibannaGasProduction: number;
  energiemoduleProduction: number;
  kyberKristalleProduction: number;
  bactaProduction: number;
  beskarProduction: number;
  creditProduction: number;
}

interface BuildMenuProps {
  planetId: number;
  fieldId: number;
  onClose: () => void;
  onBuildStarted: () => void;
  existingBuildings?: Array<{ buildingType: { name: string } }>;
  planetResources: {
    credits: number;
    durastahl: number;
    kristallinesSilizium: number;
    tibannaGas: number;
    energiemodule: number;
    kyberKristalle: number;
    bacta: number;
    beskar: number;
    energyStorage: number;
  };
}

const categories = [
  { id: 'all', name: 'Alle', icon: Building2 },
  { id: 'INFRASTRUCTURE', name: 'Infrastruktur', icon: Hammer },
  { id: 'RESOURCE', name: 'Ressourcen', icon: Wrench },
  { id: 'PRODUCTION', name: 'Produktion', icon: Factory },
  { id: 'DEFENSE', name: 'Verteidigung', icon: Shield },
  { id: 'RESEARCH', name: 'Forschung', icon: Microscope },
];

export default function BuildMenu({ planetId, fieldId, onClose, onBuildStarted, existingBuildings = [], planetResources }: BuildMenuProps) {
  const [buildingTypes, setBuildingTypes] = useState<BuildingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { user } = useGameStore();

  const hasCommandCenter = existingBuildings.some(b => b.buildingType.name === 'Kommandozentrale');

  useEffect(() => {
    loadBuildingTypes();
  }, []);

  const loadBuildingTypes = async () => {
    try {
      const response = await api.get('/planet/building-types/all');
      setBuildingTypes(response.data);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load building types');
      setLoading(false);
    }
  };

  const canAfford = (buildingType: BuildingType) => {
    return (
      planetResources.credits >= buildingType.buildCostCredits &&
      planetResources.durastahl >= buildingType.buildCostDurastahl &&
      planetResources.kristallinesSilizium >= buildingType.buildCostKristallinesSilizium &&
      planetResources.tibannaGas >= buildingType.buildCostTibannaGas &&
      planetResources.energiemodule >= buildingType.buildCostEnergiemodule &&
      planetResources.kyberKristalle >= buildingType.buildCostKyberKristalle &&
      planetResources.bacta >= buildingType.buildCostBacta &&
      planetResources.beskar >= buildingType.buildCostBeskar
    );
  };

  const startBuild = async (buildingTypeId: number) => {
    setBuilding(true);
    setError('');

    try {
      await api.post(`/planet/${planetId}/build`, {
        buildingTypeId,
        fieldId,
      });

      onBuildStarted();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start construction');
      setBuilding(false);
    }
  };

  const filteredBuildings = selectedCategory === 'all' 
    ? buildingTypes 
    : buildingTypes.filter(bt => bt.category === selectedCategory);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-space-light rounded-lg border border-gray-700 max-w-6xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Gebäude auswählen</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="border-b border-gray-700 px-6 pt-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(cat => {
              const Icon = cat.icon;
              const count = cat.id === 'all' ? buildingTypes.length : buildingTypes.filter(bt => bt.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t transition whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-rebel text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <Icon size={16} />
                  <span>{cat.name}</span>
                  <span className="text-xs opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="text-center text-gray-400 py-8">Lade Gebäude...</div>
          )}

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded p-4 mb-4">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredBuildings.map((buildingType) => {
              const affordable = canAfford(buildingType);
              const isCommandCenter = buildingType.name === 'Kommandozentrale';
              const isDisabled = !affordable || (isCommandCenter && hasCommandCenter);

              return (
                <div
                  key={buildingType.id}
                  className={`bg-gray-800/50 border rounded-lg p-4 transition flex flex-col h-full ${
                    isDisabled
                      ? 'border-gray-700 opacity-60'
                      : 'border-gray-600 hover:border-rebel hover:shadow-lg'
                  }`}
                >
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {buildingType.name}
                    </h3>
                    <p className="text-gray-400 text-xs mb-3 line-clamp-2">
                      {buildingType.description}
                    </p>

                    {/* Compact Stats */}
                    <div className="space-y-2 mb-3">
                      {/* Costs */}
                      <div className="flex flex-wrap gap-2">
                        {buildingType.buildCostCredits > 0 && (
                          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                            planetResources.credits >= buildingType.buildCostCredits
                              ? 'bg-yellow-900/30 text-yellow-300'
                              : 'bg-red-900/30 text-red-400'
                          }`}>
                            <Coins size={12} />
                            {buildingType.buildCostCredits}
                          </div>
                        )}
                        {buildingType.buildCostDurastahl > 0 && (
                          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                            planetResources.durastahl >= buildingType.buildCostDurastahl
                              ? 'bg-gray-700 text-gray-300'
                              : 'bg-red-900/30 text-red-400'
                          }`}>
                            <Wrench size={12} />
                            {buildingType.buildCostDurastahl}
                          </div>
                        )}
                        {buildingType.buildCostKristallinesSilizium > 0 && (
                          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                            planetResources.kristallinesSilizium >= buildingType.buildCostKristallinesSilizium
                              ? 'bg-purple-900/30 text-purple-300'
                              : 'bg-red-900/30 text-red-400'
                          }`}>
                            <Gem size={12} />
                            {buildingType.buildCostKristallinesSilizium}
                          </div>
                        )}
                        {buildingType.buildCostTibannaGas > 0 && (
                          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                            planetResources.tibannaGas >= buildingType.buildCostTibannaGas
                              ? 'bg-cyan-900/30 text-cyan-300'
                              : 'bg-red-900/30 text-red-400'
                          }`}>
                            <Wind size={12} />
                            {buildingType.buildCostTibannaGas}
                          </div>
                        )}
                        {buildingType.buildCostEnergiemodule > 0 && (
                          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                            planetResources.energiemodule >= buildingType.buildCostEnergiemodule
                              ? 'bg-blue-900/30 text-blue-300'
                              : 'bg-red-900/30 text-red-400'
                          }`}>
                            <Battery size={12} />
                            {buildingType.buildCostEnergiemodule}
                          </div>
                        )}
                        {buildingType.buildCostKyberKristalle > 0 && (
                          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                            planetResources.kyberKristalle >= buildingType.buildCostKyberKristalle
                              ? 'bg-green-900/30 text-green-300'
                              : 'bg-red-900/30 text-red-400'
                          }`}>
                            <Sparkles size={12} />
                            {buildingType.buildCostKyberKristalle}
                          </div>
                        )}
                        {buildingType.buildCostBacta > 0 && (
                          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                            planetResources.bacta >= buildingType.buildCostBacta
                              ? 'bg-rose-900/30 text-rose-300'
                              : 'bg-red-900/30 text-red-400'
                          }`}>
                            <Heart size={12} />
                            {buildingType.buildCostBacta}
                          </div>
                        )}
                        {buildingType.buildCostBeskar > 0 && (
                          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                            planetResources.beskar >= buildingType.buildCostBeskar
                              ? 'bg-slate-900/30 text-slate-300'
                              : 'bg-red-900/30 text-red-400'
                          }`}>
                            <Shield size={12} />
                            {buildingType.buildCostBeskar}
                          </div>
                        )}
                      </div>

                      {/* Production */}
                      <div className="flex flex-wrap gap-2">
                        {buildingType.creditProduction > 0 && (
                          <div className="flex items-center gap-1 text-xs text-green-400">
                            <Coins size={12} />
                            +{buildingType.creditProduction}/T
                          </div>
                        )}
                        {buildingType.durastahlProduction > 0 && (
                          <div className="flex items-center gap-1 text-xs text-green-400">
                            <Wrench size={12} />
                            +{buildingType.durastahlProduction}/T
                          </div>
                        )}
                        {buildingType.kristallinesSiliziumProduction > 0 && (
                          <div className="flex items-center gap-1 text-xs text-green-400">
                            <Gem size={12} />
                            +{buildingType.kristallinesSiliziumProduction}/T
                          </div>
                        )}
                        {buildingType.tibannaGasProduction > 0 && (
                          <div className="flex items-center gap-1 text-xs text-green-400">
                            <Wind size={12} />
                            +{buildingType.tibannaGasProduction}/T
                          </div>
                        )}
                        {buildingType.energiemoduleProduction > 0 && (
                          <div className="flex items-center gap-1 text-xs text-green-400">
                            <Battery size={12} />
                            +{buildingType.energiemoduleProduction}/T
                          </div>
                        )}
                        {buildingType.kyberKristalleProduction > 0 && (
                          <div className="flex items-center gap-1 text-xs text-green-400">
                            <Sparkles size={12} />
                            +{buildingType.kyberKristalleProduction}/T
                          </div>
                        )}
                        {buildingType.bactaProduction > 0 && (
                          <div className="flex items-center gap-1 text-xs text-green-400">
                            <Heart size={12} />
                            +{buildingType.bactaProduction}/T
                          </div>
                        )}
                        {buildingType.beskarProduction > 0 && (
                          <div className="flex items-center gap-1 text-xs text-green-400">
                            <Shield size={12} />
                            +{buildingType.beskarProduction}/T
                          </div>
                        )}
                        {buildingType.energyProduction > 0 && (
                          <div className="flex items-center gap-1 text-xs text-yellow-400">
                            <Zap size={12} />
                            +{buildingType.energyProduction}/Tick
                          </div>
                        )}
                        {buildingType.energyCostPerTick > 0 && (
                          <div className="flex items-center gap-1 text-xs text-red-400">
                            <Zap size={12} />
                            -{buildingType.energyCostPerTick}/Tick
                          </div>
                        )}
                        {buildingType.energyCostToBuild > 0 && (
                          <div className="flex items-center gap-1 text-xs text-orange-400">
                            <Battery size={12} />
                            {buildingType.energyCostToBuild} E (Bau)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock size={12} />
                      {buildingType.buildTime}min
                    </div>
                    <button
                      onClick={() => startBuild(buildingType.id)}
                      disabled={isDisabled || building}
                      className={`px-3 py-1.5 rounded text-sm font-semibold transition ${
                        !isDisabled && !building
                          ? 'bg-rebel hover:bg-rebel-light text-white'
                          : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {building ? 'Baue...' : isCommandCenter && hasCommandCenter ? 'Gebaut' : 'Bauen'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredBuildings.length === 0 && !loading && (
            <div className="text-center text-gray-400 py-8">
              Keine Gebäude in dieser Kategorie verfügbar.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-gray-800/30">
          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Coins size={16} className="text-yellow-500" />
                <span className="text-white font-semibold">{planetResources.credits.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Wrench size={16} className="text-gray-400" />
                <span className="text-white font-semibold">{planetResources.durastahl.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Gem size={16} className="text-purple-400" />
                <span className="text-white font-semibold">{planetResources.kristallinesSilizium.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-yellow-400" />
                <span className="text-white font-semibold">{planetResources.energyStorage.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Wind size={16} className="text-cyan-400" />
                <span className="text-white font-semibold">{planetResources.tibannaGas.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Battery size={16} className="text-blue-400" />
                <span className="text-white font-semibold">{planetResources.energiemodule.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-green-400" />
                <span className="text-white font-semibold">{planetResources.kyberKristalle.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart size={16} className="text-rose-400" />
                <span className="text-white font-semibold">{planetResources.bacta.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-slate-400" />
                <span className="text-white font-semibold">{planetResources.beskar.toLocaleString()}</span>
              </div>
            </div>
            <span className="text-gray-400">Deine Ressourcen</span>
          </div>
        </div>
      </div>
    </div>
  );
}
