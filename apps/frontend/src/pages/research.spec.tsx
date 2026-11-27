import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { createElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import type { UserProfile } from '@swuniverse/shared';
import type { EdgeTypes, Node, NodeTypes } from '@xyflow/react';
import type { ReactNode } from 'react';

import { ResearchPage } from './research';
import { ResearchTreePage } from './research-tree';
import { useAuthStore } from '../stores/auth.store';
const socketHandlers = vi.hoisted(
  () => new Map<string, Array<(payload: unknown) => void>>(),
);

const techs = [
  {
    id: 211200,
    name: 'Fusionskern Mathematik',
    description: 'Legt die theoretische Basis fuer stabile Reaktorkerne.',
    category: 'energy',
    tier: 1,
    duration: 45,
    finishesAt: null,
    completedAt: '2026-10-22T12:34:56.000Z',
    dependencies: [],
    unlocks: {
      shipClasses: [{ id: 701, name: 'A-Wing Aufklärer' }],
      modules: [{ name: 'Militär-Scanner', commodityId: 9901 }],
    },
    status: 'COMPLETED',
    progress: 90,
    pointsRequired: 90,
    commodity: null,
  },
  {
    id: 211300,
    name: 'Hyperantrieb Konzepte',
    description: 'Verbindet Reaktorwissen mit fruehen Hyperraum-Modellen.',
    category: 'propulsion',
    tier: 1,
    duration: 60,
    finishesAt: null,
    dependencies: [{ type: 'REQUIRE', techIds: [211200] }],
    unlocks: {},
    status: 'AVAILABLE',
    progress: 0,
    pointsRequired: 100,
    commodity: null,
  },
  {
    id: 211301,
    name: 'Hyperantrieb Theorie',
    description: 'Ermoeglicht schnellere Spruenge durch den Hyperraum.',
    category: 'propulsion',
    tier: 1,
    duration: 60,
    finishesAt: null,
    dependencies: [{ type: 'REQUIRE', techIds: [211300] }],
    unlocks: {},
    status: 'AVAILABLE',
    progress: 0,
    pointsRequired: 120,
    commodity: null,
  },
  {
    id: 211302,
    name: 'Deflektorschild Gitter',
    description: 'Verbessert die Schilde aller Schiffe.',
    category: 'defense',
    tier: 1,
    duration: 60,
    finishesAt: null,
    dependencies: [{ type: 'REQUIRE_SOME', techIds: [211200] }],
    unlocks: {},
    status: 'COMPLETED',
    progress: 120,
    pointsRequired: 120,
    commodity: null,
  },
] satisfies Array<Record<string, unknown>>;

const treeRelationshipTechs = [
  {
    ...techs[0],
    id: 101,
    name: 'Grundlagenforschung',
    dependencies: [],
  },
  {
    ...techs[1],
    id: 102,
    name: 'Erforderliche Folgeforschung',
    dependencies: [{ type: 'REQUIRE', techIds: [101] }],
  },
  {
    ...techs[2],
    id: 103,
    name: 'Alternative Folgeforschung',
    dependencies: [{ type: 'REQUIRE_SOME', techIds: [101, 102] }],
  },
  {
    ...techs[1],
    id: 104,
    name: 'Ausschließende Forschung',
    status: 'COMPLETED',
    dependencies: [{ type: 'EXCLUDE', techIds: [105] }],
  },
  {
    ...techs[2],
    id: 105,
    name: 'Ausgeschlossene Forschung',
    status: 'EXCLUDED',
    dependencies: [],
  },
] satisfies Array<Record<string, unknown>>;

const excludedAlternativePathTechs = [
  ...treeRelationshipTechs,
  {
    ...techs[1],
    id: 106,
    name: 'Forschung mit ausgeschlossener Alternative',
    dependencies: [{ type: 'REQUIRE_SOME', techIds: [105, 107] }],
  },
  {
    ...techs[1],
    id: 107,
    name: 'Nicht erforschte Alternative',
    status: 'LOCKED',
    dependencies: [],
  },
] satisfies Array<Record<string, unknown>>;

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

type MockTreeEdge = {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: {
    points?: Array<{ x: number; y: number }>;
    dependencyType?: string;
  };
  style?: {
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
  };
  animated?: boolean;
  markerEnd?: {
    type?: string;
    color?: string;
    width?: number;
    height?: number;
  };
};

const reactFlowMock = vi.hoisted(() => ({
  lastProps: null as {
    nodes: Node<{
      tech: { id: number; name: string; status?: string };
      isHighlighted: boolean;
      onOpenDetails: () => void;
    }>[];
    edges: MockTreeEdge[];
    onNodeClick?: (
      _event: unknown,
      node: Node<{
        tech: { id: number; name: string; status?: string };
        isHighlighted: boolean;
        onOpenDetails: () => void;
      }>,
    ) => void;
    onPaneClick?: () => void;
  } | null,
}));

vi.mock('../services/api', () => ({
  api: apiMocks,
}));

vi.mock('../hooks/use-socket', () => ({
  useSocket: (event?: string, handler?: (payload: unknown) => void) => {
    if (!event || !handler) return;
    const handlers = socketHandlers.get(event) ?? [];
    if (!handlers.includes(handler)) {
      handlers.push(handler);
      socketHandlers.set(event, handlers);
    }
  },
}));
vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return {
    ...actual,
    Background: () => null,
    Controls: () => null,
    MiniMap: () => null,
    ReactFlow: ({
      children,
      nodes,
      edges,
      nodeTypes,
      edgeTypes,
      onNodeClick,
      onPaneClick,
    }: {
      children?: ReactNode;
      nodes: Node<{
        tech: { id: number; name: string; status?: string };
        isHighlighted: boolean;
        onOpenDetails: () => void;
      }>[];
      edges: MockTreeEdge[];
      nodeTypes: NodeTypes;
      edgeTypes: EdgeTypes;
      onNodeClick?: (
        _event: unknown,
        node: Node<{
          tech: { id: number; name: string; status?: string };
          isHighlighted: boolean;
          onOpenDetails: () => void;
        }>,
      ) => void;
      onPaneClick?: () => void;
    }) => {
      reactFlowMock.lastProps = { nodes, edges, onNodeClick, onPaneClick };
      return (
        <div data-testid="react-flow-mock">
          {nodes.map((node) => (
            <div data-testid={`node-${node.id}`} key={node.id}>
              <button
                type="button"
                onClick={() => onNodeClick?.(undefined, node)}
              >
                {node.data.tech.name}
              </button>
              {createElement(nodeTypes[node.type ?? 'techNode'], {
                ...node,
                type: node.type ?? 'techNode',
                dragging: false,
                zIndex: 0,
                selectable: true,
                deletable: true,
                selected: false,
                draggable: false,
                isConnectable: true,
                positionAbsoluteX: node.position.x,
                positionAbsoluteY: node.position.y,
                data: node.data,
              })}
            </div>
          ))}
          <svg>
            {edges.map((edge) => (
              <g
                key={edge.id}
                data-testid={`edge-${edge.id}`}
                data-stroke={edge.style?.stroke}
                data-width={edge.style?.strokeWidth}
                data-dash={edge.style?.strokeDasharray}
                data-dependency-type={edge.data?.dependencyType}
                data-animated={String(edge.animated ?? false)}
                data-type={edge.type}
                data-points={edge.data?.points?.length ?? 0}
              >
                {createElement(edgeTypes[edge.type ?? 'routed'], {
                  id: edge.id,
                  source: edge.source,
                  target: edge.target,
                  type: edge.type ?? 'routed',
                  sourceX: 10,
                  sourceY: 20,
                  targetX: 30,
                  targetY: 40,
                  sourcePosition: actual.Position.Bottom,
                  targetPosition: actual.Position.Top,
                  markerEnd: edge.markerEnd
                    ? `url(#${edge.id}-marker)`
                    : undefined,
                  style: edge.style,
                  data: edge.data,
                })}
              </g>
            ))}
          </svg>
          <button
            type="button"
            aria-label="Freies Feld"
            onClick={() => onPaneClick?.()}
          >
            Freies Feld
          </button>
          {children}
        </div>
      );
    },
    Handle: () => null,
    getBezierPath: () => ['M 0 0 L 1 1'],
    MarkerType: actual.MarkerType,
    Position: actual.Position,
  };
});

vi.mock('elkjs/lib/elk.bundled.js', () => ({
  default: class {
    layout = vi.fn(
      async (graph: {
        children?: Array<{ id: string; width?: number; height?: number }>;
        edges?: Array<{ id: string; sources: string[]; targets: string[] }>;
      }) => {
        const childIds = (graph.children ?? []).map((child) => child.id);
        const incomingCount = new Map<string, number>(
          childIds.map((id) => [id, 0]),
        );
        for (const edge of graph.edges ?? []) {
          for (const target of edge.targets) {
            incomingCount.set(target, (incomingCount.get(target) ?? 0) + 1);
          }
        }

        const children = (graph.children ?? []).map((child, index) => ({
          ...child,
          x: index * 200,
          y: (incomingCount.get(child.id) ?? 0) * 140,
        }));
        const childById = new Map(children.map((child) => [child.id, child]));
        return {
          children,
          edges: (graph.edges ?? []).map((edge) => {
            const source = childById.get(edge.sources[0]);
            const target = childById.get(edge.targets[0]);
            return {
              ...edge,
              sections:
                source && target
                  ? [
                      {
                        startPoint: { x: source.x + 104, y: source.y + 64 },
                        bendPoints: [{ x: source.x + 104, y: target.y - 30 }],
                        endPoint: { x: target.x + 104, y: target.y },
                      },
                    ]
                  : [],
            };
          }),
        };
      },
    );
  },
}));

function LocationProbe() {
  const location = useLocation();

  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  );
}
function emitSocket(event: string, payload: unknown) {
  for (const handler of socketHandlers.get(event) ?? []) {
    handler(payload);
  }
}

const consolidatedTreeTechs = [
  {
    id: 290001,
    name: 'Waffenmodule Stufe I',
    description: 'Alle Module der Klasse 2',
    category: 'weapons',
    tier: 1,
    duration: 40,
    finishesAt: null,
    dependencies: [],
    unlocks: {},
    status: 'AVAILABLE',
    progress: 0,
    pointsRequired: 40,
    commodity: null,
  },
  {
    id: 290005,
    name: 'Schildmodule Stufe I',
    description: 'Alle Module der Klasse 2',
    category: 'defense',
    tier: 1,
    duration: 40,
    finishesAt: null,
    dependencies: [],
    unlocks: {},
    status: 'COMPLETED',
    progress: 40,
    pointsRequired: 40,
    commodity: null,
  },
  {
    id: 410001,
    name: 'Abgesetzter Forschungsknoten',
    description: 'Bewusst getrennte Kette fuer den Baumtest.',
    category: 'special',
    tier: 1,
    duration: 30,
    finishesAt: null,
    dependencies: [],
    unlocks: {},
    status: 'AVAILABLE',
    progress: 0,
    pointsRequired: 30,
    commodity: null,
  },
  {
    id: 410002,
    name: 'Abgesetzte Folgeforschung',
    description: 'Haengt nur am abgesetzten Forschungsknoten.',
    category: 'special',
    tier: 2,
    duration: 50,
    finishesAt: null,
    dependencies: [{ type: 'REQUIRE', techIds: [410001] }],
    unlocks: {},
    status: 'AVAILABLE',
    progress: 0,
    pointsRequired: 50,
    commodity: null,
  },
] satisfies Array<Record<string, unknown>>;

const anchoredModuleTreeTechs = [
  {
    id: 200101,
    name: 'Forschungszentrum Stufe I',
    description: 'Basisforschung.',
    category: 'research',
    tier: 1,
    duration: 12,
    finishesAt: null,
    dependencies: [],
    unlocks: {},
    status: 'COMPLETED',
    progress: 12,
    pointsRequired: 12,
    commodity: null,
  },
  {
    id: 200201,
    name: 'Forschungszentrum Stufe II',
    description: 'Weiterfuehrende Forschung.',
    category: 'research',
    tier: 2,
    duration: 20,
    finishesAt: null,
    dependencies: [{ type: 'REQUIRE', techIds: [200101] }],
    unlocks: {},
    status: 'AVAILABLE',
    progress: 0,
    pointsRequired: 20,
    commodity: null,
  },
  {
    id: 200301,
    name: 'Forschungszentrum Stufe III',
    description: 'Fortgeschrittene Forschung.',
    category: 'research',
    tier: 3,
    duration: 30,
    finishesAt: null,
    dependencies: [{ type: 'REQUIRE', techIds: [200201] }],
    unlocks: {},
    status: 'AVAILABLE',
    progress: 0,
    pointsRequired: 30,
    commodity: null,
  },
  {
    id: 200501,
    name: 'Modul-Forschungszentrum',
    description: 'Modulforschung.',
    category: 'research',
    tier: 4,
    duration: 60,
    finishesAt: null,
    dependencies: [{ type: 'REQUIRE', techIds: [200301] }],
    unlocks: {},
    status: 'AVAILABLE',
    progress: 0,
    pointsRequired: 60,
    commodity: null,
  },
  {
    id: 290001,
    name: 'Waffenmodule Stufe I',
    description: 'Alle Module der Klasse 2',
    category: 'weapons',
    tier: 1,
    duration: 40,
    finishesAt: null,
    dependencies: [{ type: 'REQUIRE', techIds: [200101] }],
    unlocks: {},
    status: 'AVAILABLE',
    progress: 0,
    pointsRequired: 40,
    commodity: null,
  },
  {
    id: 290002,
    name: 'Waffenmodule Stufe II',
    description: 'Alle Module der Klasse 3 und 4',
    category: 'weapons',
    tier: 2,
    duration: 80,
    finishesAt: null,
    dependencies: [{ type: 'REQUIRE', techIds: [200201, 290001] }],
    unlocks: {},
    status: 'AVAILABLE',
    progress: 0,
    pointsRequired: 80,
    commodity: null,
  },
  {
    id: 290003,
    name: 'Waffenmodule Stufe III',
    description: 'Alle Module der Klasse 5',
    category: 'weapons',
    tier: 3,
    duration: 120,
    finishesAt: null,
    dependencies: [{ type: 'REQUIRE', techIds: [200301, 290002] }],
    unlocks: {},
    status: 'AVAILABLE',
    progress: 0,
    pointsRequired: 120,
    commodity: null,
  },
  {
    id: 290004,
    name: 'Waffenmodule Stufe IV',
    description: 'Alle Module der Klasse 6',
    category: 'weapons',
    tier: 4,
    duration: 180,
    finishesAt: null,
    dependencies: [{ type: 'REQUIRE', techIds: [200501, 290003] }],
    unlocks: {},
    status: 'AVAILABLE',
    progress: 0,
    pointsRequired: 180,
    commodity: null,
  },
] satisfies Array<Record<string, unknown>>;

const imperialsModuleTreeTechs = [
  {
    id: 200103,
    name: 'Forschungszentrum Stufe I',
    description: 'Basisforschung.',
    category: 'research',
    tier: 1,
    duration: 12,
    finishesAt: null,
    dependencies: [],
    unlocks: {},
    status: 'COMPLETED',
    progress: 12,
    pointsRequired: 12,
    commodity: null,
  },
  {
    id: 200203,
    name: 'Forschungszentrum Stufe II',
    description: 'Weiterfuehrende Forschung.',
    category: 'research',
    tier: 2,
    duration: 20,
    finishesAt: null,
    dependencies: [{ type: 'REQUIRE', techIds: [200103] }],
    unlocks: {},
    status: 'AVAILABLE',
    progress: 0,
    pointsRequired: 20,
    commodity: null,
  },
  {
    id: 200303,
    name: 'Forschungszentrum Stufe III',
    description: 'Fortgeschrittene Forschung.',
    category: 'research',
    tier: 3,
    duration: 30,
    finishesAt: null,
    dependencies: [{ type: 'REQUIRE', techIds: [200203] }],
    unlocks: {},
    status: 'AVAILABLE',
    progress: 0,
    pointsRequired: 30,
    commodity: null,
  },
  {
    id: 200503,
    name: 'Modul-Forschungszentrum',
    description: 'Modulforschung.',
    category: 'research',
    tier: 4,
    duration: 60,
    finishesAt: null,
    dependencies: [{ type: 'REQUIRE', techIds: [200303] }],
    unlocks: {},
    status: 'AVAILABLE',
    progress: 0,
    pointsRequired: 60,
    commodity: null,
  },
  {
    id: 290001,
    name: 'Waffenmodule Stufe I',
    description: 'Alle Module der Klasse 2',
    category: 'weapons',
    tier: 1,
    duration: 40,
    finishesAt: null,
    dependencies: [{ type: 'REQUIRE', techIds: [200103] }],
    unlocks: {},
    status: 'AVAILABLE',
    progress: 0,
    pointsRequired: 40,
    commodity: null,
  },
  {
    id: 290002,
    name: 'Waffenmodule Stufe II',
    description: 'Alle Module der Klasse 3 und 4',
    category: 'weapons',
    tier: 2,
    duration: 80,
    finishesAt: null,
    dependencies: [{ type: 'REQUIRE', techIds: [200203, 290001] }],
    unlocks: {},
    status: 'AVAILABLE',
    progress: 0,
    pointsRequired: 80,
    commodity: null,
  },
  {
    id: 290003,
    name: 'Waffenmodule Stufe III',
    description: 'Alle Module der Klasse 5',
    category: 'weapons',
    tier: 3,
    duration: 120,
    finishesAt: null,
    dependencies: [{ type: 'REQUIRE', techIds: [200303, 290002] }],
    unlocks: {},
    status: 'AVAILABLE',
    progress: 0,
    pointsRequired: 120,
    commodity: null,
  },
  {
    id: 290004,
    name: 'Waffenmodule Stufe IV',
    description: 'Alle Module der Klasse 6',
    category: 'weapons',
    tier: 4,
    duration: 180,
    finishesAt: null,
    dependencies: [{ type: 'REQUIRE', techIds: [200503, 290003] }],
    unlocks: {},
    status: 'AVAILABLE',
    progress: 0,
    pointsRequired: 180,
    commodity: null,
  },
  {
    id: 60100,
    name: 'Tarnfeld-Generator',
    description: 'Spezialmodul fuer Tarnung.',
    category: 'special',
    tier: 4,
    duration: 50,
    finishesAt: null,
    dependencies: [{ type: 'REQUIRE', techIds: [200503] }],
    unlocks: {},
    status: 'AVAILABLE',
    progress: 0,
    pointsRequired: 50,
    commodity: null,
  },
] satisfies Array<Record<string, unknown>>;

describe('ResearchPage routing', () => {
  beforeEach(() => {
    socketHandlers.clear();
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    apiMocks.delete.mockReset();
    apiMocks.get.mockResolvedValue(techs);
    reactFlowMock.lastProps = null;
    useAuthStore.setState({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { isAdmin: false } as UserProfile,
    });
  });

  it('shows research images, completion date, alternative follow-ups, hulls, and modules', async () => {
    const techsWithAlternativeFollowUp = [
      ...techs,
      {
        id: 211400,
        name: 'Alternative Reaktortheorie',
        description: 'Kann auf mehreren Grundlagen aufbauen.',
        category: 'energy',
        tier: 2,
        duration: 80,
        finishesAt: null,
        dependencies: [{ type: 'REQUIRE_SOME', techIds: [211200, 211302] }],
        unlocks: {},
        status: 'AVAILABLE',
        progress: 0,
        pointsRequired: 140,
        commodity: null,
      },
    ];
    apiMocks.get.mockResolvedValue(techsWithAlternativeFollowUp);

    render(
      <MemoryRouter initialEntries={['/research?focus=211200']}>
        <Routes>
          <Route path="/research" element={<ResearchPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      (await screen.findByAltText('Fusionskern Mathematik')).getAttribute(
        'src',
      ),
    ).toBe('/assets/research/211200.png');
    expect(
      screen.getAllByText(/Erforscht am 22\.10\.2026/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Alternative Reaktortheorie').length,
    ).toBeGreaterThan(0);
    expect(
      await screen.findByRole('button', {
        name: /Alternative Reaktortheorie.*eine von/,
      }),
    ).toBeTruthy();
    expect(screen.getByText('A-Wing Aufklärer')).toBeTruthy();
    expect(screen.getByText('Militär-Scanner')).toBeTruthy();
    expect(screen.getByAltText('A-Wing Aufklärer').getAttribute('src')).toBe(
      '/assets/ships/701.png',
    );
    expect(
      screen.getByAltText('Militär-Scanner').getAttribute('src'),
    ).toContain('9901');
  });

  it('shows the data-driven colony limit increase in the research detail modal', async () => {
    apiMocks.get.mockResolvedValue([
      {
        ...techs[1],
        id: 101101,
        name: 'Feindliche Planeten',
        colonyLimit: { type: 'planet', amount: 2 },
      },
      ...techs.slice(2),
    ]);

    render(
      <MemoryRouter initialEntries={['/research?focus=101101']}>
        <Routes>
          <Route path="/research" element={<ResearchPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Kolonielimit: +2 Planeten')).toBeTruthy();
    expect(screen.getByAltText('Planet').getAttribute('src')).toBe(
      '/assets/planets/201s.png',
    );
  });

  it('shows the award image and name in the research detail modal', async () => {
    apiMocks.get.mockResolvedValue([
      {
        ...techs[0],
        award: {
          key: 'RESEARCH_STATIONS',
          name: 'Stationsforschung abgeschlossen',
          image: '/favicon.ico',
        },
      },
      ...techs.slice(1),
    ]);

    render(
      <MemoryRouter initialEntries={['/research?focus=211200']}>
        <Routes>
          <Route path="/research" element={<ResearchPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Auszeichnung: Stationsforschung abgeschlossen'),
    ).toBeTruthy();
    expect(
      screen
        .getByAltText('Stationsforschung abgeschlossen')
        .getAttribute('src'),
    ).toBe('/favicon.ico');
  });

  it('shows the ship reward only when the research has a mapping', async () => {
    apiMocks.get.mockResolvedValue([
      {
        ...techs[0],
        shipReward: {
          shipClassKey: 'REBEL_FIGHTER_A_WING',
          name: 'A-Wing Abfangjäger',
        },
      },
      ...techs.slice(1),
    ]);
    const view = render(
      <MemoryRouter initialEntries={['/research?focus=211200']}>
        <Routes>
          <Route path="/research" element={<ResearchPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      await screen.findByText('Belohnung: A-Wing Abfangjäger'),
    ).toBeTruthy();
    view.unmount();

    apiMocks.get.mockResolvedValue(techs);
    render(
      <MemoryRouter initialEntries={['/research?focus=211200']}>
        <Routes>
          <Route path="/research" element={<ResearchPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByAltText('Fusionskern Mathematik');
    expect(screen.queryByText(/Belohnung:/)).toBeNull();
  });

  it('replaces a missing research image with an accessible fallback', async () => {
    render(
      <MemoryRouter initialEntries={['/research']}>
        <Routes>
          <Route path="/research" element={<ResearchPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const image = await screen.findByAltText('Hyperantrieb Konzepte');
    fireEvent.error(image);

    expect(screen.getByLabelText('Kein Forschungsbild verfügbar')).toBeTruthy();
  });

  it('opens the focused tech modal from the URL and closes back to the research overview', async () => {
    render(
      <MemoryRouter initialEntries={['/research?focus=211301']}>
        <Routes>
          <Route
            path="/research"
            element={
              <>
                <LocationProbe />
                <ResearchPage />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    const modalTitle = await screen.findByText(
      'Forschung: Hyperantrieb Theorie',
    );
    expect(modalTitle).toBeTruthy();
    expect(
      screen.getAllByText(
        'Ermoeglicht schnellere Spruenge durch den Hyperraum.',
      ),
    ).toHaveLength(2);
    expect(screen.getByTestId('location').textContent).toBe(
      '/research?focus=211301',
    );
    expect(screen.getByText('Verfuegbare Forschungen')).toBeTruthy();
    expect(screen.getByText('Deflektorschild Gitter')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '✕' }));

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/research');
    });
    expect(
      screen.getByTestId('location').textContent?.includes('?focus=211301'),
    ).toBe(false);
    expect(screen.queryByText('Forschung: Hyperantrieb Theorie')).toBeNull();
    expect(screen.getByText('Verfuegbare Forschungen')).toBeTruthy();
    expect(screen.getByText('Hyperantrieb Theorie')).toBeTruthy();
    expect(screen.getByText('Deflektorschild Gitter')).toBeTruthy();
  });

  it('opens and closes the detail modal from tree view without leaving /research/tree', async () => {
    render(
      <MemoryRouter initialEntries={['/research/tree']}>
        <Routes>
          <Route
            path="/research/tree"
            element={
              <>
                <LocationProbe />
                <ResearchTreePage />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Forschungsbaum');
    const treeNodeButton = await screen.findByRole('button', {
      name: 'Hyperantrieb Theorie',
    });
    const infoButton = await screen.findByRole('button', {
      name: 'Hyperantrieb Theorie Details anzeigen',
    });
    expect(screen.getByTestId('location').textContent).toBe('/research/tree');
    expect(
      screen.getByTestId('edge-e-211300-211301').getAttribute('data-stroke'),
    ).toBe('#38bdf8');
    expect(
      screen.getByTestId('edge-e-211300-211301').getAttribute('data-width'),
    ).toBe('1.5');
    expect(
      screen.getByTestId('edge-e-211300-211301').getAttribute('data-animated'),
    ).toBe('false');
    expect(
      screen.getByTestId('edge-e-211200-211300').getAttribute('data-stroke'),
    ).toBe('#38bdf8');
    expect(
      screen.getByTestId('edge-e-211200-211300').getAttribute('data-width'),
    ).toBe('1.5');
    expect(
      screen.getByTestId('edge-e-211200-211300').getAttribute('data-animated'),
    ).toBe('false');
    expect(
      screen.getByTestId('edge-e-211200-211302').getAttribute('data-stroke'),
    ).toBe('#a78bfa');
    expect(
      screen.getByTestId('edge-e-211200-211302').getAttribute('data-animated'),
    ).toBe('false');

    fireEvent.click(treeNodeButton);

    await waitFor(() => {
      const highlightedEdge = screen.getByTestId('edge-e-211300-211301');
      expect(highlightedEdge.getAttribute('data-width')).toBe('2.75');
      expect(highlightedEdge.getAttribute('data-animated')).toBe('true');
    });
    expect(screen.getByTestId('location').textContent).toBe(
      '/research/tree?highlight=211301',
    );
    expect(screen.queryByText('Forschung: Hyperantrieb Theorie')).toBeNull();

    fireEvent.click(infoButton);

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe(
        '/research/tree?highlight=211301&focus=211301',
      );
    });
    expect(screen.getByText('Forschung: Hyperantrieb Theorie')).toBeTruthy();
    expect(
      screen.getByText('Ermoeglicht schnellere Spruenge durch den Hyperraum.'),
    ).toBeTruthy();
    expect(
      screen.getByTestId('edge-e-211300-211301').getAttribute('data-stroke'),
    ).toBe('#38bdf8');
    expect(
      screen.getByTestId('edge-e-211300-211301').getAttribute('data-width'),
    ).toBe('2.75');
    expect(
      screen.getByTestId('edge-e-211300-211301').getAttribute('data-animated'),
    ).toBe('true');
    expect(
      screen.getByTestId('edge-e-211200-211300').getAttribute('data-stroke'),
    ).toBe('#38bdf8');
    expect(
      screen.getByTestId('edge-e-211200-211300').getAttribute('data-width'),
    ).toBe('2.75');
    expect(
      screen.getByTestId('edge-e-211200-211300').getAttribute('data-animated'),
    ).toBe('true');
    expect(
      screen.getByTestId('edge-e-211200-211302').getAttribute('data-stroke'),
    ).toBe('#a78bfa');
    expect(
      screen.getByTestId('edge-e-211200-211302').getAttribute('data-animated'),
    ).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: '✕' }));

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/research/tree');
    });
    expect(screen.queryByText('Forschung: Hyperantrieb Theorie')).toBeNull();
    expect(
      screen.getByTestId('location').textContent?.includes('?focus='),
    ).toBe(false);
    // Edge styles come from the asynchronous ELK layout, which lags the URL.
    await waitFor(() => {
      expect(
        screen.getByTestId('edge-e-211300-211301').getAttribute('data-width'),
      ).toBe('1.5');
      expect(
        screen.getByTestId('edge-e-211200-211300').getAttribute('data-width'),
      ).toBe('1.5');
    });
    expect(
      screen.getByTestId('edge-e-211300-211301').getAttribute('data-stroke'),
    ).toBe('#38bdf8');
    expect(
      screen.getByTestId('edge-e-211300-211301').getAttribute('data-animated'),
    ).toBe('false');
    expect(
      screen.getByTestId('edge-e-211200-211300').getAttribute('data-stroke'),
    ).toBe('#38bdf8');
    expect(
      screen.getByTestId('edge-e-211200-211300').getAttribute('data-animated'),
    ).toBe('false');

    fireEvent.click(treeNodeButton);

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe(
        '/research/tree?highlight=211301',
      );
    });
    fireEvent.click(screen.getByRole('button', { name: 'Freies Feld' }));

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/research/tree');
      expect(
        screen.getByTestId('edge-e-211300-211301').getAttribute('data-animated'),
      ).toBe('false');
      expect(
        screen.getByTestId('edge-e-211200-211300').getAttribute('data-animated'),
      ).toBe('false');
    });
    expect(
      screen.getByTestId('edge-e-211300-211301').getAttribute('data-stroke'),
    ).toBe('#38bdf8');
    expect(
      screen.getByTestId('edge-e-211200-211300').getAttribute('data-stroke'),
    ).toBe('#38bdf8');
    expect(screen.getByText('Forschungsbaum')).toBeTruthy();
  });

  it('renders each research relationship and excluded technology distinctly', async () => {
    apiMocks.get.mockResolvedValueOnce(treeRelationshipTechs);

    const { container } = render(
      <MemoryRouter initialEntries={['/research/tree']}>
        <Routes>
          <Route path="/research/tree" element={<ResearchTreePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Forschungsbaum');
    expect(apiMocks.get).toHaveBeenCalledWith('/research/tree');

    const requirePath =
      container.querySelector<SVGPathElement>('path#e-101-102');
    const requireSomePath =
      container.querySelector<SVGPathElement>('path#e-101-103');
    const excludePath =
      container.querySelector<SVGPathElement>('path#ex-104-105');
    expect(requirePath).toBeTruthy();
    expect(requirePath?.style.stroke).toBe('#38bdf8');
    expect(requirePath?.style.strokeWidth).toBe('1.5');
    expect(requirePath?.getAttribute('d')).toBe('M 104 64 L 104 110 L 304 140');
    expect(requirePath?.getAttribute('marker-end')).toBe(
      'url(#e-101-102-marker)',
    );
    expect(requireSomePath?.style.stroke).toBe('#a78bfa');
    expect(requireSomePath?.style.strokeDasharray).toBe('6 4');
    expect(excludePath?.style.stroke).toBe('#ef4444');
    expect(excludePath?.style.strokeDasharray).toBe('2 4');
    expect(excludePath?.getAttribute('marker-end')).toBe(
      'url(#ex-104-105-marker)',
    );
    expect(
      within(screen.getByTestId('node-105')).getByText('AUSGESCHLOSSEN'),
    ).toBeTruthy();

    expect(
      screen.getByTestId('edge-e-101-102').getAttribute('data-stroke'),
    ).toBe('#38bdf8');
    expect(
      screen.getByTestId('edge-e-101-103').getAttribute('data-stroke'),
    ).not.toBe('#38bdf8');
    expect(
      screen.getByTestId('edge-e-101-102').getAttribute('data-dependency-type'),
    ).toBe('REQUIRE');
    expect(
      screen.getByTestId('edge-e-101-103').getAttribute('data-dependency-type'),
    ).toBe('REQUIRE_SOME');
    expect(screen.getByTestId('edge-ex-104-105')).toBeTruthy();
    expect(
      screen.getByTestId('edge-ex-104-105').getAttribute('data-stroke'),
    ).toBe('#ef4444');
    expect(
      screen
        .getByTestId('edge-ex-104-105')
        .getAttribute('data-dependency-type'),
    ).toBe('EXCLUDE');
    expect(
      screen.getByTestId('edge-ex-104-105').getAttribute('data-dash'),
    ).toBeTruthy();
    expect(
      screen.getByTestId('edge-e-101-103').getAttribute('data-dash'),
    ).toBeTruthy();
    expect(screen.getAllByText('AUSGESCHLOSSEN').length).toBeGreaterThan(0);
    expect(screen.getByText('REQUIRE')).toBeTruthy();
    expect(screen.getByText('REQUIRE_SOME')).toBeTruthy();
    expect(screen.getByText('EXCLUDE')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Ausgeschlossene Forschung' }),
    ).toBeTruthy();
  });

  it('does not highlight an excluded REQUIRE_SOME fallback alternative', async () => {
    apiMocks.get.mockResolvedValueOnce(excludedAlternativePathTechs);

    render(
      <MemoryRouter initialEntries={['/research/tree?focus=106']}>
        <Routes>
          <Route path="/research/tree" element={<ResearchTreePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId('edge-e-107-106').getAttribute('data-animated'),
      ).toBe('true');
    });
    expect(
      screen.getByTestId('edge-e-105-106').getAttribute('data-animated'),
    ).toBe('false');
  });

  it('renders consolidated modules and disconnected chains in tree and list views', async () => {
    apiMocks.get.mockResolvedValue(consolidatedTreeTechs);

    render(
      <MemoryRouter initialEntries={['/research/tree']}>
        <Routes>
          <Route path="/research/tree" element={<ResearchTreePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Forschungsbaum');
    expect(
      await screen.findByRole('button', { name: 'Waffenmodule Stufe I' }),
    ).toBeTruthy();
    expect(
      await screen.findByRole('button', { name: 'Abgesetzte Folgeforschung' }),
    ).toBeTruthy();

    render(
      <MemoryRouter initialEntries={['/research']}>
        <Routes>
          <Route path="/research" element={<ResearchPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Verfuegbare Forschungen');
    expect(screen.getAllByText('Waffenmodule Stufe I').length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText('Schildmodule Stufe I').length).toBeGreaterThan(
      0,
    );
  });

  it('refreshes research progress on TICK without changing focus query', async () => {
    apiMocks.get.mockResolvedValueOnce(techs).mockResolvedValueOnce([
      techs[0],
      techs[1],
      {
        ...techs[2],
        status: 'IN_PROGRESS',
        progress: 30,
        pointsRequired: 120,
      },
      techs[3],
    ]);

    render(
      <MemoryRouter initialEntries={['/research?focus=211301']}>
        <Routes>
          <Route
            path="/research"
            element={
              <>
                <LocationProbe />
                <ResearchPage />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Forschung: Hyperantrieb Theorie'),
    ).toBeTruthy();

    emitSocket('TICK', { tick: 9 });

    await waitFor(() => {
      expect(apiMocks.get.mock.calls.length).toBeGreaterThan(1);
    });
    expect(screen.getByTestId('location').textContent).toBe(
      '/research?focus=211301',
    );
  });

  it('refreshes research after completion event', async () => {
    apiMocks.get.mockResolvedValue(techs);

    render(
      <MemoryRouter initialEntries={['/research']}>
        <Routes>
          <Route path="/research" element={<ResearchPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Verfuegbare Forschungen');
    const callsBeforeUpdate = apiMocks.get.mock.calls.length;
    emitSocket('RESEARCH_COMPLETED', {
      techId: 211301,
      name: 'Hyperantrieb Theorie',
    });

    await waitFor(() => {
      expect(apiMocks.get.mock.calls.length).toBeGreaterThan(callsBeforeUpdate);
    });
  });

  it('refreshes research after a colony update', async () => {
    apiMocks.get.mockResolvedValue(techs);

    render(
      <MemoryRouter initialEntries={['/research']}>
        <Routes>
          <Route path="/research" element={<ResearchPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Verfuegbare Forschungen');
    const callsBeforeUpdate = apiMocks.get.mock.calls.length;
    emitSocket('COLONY_UPDATED', { colonyId: 8 });

    await waitFor(() => {
      expect(apiMocks.get.mock.calls.length).toBeGreaterThan(callsBeforeUpdate);
    });
  });

  it('anchors module tiers beneath the matching research centers in tree data', async () => {
    apiMocks.get.mockResolvedValue(anchoredModuleTreeTechs);

    render(
      <MemoryRouter initialEntries={['/research/tree']}>
        <Routes>
          <Route path="/research/tree" element={<ResearchTreePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Forschungsbaum');

    const edgeIds = reactFlowMock.lastProps?.edges.map((edge) => edge.id) ?? [];
    expect(edgeIds).toContain('e-200101-290001');
    expect(edgeIds).toContain('e-200201-290002');
    expect(edgeIds).toContain('e-200301-290003');
    expect(edgeIds).toContain('e-200501-290004');
    expect(edgeIds).toContain('e-290001-290002');
    expect(edgeIds).toContain('e-290002-290003');
    expect(edgeIds).toContain('e-290003-290004');
  });

  it('anchors imperial Tarnfeld-Generator beneath the imperial module research center in tree data', async () => {
    apiMocks.get.mockResolvedValue(imperialsModuleTreeTechs);

    render(
      <MemoryRouter initialEntries={['/research/tree']}>
        <Routes>
          <Route path="/research/tree" element={<ResearchTreePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Forschungsbaum');

    const edgeIds = reactFlowMock.lastProps?.edges.map((edge) => edge.id) ?? [];
    const nodeByName = new Map(
      (reactFlowMock.lastProps?.nodes ?? []).map((node) => [
        node.data.tech.name,
        node,
      ]),
    );
    expect(edgeIds).toContain('e-200103-290001');
    expect(edgeIds).toContain('e-200203-290002');
    expect(edgeIds).toContain('e-200303-290003');
    expect(edgeIds).toContain('e-200503-290004');
    expect(edgeIds).not.toContain('e-200101-290001');
    expect(edgeIds).not.toContain('e-200501-290004');
    expect(edgeIds).toContain('e-200503-60100');
    expect(nodeByName.get('Tarnfeld-Generator')).toBeTruthy();
    expect(nodeByName.get('Modul-Forschungszentrum')).toBeTruthy();
  });
});
