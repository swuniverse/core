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

const reactFlowMock = vi.hoisted(() => ({
  lastProps: null as {
    nodes: Node<{ tech: { id: number; name: string }; isHighlighted: boolean; onOpenDetails: () => void }> [];
    edges: Array<{ id: string; style?: { stroke?: string; strokeWidth?: number }; animated?: boolean }>;
    onNodeClick?: (_event: unknown, node: Node<{ tech: { id: number; name: string }; isHighlighted: boolean; onOpenDetails: () => void }>) => void;
    onPaneClick?: () => void;
  } | null,
}));

vi.mock('../services/api', () => ({
  api: apiMocks,
}));

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children, nodes, edges, onNodeClick, onPaneClick }: {
    children?: ReactNode;
    nodes: Node<{ tech: { id: number; name: string }; isHighlighted: boolean; onOpenDetails: () => void }> [];
    edges: Array<{ id: string; style?: { stroke?: string; strokeWidth?: number }; animated?: boolean }>;
    onNodeClick?: (_event: unknown, node: Node<{ tech: { id: number; name: string }; isHighlighted: boolean; onOpenDetails: () => void }>) => void;
    onPaneClick?: () => void;
  }) => {
    reactFlowMock.lastProps = { nodes, edges, onNodeClick, onPaneClick };
    return (
      <div data-testid="react-flow-mock">
        {nodes.map((node) => (
          <div key={node.id}>
            <button type="button" onClick={() => onNodeClick?.(undefined, node)}>{node.data.tech.name}</button>
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
          />
        ))}
        <button type="button" aria-label="Freies Feld" onClick={() => onPaneClick?.()}>Freies Feld</button>
        {children}
      </div>
    );
  },
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  Handle: () => null,
  MarkerType: { ArrowClosed: 'ArrowClosed' },
  Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
}));

vi.mock('elkjs/lib/elk.bundled.js', () => ({
  default: class {
    layout = vi.fn(async (graph: { children?: Array<{ id: string; width?: number; height?: number }> }) => ({
      children: (graph.children ?? []).map((child, index) => ({
        ...child,
        x: index * 200,
        y: 0,
      })),
    }));
  },
}));

function LocationProbe() {
  const location = useLocation();

  return <div data-testid="location">{location.pathname}{location.search}</div>;
}

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

    const modalTitle = await screen.findByText('Forschung: Hyperantrieb Theorie');
    expect(modalTitle).toBeTruthy();
    expect(screen.getAllByText('Ermoeglicht schnellere Spruenge durch den Hyperraum.')).toHaveLength(2);
    expect(screen.getByTestId('location').textContent).toBe('/research?focus=211301');
    expect(screen.getByText('Verfuegbare Forschungen')).toBeTruthy();
    expect(screen.getByText('Deflektorschild Gitter')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '✕' }));

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/research');
    });
    expect(screen.getByTestId('location').textContent?.includes('?focus=211301')).toBe(false);
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
    const treeNodeButton = await screen.findByRole('button', { name: 'Hyperantrieb Theorie' });
    const infoButton = await screen.findByRole('button', { name: 'Hyperantrieb Theorie Details anzeigen' });
    expect(screen.getByTestId('location').textContent).toBe('/research/tree');
    expect(screen.getByTestId('edge-e-211300-211301').getAttribute('data-stroke')).toBe('#38bdf8');
    expect(screen.getByTestId('edge-e-211300-211301').getAttribute('data-width')).toBe('1.25');
    expect(screen.getByTestId('edge-e-211300-211301').getAttribute('data-animated')).toBe('false');
    expect(screen.getByTestId('edge-e-211200-211300').getAttribute('data-stroke')).toBe('#38bdf8');
    expect(screen.getByTestId('edge-e-211200-211300').getAttribute('data-width')).toBe('1.25');
    expect(screen.getByTestId('edge-e-211200-211300').getAttribute('data-animated')).toBe('false');
    expect(screen.getByTestId('edge-e-211200-211302').getAttribute('data-stroke')).toBe('#38bdf8');
    expect(screen.getByTestId('edge-e-211200-211302').getAttribute('data-animated')).toBe('false');

    fireEvent.click(treeNodeButton);

    await waitFor(() => {
      expect(screen.getByTestId('edge-e-211300-211301').getAttribute('data-stroke')).toBe('#f59e0b');
    });
    expect(screen.getByTestId('location').textContent).toBe('/research/tree?highlight=211301');
    expect(screen.queryByText('Forschung: Hyperantrieb Theorie')).toBeNull();

    fireEvent.click(infoButton);

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/research/tree?highlight=211301&focus=211301');
    });
    expect(screen.getByText('Forschung: Hyperantrieb Theorie')).toBeTruthy();
    expect(screen.getByText('Ermoeglicht schnellere Spruenge durch den Hyperraum.')).toBeTruthy();
    expect(screen.getByTestId('edge-e-211300-211301').getAttribute('data-stroke')).toBe('#f59e0b');
    expect(screen.getByTestId('edge-e-211300-211301').getAttribute('data-width')).toBe('2.75');
    expect(screen.getByTestId('edge-e-211300-211301').getAttribute('data-animated')).toBe('true');
    expect(screen.getByTestId('edge-e-211200-211300').getAttribute('data-stroke')).toBe('#f59e0b');
    expect(screen.getByTestId('edge-e-211200-211300').getAttribute('data-width')).toBe('2.75');
    expect(screen.getByTestId('edge-e-211200-211300').getAttribute('data-animated')).toBe('true');
    expect(screen.getByTestId('edge-e-211200-211302').getAttribute('data-stroke')).toBe('#38bdf8');
    expect(screen.getByTestId('edge-e-211200-211302').getAttribute('data-animated')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: '✕' }));

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/research/tree');
    });
    expect(screen.queryByText('Forschung: Hyperantrieb Theorie')).toBeNull();
    expect(screen.getByTestId('location').textContent?.includes('?focus=')).toBe(false);
    expect(screen.getByTestId('edge-e-211300-211301').getAttribute('data-stroke')).toBe('#38bdf8');
    expect(screen.getByTestId('edge-e-211300-211301').getAttribute('data-width')).toBe('1.25');
    expect(screen.getByTestId('edge-e-211300-211301').getAttribute('data-animated')).toBe('false');
    expect(screen.getByTestId('edge-e-211200-211300').getAttribute('data-stroke')).toBe('#38bdf8');
    expect(screen.getByTestId('edge-e-211200-211300').getAttribute('data-width')).toBe('1.25');
    expect(screen.getByTestId('edge-e-211200-211300').getAttribute('data-animated')).toBe('false');

    fireEvent.click(treeNodeButton);

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/research/tree?highlight=211301');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Freies Feld' }));

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/research/tree');
    });
    expect(screen.getByTestId('edge-e-211300-211301').getAttribute('data-stroke')).toBe('#38bdf8');
    expect(screen.getByTestId('edge-e-211300-211301').getAttribute('data-animated')).toBe('false');
    expect(screen.getByTestId('edge-e-211200-211300').getAttribute('data-stroke')).toBe('#38bdf8');
    expect(screen.getByTestId('edge-e-211200-211300').getAttribute('data-animated')).toBe('false');
    expect(screen.getByText('Forschungsbaum')).toBeTruthy();
  });
});
