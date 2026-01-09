import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Rocket, Trash2, Edit } from 'lucide-react';
import { BlueprintEditor } from '../components/shipyard';
import { blueprintApi } from '../lib/blueprintApi';
import {
  Blueprint,
  SHIP_CLASS_NAMES,
  SHIP_CLASS_COLORS,
} from '../types/blueprint';

export default function BlueprintEditorPage() {
  const navigate = useNavigate();
  const { planetId } = useParams();
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingBlueprint, setEditingBlueprint] = useState<Blueprint | null>(null);

  useEffect(() => {
    loadBlueprints();
  }, []);

  const loadBlueprints = async () => {
    try {
      const data = await blueprintApi.getBlueprints();
      setBlueprints(data);
    } catch (error) {
      console.error('Failed to load blueprints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (_blueprint: Blueprint) => {
    setShowEditor(false);
    setEditingBlueprint(null);
    loadBlueprints();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Blueprint wirklich loeschen?')) return;
    try {
      await blueprintApi.deleteBlueprint(id);
      loadBlueprints();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Fehler beim Loeschen');
    }
  };

  const handleEdit = (blueprint: Blueprint) => {
    setEditingBlueprint(blueprint);
    setShowEditor(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (showEditor) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => {
            setShowEditor(false);
            setEditingBlueprint(null);
          }}
          className="text-gray-400 hover:text-white inline-flex items-center gap-2"
        >
          <ArrowLeft size={20} />
          Zurueck zur Uebersicht
        </button>
        <BlueprintEditor
          initialBlueprint={editingBlueprint}
          onSave={handleSave}
          onCancel={() => {
            setShowEditor(false);
            setEditingBlueprint(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate(planetId ? `/planet/${planetId}` : '/')}
            className="text-gray-400 hover:text-white mb-4 inline-flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            Zurueck
          </button>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Rocket size={32} className="text-cyan-400" />
            Schiffs-Blueprints
          </h1>
          <p className="text-gray-400 mt-1">
            Erstelle und verwalte deine individuellen Schiffsentwuerfe
          </p>
        </div>
        <button
          onClick={() => setShowEditor(true)}
          className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-all"
        >
          <Plus size={20} />
          Neuer Blueprint
        </button>
      </div>

      {/* Blueprint List */}
      {blueprints.length === 0 ? (
        <div className="bg-gray-900/30 border border-dashed border-gray-700 rounded-xl p-12 text-center">
          <Rocket className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Keine Blueprints vorhanden</p>
          <p className="text-gray-600 text-sm mt-2">
            Erstelle deinen ersten Schiffsentwurf
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {blueprints.map((bp) => (
            <div
              key={bp.id}
              className={`bg-gradient-to-br ${
                SHIP_CLASS_COLORS[bp.shipClass]
              } rounded-xl border p-5 transition-all hover:scale-[1.02]`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-white font-bold text-lg">{bp.name}</h3>
                  <p className="text-gray-400 text-sm">
                    {SHIP_CLASS_NAMES[bp.shipClass]}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(bp)}
                    className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
                    title="Bearbeiten"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(bp.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Loeschen"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div className="bg-black/20 rounded p-2">
                  <span className="text-gray-500">Huelle</span>
                  <p className="text-white font-mono">{bp.stats.hullPoints}</p>
                </div>
                <div className="bg-black/20 rounded p-2">
                  <span className="text-gray-500">Schilde</span>
                  <p className="text-purple-400 font-mono">
                    {bp.stats.shieldStrength}
                  </p>
                </div>
                <div className="bg-black/20 rounded p-2">
                  <span className="text-gray-500">Schaden</span>
                  <p className="text-red-400 font-mono">{bp.stats.damage}</p>
                </div>
                <div className="bg-black/20 rounded p-2">
                  <span className="text-gray-500">Speed</span>
                  <p className="text-cyan-400 font-mono">{bp.stats.speed}</p>
                </div>
              </div>

              {/* Costs Summary */}
              <div className="text-xs text-gray-400 border-t border-gray-700/50 pt-3">
                <div className="flex justify-between">
                  <span>Kosten:</span>
                  <span className="text-yellow-400">
                    {bp.costs.credits.toLocaleString()} Credits
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Bauzeit:</span>
                  <span className="text-blue-400">{bp.costs.buildTimeMinutes}m</span>
                </div>
              </div>

              {/* Module Count */}
              <div className="mt-3 text-xs text-gray-500">
                {bp.modules.length} Module konfiguriert
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
