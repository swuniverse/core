import { useState, useEffect } from 'react';
import { X, FileText, Users, Search, Trash2, AlertCircle, Check, UserPlus } from 'lucide-react';
import api from '../lib/api';

interface PlayerSearchResult {
  id: number;
  username: string;
  factionName: string;
}

interface PlotCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlotCreated: (plot: any) => void;
}

export default function PlotCreationModal({
  isOpen,
  onClose,
  onPlotCreated
}: PlotCreationModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<PlayerSearchResult[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMemberSearch, setShowMemberSearch] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setMemberSearch('');
      setSearchResults([]);
      setSelectedMembers([]);
      setError(null);
      setShowMemberSearch(false);
    }
  }, [isOpen]);

  // Search for players with debounce
  useEffect(() => {
    if (memberSearch.length >= 2) {
      const timeout = setTimeout(() => {
        searchPlayers(memberSearch);
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      setSearchResults([]);
    }
  }, [memberSearch]);

  const searchPlayers = async (query: string) => {
    try {
      setSearchLoading(true);
      const response = await api.get(`/player/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data);
    } catch (err) {
      console.error('Player search failed:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const addMember = (player: PlayerSearchResult) => {
    if (!selectedMembers.find(m => m.id === player.id)) {
      setSelectedMembers([...selectedMembers, player]);
      setMemberSearch('');
      setSearchResults([]);
    }
  };

  const removeMember = (playerId: number) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== playerId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Titel ist erforderlich');
      return;
    }

    if (title.length > 100) {
      setError('Titel zu lang (max 100 Zeichen)');
      return;
    }

    if (description.length > 1000) {
      setError('Beschreibung zu lang (max 1000 Zeichen)');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        initialMembers: selectedMembers.map(m => m.username)
      };

      const response = await api.post('/holonet/plots', payload);
      onPlotCreated(response.data);
      onClose();
    } catch (err: any) {
      console.error('Plot creation failed:', err);
      setError(err.response?.data?.error || 'Fehler beim Erstellen des Plots');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-950/95 to-purple-950/80 border border-purple-500/40 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-500/30 bg-purple-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-900/40 border border-purple-500/40 rounded">
              <FileText size={18} className="text-purple-300" />
            </div>
            <h2 className="text-xl font-mono font-bold text-purple-100 tracking-wider">
              NEUEN RPG-PLOT ERSTELLEN
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-purple-400/70 hover:text-purple-300 hover:bg-purple-900/30 rounded transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-900/40 border border-red-500/40 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-red-300 text-sm font-mono">{error}</div>
            </div>
          )}

          {/* Plot Title */}
          <div className="space-y-3">
            <label className="block">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-mono font-semibold text-purple-100 tracking-wider">
                  PLOT-TITEL
                </span>
                <span className="text-xs text-red-400 font-mono">*</span>
                <span className="text-xs text-purple-400/60 font-mono">
                  ({title.length}/100)
                </span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Geben Sie den Titel des RPG-Plots ein..."
                className="w-full px-4 py-3 bg-slate-950/60 border border-purple-500/40 rounded text-purple-100 placeholder-purple-400/50 font-mono text-sm focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
                maxLength={100}
                required
              />
            </label>
          </div>

          {/* Plot Description */}
          <div className="space-y-3">
            <label className="block">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-mono font-semibold text-purple-100 tracking-wider">
                  BESCHREIBUNG
                </span>
                <span className="text-xs text-purple-400/60 font-mono">
                  ({description.length}/1000)
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optionale Beschreibung des Plot-Hintergrunds, der Storyline oder wichtiger Details..."
                className="w-full px-4 py-3 bg-slate-950/60 border border-purple-500/40 rounded text-purple-100 placeholder-purple-400/50 font-mono text-sm focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all resize-none"
                rows={4}
                maxLength={1000}
              />
            </label>
          </div>

          {/* Members Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-semibold text-purple-100 tracking-wider">
                  PLOT-MITGLIEDER
                </span>
                <span className="text-xs text-purple-400/60 font-mono">
                  (Optional)
                </span>
              </div>
              {!showMemberSearch && (
                <button
                  type="button"
                  onClick={() => setShowMemberSearch(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/40 border border-purple-500/40 hover:bg-purple-900/60 hover:border-purple-400/60 rounded text-xs font-mono text-purple-300 transition-all"
                >
                  <UserPlus size={12} />
                  MITGLIED HINZUFÜGEN
                </button>
              )}
            </div>

            {/* Selected Members */}
            {selectedMembers.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-purple-400/70 font-mono">AUSGEWÄHLTE MITGLIEDER:</div>
                <div className="space-y-2">
                  {selectedMembers.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-purple-950/30 border border-purple-500/30 rounded"
                    >
                      <div className="flex items-center gap-3">
                        <Users size={14} className="text-purple-400" />
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-purple-100">
                            {member.username}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-purple-900/40 border border-purple-500/40 rounded text-purple-300 font-mono">
                            {member.factionName}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMember(member.id)}
                        className="p-1.5 text-purple-400/70 hover:text-red-400 hover:bg-red-900/20 rounded transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Member Search */}
            {showMemberSearch && (
              <div className="space-y-3">
                <div className="relative">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-3 text-purple-400/60" />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Spielername eingeben..."
                      className="w-full pl-9 pr-4 py-3 bg-slate-950/60 border border-purple-500/40 rounded text-purple-100 placeholder-purple-400/50 font-mono text-sm focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
                    />
                  </div>

                  {/* Search Results */}
                  {memberSearch.length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-950/95 border border-purple-500/40 rounded backdrop-blur-md shadow-xl z-10 max-h-48 overflow-y-auto">
                      {searchLoading && (
                        <div className="p-4 text-center text-purple-400/70 text-sm font-mono">
                          SUCHE...
                        </div>
                      )}

                      {!searchLoading && searchResults.length === 0 && memberSearch.length >= 2 && (
                        <div className="p-4 text-center text-purple-400/60 text-sm font-mono">
                          KEINE SPIELER GEFUNDEN
                        </div>
                      )}

                      {!searchLoading && searchResults.length > 0 && (
                        <div className="py-2">
                          {searchResults.map(player => {
                            const isSelected = selectedMembers.find(m => m.id === player.id);
                            return (
                              <button
                                key={player.id}
                                type="button"
                                onClick={() => addMember(player)}
                                disabled={!!isSelected}
                                className={`w-full px-4 py-2 text-left hover:bg-purple-900/30 transition-all flex items-center gap-3 ${
                                  isSelected ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <Users size={12} className="text-purple-400" />
                                  <span className="text-sm font-mono text-purple-100">
                                    {player.username}
                                  </span>
                                  <span className="text-xs px-1.5 py-0.5 bg-purple-900/40 border border-purple-500/40 rounded text-purple-300 font-mono">
                                    {player.factionName}
                                  </span>
                                </div>
                                {isSelected && (
                                  <Check size={12} className="text-green-400" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowMemberSearch(false);
                    setMemberSearch('');
                    setSearchResults([]);
                  }}
                  className="text-xs text-purple-400/70 hover:text-purple-300 font-mono transition-all"
                >
                  SUCHE SCHLIESSEN
                </button>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-purple-500/30 bg-purple-900/10 flex items-center justify-between">
          <div className="text-xs text-purple-400/60 font-mono">
            PLOTS ERMÖGLICHEN PRIVATE RPG-KOMMUNIKATION
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-mono text-purple-400/70 hover:text-purple-300 transition-all"
            >
              ABBRECHEN
            </button>
            <button
              onClick={handleSubmit}
              disabled={isCreating || !title.trim()}
              className={`px-6 py-2 rounded text-sm font-mono font-semibold tracking-wider transition-all ${
                isCreating || !title.trim()
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white border border-purple-500/50'
              }`}
            >
              {isCreating ? 'ERSTELLE...' : 'PLOT ERSTELLEN'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}