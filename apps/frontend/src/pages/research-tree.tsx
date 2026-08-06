import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  MarkerType,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type EdgeProps,
  getBezierPath,
  BaseEdge,
  Position,
} from '@xyflow/react';
import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js';
import '@xyflow/react/dist/style.css';
import { api } from '../services/api';
import { TechDetailModal, type TechState } from './research';
import { useSocket } from '../hooks/use-socket';

type ResearchTreeNodeData = {
  tech: TechState;
  isHighlighted: boolean;
  onOpenDetails: () => void;
};
type ResearchTreeEdgeData = { points?: Array<{ x: number; y: number }> };

const NODE_WIDTH = 208;
const NODE_HEIGHT = 64;

const elk = new ELK();

const DEFAULT_EDGE_STYLE = { stroke: '#38bdf8', strokeWidth: 1.25 };
const HIGHLIGHT_EDGE_STYLE = { stroke: '#f59e0b', strokeWidth: 2.75 };
const HIGHLIGHT_NODE_RING = '0 0 0 2px #f59e0b';

function collectHighlightedPathIds(
  techs: TechState[],
  targetTechId: number,
): { nodeIds: Set<number>; edgeIds: Set<string> } {
  const techById = new Map(techs.map((tech) => [tech.id, tech]));
  const nodeIds = new Set<number>([targetTechId]);
  const edgeIds = new Set<string>();
  const visited = new Set<number>();

  const traverse = (currentId: number) => {
    if (visited.has(currentId)) return;
    visited.add(currentId);

    const tech = techById.get(currentId);
    if (!tech) return;

    for (const dependency of tech.dependencies) {
      if (dependency.type === 'EXCLUDE') continue;

      const candidateIds =
        dependency.type === 'REQUIRE'
          ? dependency.techIds
          : (() => {
              const preferred = dependency.techIds.find((depId) => {
                const depTech = techById.get(depId);
                return (
                  depTech &&
                  ['COMPLETED', 'IN_PROGRESS', 'QUEUED', 'AVAILABLE'].includes(
                    depTech.status,
                  )
                );
              });
              if (preferred !== undefined) return [preferred];

              const fallback = dependency.techIds.find((depId) =>
                techById.has(depId),
              );
              return fallback !== undefined ? [fallback] : [];
            })();

      for (const depId of candidateIds) {
        if (!techById.has(depId)) continue;
        nodeIds.add(depId);
        edgeIds.add(`e-${depId}-${currentId}`);
        traverse(depId);
      }
    }
  };

  traverse(targetTechId);

  return { nodeIds, edgeIds };
}

async function getLayoutedElements(
  techs: TechState[],
  focusedTechId: number | null,
  openTechDetail: (techId: number) => void,
): Promise<{
  nodes: Node<ResearchTreeNodeData>[];
  edges: Edge<ResearchTreeEdgeData>[];
}> {
  const techMap = new Map<number, TechState>();
  for (const t of techs) {
    if (!techMap.has(t.id)) techMap.set(t.id, t);
  }

  const dedupedTechs = [...techMap.values()];

  const edgeSet = new Set<string>();
  const edges: Edge<ResearchTreeEdgeData>[] = [];
  for (const tech of dedupedTechs) {
    for (const dep of tech.dependencies) {
      if (dep.type === 'EXCLUDE') continue;
      for (const depId of dep.techIds) {
        const edgeId = `e-${depId}-${tech.id}`;
        if (techMap.has(depId) && !edgeSet.has(edgeId)) {
          edgeSet.add(edgeId);
          edges.push({
            id: edgeId,
            source: String(depId),
            target: String(tech.id),
            type: 'routed',
            style: DEFAULT_EDGE_STYLE,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#38bdf8',
              width: 12,
              height: 12,
            },
          });
        }
      }
    }
  }

  const { nodeIds: highlightedNodeIds, edgeIds: highlightedEdgeIds } =
    focusedTechId
      ? collectHighlightedPathIds(dedupedTechs, focusedTechId)
      : { nodeIds: new Set<number>(), edgeIds: new Set<string>() };

  const elkGraph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.portConstraints': 'FIXED_SIDE',
      'elk.spacing.nodeNode': '72',
      'elk.layered.spacing.nodeNodeBetweenLayers': '140',
      'elk.layered.spacing.edgeNodeBetweenLayers': '50',
      'elk.layered.spacing.edgeEdgeBetweenLayers': '32',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    },
    children: dedupedTechs
      .slice()
      .sort((a, b) => {
        const sortDelta = (a.sort ?? 0) - (b.sort ?? 0);
        if (sortDelta !== 0) return sortDelta;
        return a.id - b.id;
      })
      .map((t) => ({
        id: String(t.id),
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      })),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  const laid = await elk.layout(elkGraph);
  const routePointsByEdgeId = new Map(
    (
      (laid.edges ?? []) as Array<{
        id: string;
        sections?: Array<{
          startPoint?: { x: number; y: number };
          bendPoints?: Array<{ x: number; y: number }>;
          endPoint?: { x: number; y: number };
        }>;
      }>
    ).flatMap((edge) => {
      const section = edge.sections?.[0];
      if (!section?.startPoint || !section.endPoint) return [];
      const points: Array<{ x: number; y: number }> = [
        section.startPoint,
        ...(section.bendPoints ?? []),
        section.endPoint,
      ];
      return [[edge.id, points] as const];
    }),
  );

  const nodes: Node<ResearchTreeNodeData>[] = (laid.children ?? []).map(
    (elkNode: ElkNode) => {
      const tech = techMap.get(Number(elkNode.id));
      if (!tech) {
        throw new Error(`Missing tech for node ${elkNode.id}`);
      }
      return {
        id: elkNode.id,
        position: { x: elkNode.x!, y: elkNode.y! },
        data: {
          tech,
          isHighlighted: highlightedNodeIds.has(tech.id),
          onOpenDetails: () => openTechDetail(tech.id),
        },
        type: 'techNode',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      };
    },
  );

  const styledEdges = edges.map((edge) => {
    const isHighlighted = highlightedEdgeIds.has(edge.id);
    return {
      ...edge,
      data: { points: routePointsByEdgeId.get(edge.id) },
      style: isHighlighted ? HIGHLIGHT_EDGE_STYLE : DEFAULT_EDGE_STYLE,
      animated: isHighlighted,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isHighlighted ? '#f59e0b' : '#38bdf8',
        width: 12,
        height: 12,
      },
    };
  });

  return { nodes, edges: styledEdges };
}

const STATUS_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  COMPLETED: { bg: '#4fc3f7', border: '#4fc3f7', text: '#0d121c' },
  IN_PROGRESS: { bg: '#c2b942', border: '#c2b942', text: '#0d121c' },
  QUEUED: { bg: '#c2b942', border: '#c2b94280', text: '#0d121c' },
  AVAILABLE: { bg: '#8897cf', border: '#8897cf', text: '#0d121c' },
  LOCKED: { bg: '#1a1a2e', border: '#0f3460', text: '#aaaaaa' },
};

function TechNodeComponent({ data }: { data: ResearchTreeNodeData }) {
  const { tech } = data;
  const colors = STATUS_COLORS[tech.status] ?? STATUS_COLORS.LOCKED;

  return (
    <div
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        background: colors.bg + (data.isHighlighted ? '35' : '20'),
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
        boxShadow: data.isHighlighted ? HIGHLIGHT_NODE_RING : undefined,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ visibility: 'hidden' }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: colors.text === '#0d121c' ? colors.border : colors.text,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
          }}
        >
          {tech.name}
        </div>
        <button
          type="button"
          data-no-tree-focus="true"
          title={`${tech.name} Details anzeigen`}
          aria-label={`${tech.name} Details anzeigen`}
          style={{
            width: 18,
            height: 18,
            minWidth: 18,
            border: 'none',
            background: 'transparent',
            color: colors.text === '#0d121c' ? colors.border : colors.text,
            fontSize: 13,
            fontWeight: 400,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            opacity: 0.85,
          }}
          onClick={(event) => {
            event.stopPropagation();
            data.onOpenDetails();
          }}
        >
          ⓘ
        </button>
      </div>
      <div style={{ fontSize: 10, color: '#aaaaaa', marginTop: 2 }}>
        {tech.status === 'COMPLETED' ? '✓' : `${tech.pointsRequired} FP`}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ visibility: 'hidden' }}
      />
    </div>
  );
}

function RoutedEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
}: EdgeProps<Edge<ResearchTreeEdgeData>>) {
  const points = data?.points;
  const path =
    points && points.length >= 2
      ? points
          .map(
            (point, index) =>
              `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`,
          )
          .join(' ')
      : getBezierPath({
          sourceX,
          sourceY,
          sourcePosition,
          targetX,
          targetY,
          targetPosition,
        })[0];

  return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />;
}

const nodeTypes: NodeTypes = { techNode: TechNodeComponent };
const edgeTypes: EdgeTypes = { routed: RoutedEdgeComponent };

export function ResearchTreePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [techs, setTechs] = useState<TechState[]>([]);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<Node<ResearchTreeNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedTech, setSelectedTech] = useState<TechState | null>(null);
  const navigate = useNavigate();
  const focusTechId =
    Number(searchParams.get('focus')) ||
    Number(searchParams.get('highlight')) ||
    null;

  const loadTechs = useCallback(async () => {
    const data = await api.get<TechState[]>('/research');
    setTechs(data);
  }, []);

  useEffect(() => {
    void loadTechs();
  }, [loadTechs]);

  useSocket('TICK', () => {
    void loadTechs();
  });

  const highlightTech = useCallback(
    (techId: number) => {
      setSearchParams({ highlight: String(techId) });
    },
    [setSearchParams],
  );

  const openTechDetail = useCallback(
    (techId: number) => {
      setSearchParams({ highlight: String(techId), focus: String(techId) });
    },
    [setSearchParams],
  );

  const closeTechDetail = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const clearHighlight = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  useEffect(() => {
    if (techs.length === 0) return;
    let cancelled = false;
    getLayoutedElements(techs, focusTechId, openTechDetail).then((result) => {
      if (!cancelled) {
        setNodes(result.nodes);
        setEdges(result.edges);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [techs, focusTechId, openTechDetail]);

  useEffect(() => {
    const focusedModalTechId = Number(searchParams.get('focus')) || null;
    if (!focusedModalTechId) {
      setSelectedTech(null);
      return;
    }
    if (techs.length === 0) return;
    const tech = techs.find((entry) => entry.id === focusedModalTechId) ?? null;
    setSelectedTech(tech);
  }, [searchParams, techs]);

  const startResearch = async (techId: number) => {
    await api.post('/research/start', { techId });
    closeTechDetail();
    await loadTechs();
  };

  const queueTarget = async (targetTechId: number) => {
    await api.post('/research/queue-target', { targetTechId });
    closeTechDetail();
    await loadTechs();
  };

  if (loading) {
    return (
      <div className="p-4 text-swu-muted text-xs">
        Tech-Tree wird geladen...
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] w-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-swu-border">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-bold text-swu-primary"
            style={{ fontFamily: 'var(--font-swu-display)' }}
          >
            Forschungsbaum
          </span>
          <span className="text-[10px] text-swu-muted font-mono">
            {techs.length} Technologien
          </span>
        </div>
        <button
          onClick={() => navigate('/research')}
          className="px-2 py-1 text-[10px] font-bold border border-swu-border text-swu-muted rounded hover:text-swu-text transition-colors"
        >
          Listenansicht
        </button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={(_, node) => highlightTech(Number(node.id))}
        onPaneClick={clearHighlight}
        fitView
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#0f3460" gap={20} size={1} />
        <Controls
          position="bottom-right"
          style={{ background: '#1a1a2e', border: '1px solid #0f3460' }}
        />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data;
            if (data && typeof data === 'object' && 'tech' in data) {
              const tech = data.tech;
              if (tech && typeof tech === 'object' && 'status' in tech) {
                return STATUS_COLORS[String(tech.status)]?.border ?? '#0f3460';
              }
            }
            return '#0f3460';
          }}
          style={{ background: '#0d121c', border: '1px solid #0f3460' }}
        />
      </ReactFlow>
      {selectedTech && (
        <TechDetailModal
          tech={selectedTech}
          techs={techs}
          activeResearch={
            techs.find((tech) => tech.status === 'IN_PROGRESS') ?? null
          }
          queuedCount={techs.filter((tech) => tech.status === 'QUEUED').length}
          onStart={() => startResearch(selectedTech.id)}
          onQueueTarget={() => queueTarget(selectedTech.id)}
          onSelect={(tech) => openTechDetail(tech.id)}
          onClose={closeTechDetail}
        />
      )}
    </div>
  );
}
