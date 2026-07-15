import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import type { UserProfile } from '@swuniverse/shared';
import type { Node } from '@xyflow/react';
import type { ReactNode } from 'react';

import { ResearchPage } from './research';
import { ResearchTreePage } from './research-tree';
import { useAuthStore } from '../stores/auth.store';

const techs = [
  {
    id: 211200,
    name: 'Fusionskern Mathematik',
    description: 'Legt die theoretische Basis fuer stabile Reaktorkerne.',
    category: 'energy',
    tier: 1,
    duration: 45,
    finishesAt: null,
    dependencies: [],
    unlocks: {},
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
    dependencies: [{ type: 'REQUIRE', techIds: [211200] }],
    unlocks: {},
    status: 'COMPLETED',
    progress: 120,
    pointsRequired: 120,
    commodity: null,
  },
] satisfies Array<Record<string, unknown>>;

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

type MockTreeEdge = {
  id: string;
  type?: string;
  data?: { points?: Array<{ x: number; y: number }> };
  style?: { stroke?: string; strokeWidth?: number };
  animated?: boolean;
};

const reactFlowMock = vi.hoisted(() => ({
  lastProps: null as {
    nodes: Node<{
      tech: { id: number; name: string };
      isHighlighted: boolean;
      onOpenDetails: () => void;
    }>[];
    edges: MockTreeEdge[];
    onNodeClick?: (
      _event: unknown,
      node: Node<{
        tech: { id: number; name: string };
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

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({
    children,
    nodes,
    edges,
    onNodeClick,
    onPaneClick,
  }: {
    children?: ReactNode;
    nodes: Node<{
      tech: { id: number; name: string };
      isHighlighted: boolean;
      onOpenDetails: () => void;
    }>[];
    edges: MockTreeEdge[];
    onNodeClick?: (
      _event: unknown,
      node: Node<{
        tech: { id: number; name: string };
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
          <div key={node.id}>
            <button
              type="button"
              onClick={() => onNodeClick?.(undefined, node)}
            >
              {node.data.tech.name}
            </button>
            <button
              type="button"
              aria-label={`${node.data.tech.name} Details anzeigen`}
              onClick={() => node.data.onOpenDetails()}
            >
              i
            </button>
          </div>
        ))}
        {edges.map((edge) => (
          <div
            key={edge.id}
            data-testid={`edge-${edge.id}`}
            data-stroke={edge.style?.stroke}
            data-width={edge.style?.strokeWidth}
            data-animated={String(edge.animated ?? false)}
            data-type={edge.type}
            data-points={edge.data?.points?.length ?? 0}
          />
        ))}
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
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  Handle: () => null,
  BaseEdge: () => null,
  getBezierPath: () => ['M 0 0 L 1 1'],
  MarkerType: { ArrowClosed: 'ArrowClosed' },
  Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
}));

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
    ).toBe('1.25');
    expect(
      screen.getByTestId('edge-e-211300-211301').getAttribute('data-animated'),
    ).toBe('false');
    expect(
      screen.getByTestId('edge-e-211200-211300').getAttribute('data-stroke'),
    ).toBe('#38bdf8');
    expect(
      screen.getByTestId('edge-e-211200-211300').getAttribute('data-width'),
    ).toBe('1.25');
    expect(
      screen.getByTestId('edge-e-211200-211300').getAttribute('data-animated'),
    ).toBe('false');
    expect(
      screen.getByTestId('edge-e-211200-211302').getAttribute('data-stroke'),
    ).toBe('#38bdf8');
    expect(
      screen.getByTestId('edge-e-211200-211302').getAttribute('data-animated'),
    ).toBe('false');

    fireEvent.click(treeNodeButton);

    await waitFor(() => {
      expect(
        screen.getByTestId('edge-e-211300-211301').getAttribute('data-stroke'),
      ).toBe('#f59e0b');
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
    ).toBe('#f59e0b');
    expect(
      screen.getByTestId('edge-e-211300-211301').getAttribute('data-width'),
    ).toBe('2.75');
    expect(
      screen.getByTestId('edge-e-211300-211301').getAttribute('data-animated'),
    ).toBe('true');
    expect(
      screen.getByTestId('edge-e-211200-211300').getAttribute('data-stroke'),
    ).toBe('#f59e0b');
    expect(
      screen.getByTestId('edge-e-211200-211300').getAttribute('data-width'),
    ).toBe('2.75');
    expect(
      screen.getByTestId('edge-e-211200-211300').getAttribute('data-animated'),
    ).toBe('true');
    expect(
      screen.getByTestId('edge-e-211200-211302').getAttribute('data-stroke'),
    ).toBe('#38bdf8');
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
    expect(
      screen.getByTestId('edge-e-211300-211301').getAttribute('data-stroke'),
    ).toBe('#38bdf8');
    expect(
      screen.getByTestId('edge-e-211300-211301').getAttribute('data-width'),
    ).toBe('1.25');
    expect(
      screen.getByTestId('edge-e-211300-211301').getAttribute('data-animated'),
    ).toBe('false');
    expect(
      screen.getByTestId('edge-e-211200-211300').getAttribute('data-stroke'),
    ).toBe('#38bdf8');
    expect(
      screen.getByTestId('edge-e-211200-211300').getAttribute('data-width'),
    ).toBe('1.25');
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
    expect(screen.getByText('Forschungsbaum')).toBeTruthy();
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
