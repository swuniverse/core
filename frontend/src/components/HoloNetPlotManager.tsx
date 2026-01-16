import { useState } from 'react';
import { FileText, Plus, Search } from 'lucide-react';
import PlotSelector from './PlotSelector';
import PlotCreationModal from './PlotCreationModal';
import { DetailedPlotBadge, CompactPlotBadge, type Plot } from './PlotBadge';

interface HoloNetPlotManagerProps {
  selectedPlotId: number | null;
  onPlotSelect: (plotId: number | null) => void;
  className?: string;
}

export default function HoloNetPlotManager({
  selectedPlotId,
  onPlotSelect,
  className = ''
}: HoloNetPlotManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPlotList, setShowPlotList] = useState(false);

  const handlePlotCreated = (newPlot: Plot) => {
    // In a real implementation, you would:
    // 1. Add the new plot to your plots list state
    // 2. Optionally select the new plot automatically
    // 3. Refresh any plot data that needs updating
    console.log('New plot created:', newPlot);
    onPlotSelect(newPlot.id);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Imperial Command Plot Control Interface */}
      <div className="bg-gradient-to-r from-purple-950/30 to-violet-950/20 border border-purple-500/30 rounded-lg p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-900/40 border border-purple-500/40 rounded">
              <FileText size={18} className="text-purple-300" />
            </div>
            <h3 className="text-lg font-mono font-semibold text-purple-100 tracking-wider">
              HOLONET RPG-PLOT MANAGER
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPlotList(!showPlotList)}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/40 border border-purple-500/40 hover:bg-purple-900/60 hover:border-purple-400/60 rounded text-xs font-mono text-purple-300 transition-all"
            >
              <Search size={12} />
              {showPlotList ? 'LISTE SCHLIESSEN' : 'PLOTS ANZEIGEN'}
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 border border-purple-500/50 rounded text-xs font-mono text-white font-semibold transition-all"
            >
              <Plus size={12} />
              NEUER PLOT
            </button>
          </div>
        </div>

        {/* Plot Selection Interface */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-mono font-semibold text-purple-100 tracking-wider min-w-0 flex-shrink-0">
              AKTIVER PLOT:
            </label>
            <PlotSelector
              selectedPlotId={selectedPlotId}
              onPlotSelect={onPlotSelect}
              onCreatePlotClick={() => setShowCreateModal(true)}
              className="flex-1"
            />
          </div>

          {selectedPlotId && (
            <div className="text-xs text-purple-400/70 font-mono">
              <span className="text-purple-300">HINWEIS:</span> Alle neuen Nachrichten werden diesem Plot zugeordnet.
              Wählen Sie "KEIN PLOT" für öffentliche Nachrichten.
            </div>
          )}
        </div>

        {/* Expanded Plot List View */}
        {showPlotList && (
          <div className="mt-6 pt-6 border-t border-purple-500/20">
            <div className="mb-4">
              <h4 className="text-sm font-mono font-semibold text-purple-100 tracking-wider mb-3">
                VERFÜGBARE PLOTS
              </h4>
              <div className="text-xs text-purple-400/60 font-mono">
                Klicken Sie auf einen Plot, um detaillierte Informationen anzuzeigen und ihn auszuwählen.
              </div>
            </div>

            {/* This would be populated with real plot data in implementation */}
            <div className="space-y-3">
              <DetailedPlotBadge
                plot={{
                  id: 1,
                  title: "Operation Nebula",
                  description: "Geheimmission zur Erkundung des unbekannten Nebels im Outer Rim",
                  isActive: true,
                  messageCount: 23,
                  creator: {
                    username: "Commander_Rex",
                    factionName: "Galactic Empire"
                  },
                  updatedAt: "2024-01-15T10:30:00Z"
                }}
                onClick={() => onPlotSelect(1)}
                showStats={true}
              />

              <DetailedPlotBadge
                plot={{
                  id: 2,
                  title: "Rebellion Underground",
                  description: "Koordination des Widerstands gegen die imperiale Blockade",
                  isActive: true,
                  messageCount: 45,
                  creator: {
                    username: "Mon_Mothma",
                    factionName: "Rebel Alliance"
                  },
                  updatedAt: "2024-01-14T18:45:00Z"
                }}
                onClick={() => onPlotSelect(2)}
                showStats={true}
              />

              <DetailedPlotBadge
                plot={{
                  id: 3,
                  title: "Trade Routes Disrupted",
                  description: "Investigation into missing cargo ships",
                  isActive: false,
                  messageCount: 12,
                  creator: {
                    username: "Lando_Cal",
                    factionName: "Independent"
                  },
                  updatedAt: "2024-01-10T14:20:00Z"
                }}
                onClick={() => onPlotSelect(3)}
                showStats={true}
              />
            </div>
          </div>
        )}
      </div>

      {/* Example Integration: Compact Plot List */}
      <div className="bg-gradient-to-r from-purple-950/20 to-violet-950/10 border border-purple-500/20 rounded p-4 backdrop-blur-sm">
        <div className="mb-3">
          <h4 className="text-sm font-mono font-semibold text-purple-100 tracking-wider">
            QUICK ACCESS - AKTIVE PLOTS
          </h4>
        </div>
        <div className="flex flex-wrap gap-2">
          <CompactPlotBadge
            plot={{
              id: 1,
              title: "Operation Nebula",
              messageCount: 23
            }}
            onClick={() => onPlotSelect(1)}
            showStats={true}
          />
          <CompactPlotBadge
            plot={{
              id: 2,
              title: "Rebellion Underground",
              messageCount: 45
            }}
            onClick={() => onPlotSelect(2)}
            showStats={true}
          />
          <CompactPlotBadge
            plot={{
              id: 4,
              title: "Smuggler Network",
              messageCount: 8
            }}
            onClick={() => onPlotSelect(4)}
            showStats={true}
          />
        </div>
      </div>

      {/* Plot Creation Modal */}
      <PlotCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPlotCreated={handlePlotCreated}
      />
    </div>
  );
}

// Usage Example Component for Documentation
export const HoloNetPlotManagerExample = () => {
  const [selectedPlotId, setSelectedPlotId] = useState<number | null>(null);

  return (
    <div className="p-6 bg-slate-950/50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-mono font-bold text-cyan-100 tracking-wider mb-2">
            HOLONET RPG PLOT SYSTEM DEMO
          </h1>
          <p className="text-sm text-cyan-400/70 font-mono">
            Imperial Command Terminal Interface for RPG Plot Management
          </p>
        </div>

        <HoloNetPlotManager
          selectedPlotId={selectedPlotId}
          onPlotSelect={setSelectedPlotId}
        />

        {/* Status Display */}
        <div className="mt-6 p-4 bg-cyan-950/20 border border-cyan-500/30 rounded">
          <div className="text-sm font-mono">
            <span className="text-cyan-400/70">SELECTED PLOT ID: </span>
            <span className="text-cyan-100 font-semibold">
              {selectedPlotId || 'NONE (PUBLIC MESSAGES)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};