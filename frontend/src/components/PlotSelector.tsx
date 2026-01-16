import { useState, useEffect, useRef } from 'react';
import { ChevronDown, FileText, Users, Plus, Clock } from 'lucide-react';
import api from '../lib/api';

interface Plot {
  id: number;
  title: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: number;
    username: string;
    factionName: string;
  };
  messageCount: number;
}

interface PlotSelectorProps {
  selectedPlotId: number | null;
  onPlotSelect: (plotId: number | null) => void;
  onCreatePlotClick: () => void;
  className?: string;
}

export default function PlotSelector({
  selectedPlotId,
  onPlotSelect,
  onCreatePlotClick,
  className = ''
}: PlotSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load plots when dropdown opens
  useEffect(() => {
    if (isOpen && plots.length === 0) {
      loadPlots();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadPlots = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/holonet/plots');
      setPlots(response.data);
    } catch (err: any) {
      console.error('Failed to load plots:', err);
      setError('Fehler beim Laden der Plots');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlot = plots.find(plot => plot.id === selectedPlotId);

  const handlePlotSelect = (plotId: number | null) => {
    onPlotSelect(plotId);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between w-full min-w-[200px] px-4 py-2.5 bg-gradient-to-r from-purple-950/40 to-violet-900/30 border border-purple-500/40 rounded text-sm font-mono tracking-wider text-purple-100 hover:border-purple-400/60 hover:bg-gradient-to-r hover:from-purple-900/50 hover:to-violet-800/40 transition-all backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 whitespace-nowrap"
        style={{ display: 'inline-flex' }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileText size={14} className="text-purple-400 flex-shrink-0" />
          <span className="truncate">
            {selectedPlot ? selectedPlot.title.toUpperCase() : 'PLOT AUSWÄHLEN'}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-purple-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gradient-to-br from-slate-950/95 to-purple-950/80 border border-purple-500/40 rounded backdrop-blur-md shadow-xl z-50 max-h-80 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-purple-500/20 bg-purple-900/20">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono font-semibold text-purple-100 tracking-wider">
                RPG-PLOTS
              </h3>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onCreatePlotClick();
                }}
                className="flex items-center gap-1 px-2 py-1 bg-purple-900/40 border border-purple-500/40 hover:bg-purple-900/60 hover:border-purple-400/60 rounded text-xs font-mono text-purple-300 transition-all"
              >
                <Plus size={12} />
                NEU
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="px-4 py-6 text-center">
                <div className="text-purple-400/70 text-sm font-mono">LADE PLOTS...</div>
              </div>
            )}

            {error && (
              <div className="px-4 py-4">
                <div className="bg-red-900/40 border border-red-500/40 rounded px-3 py-2 text-red-300 text-sm font-mono">
                  {error}
                </div>
              </div>
            )}

            {!loading && !error && plots.length === 0 && (
              <div className="px-4 py-6 text-center">
                <div className="text-purple-400/60 text-sm font-mono mb-3">
                  KEINE AKTIVEN PLOTS
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onCreatePlotClick();
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-purple-900/40 border border-purple-500/40 hover:bg-purple-900/60 hover:border-purple-400/60 rounded text-sm font-mono text-purple-300 transition-all"
                >
                  <Plus size={14} />
                  NEUEN PLOT ERSTELLEN
                </button>
              </div>
            )}

            {!loading && !error && plots.length > 0 && (
              <div className="py-2">
                {/* None Option */}
                <button
                  onClick={() => handlePlotSelect(null)}
                  className={`w-full px-4 py-3 text-left hover:bg-purple-900/30 transition-all border-b border-purple-500/10 ${
                    !selectedPlotId ? 'bg-purple-900/40 border-purple-500/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded border border-purple-500/40" />
                    <div className="flex-1">
                      <div className="text-sm font-mono text-purple-200">KEIN PLOT</div>
                      <div className="text-xs text-purple-400/70 font-mono">
                        Öffentliche Nachricht senden
                      </div>
                    </div>
                  </div>
                </button>

                {/* Plot Options */}
                {plots.map(plot => (
                  <button
                    key={plot.id}
                    onClick={() => handlePlotSelect(plot.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-purple-900/30 transition-all border-b border-purple-500/10 last:border-b-0 ${
                      selectedPlotId === plot.id ? 'bg-purple-900/40 border-purple-500/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {selectedPlotId === plot.id ? (
                          <div className="w-2 h-2 rounded bg-purple-400" />
                        ) : (
                          <div className="w-2 h-2 rounded border border-purple-500/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="text-sm font-mono font-semibold text-purple-100 truncate">
                            {plot.title.toUpperCase()}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-purple-400/60 font-mono flex-shrink-0">
                            <Users size={10} />
                            <span>{plot.messageCount}</span>
                          </div>
                        </div>

                        {plot.description && (
                          <div className="text-xs text-purple-300/70 font-mono mb-2 line-clamp-2">
                            {plot.description}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-purple-400/60 font-mono">
                          <div className="flex items-center gap-2">
                            <span>{plot.creator.username}</span>
                            <span>•</span>
                            <span className="px-1 py-0.5 bg-purple-900/30 border border-purple-500/30 rounded text-purple-300">
                              {plot.creator.factionName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={10} />
                            <span>
                              {new Date(plot.updatedAt).toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}