import type {
  HyperspaceRouteDto,
  StarmapLayerDto,
  StarmapSystemListItemDto,
} from '@swuniverse/shared';

interface RouteBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface Point {
  x: number;
  y: number;
}

interface ClippedLine {
  from: Point;
  to: Point;
}

type RenderMode = 'normalized' | 'sector';

interface HyperspaceRouteOverlayProps {
  layer: Pick<StarmapLayerDto, 'width' | 'height'>;
  routes: HyperspaceRouteDto[];
  bounds?: RouteBounds;
  className?: string;
  renderMode?: RenderMode;
  cellSize?: number;
  widthPx?: number;
  heightPx?: number;
}

function clipLineToBounds(
  from: Point,
  to: Point,
  bounds: RouteBounds,
): ClippedLine | null {
  const minX = bounds.minX - 0.5;
  const maxX = bounds.maxX + 0.5;
  const minY = bounds.minY - 0.5;
  const maxY = bounds.maxY + 0.5;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let entry = 0;
  let exit = 1;

  const clip = (p: number, q: number) => {
    if (p === 0) return q >= 0;
    const ratio = q / p;
    if (p < 0) {
      if (ratio > exit) return false;
      if (ratio > entry) entry = ratio;
    } else {
      if (ratio < entry) return false;
      if (ratio < exit) exit = ratio;
    }
    return true;
  };

  if (
    !clip(-dx, from.x - minX) ||
    !clip(dx, maxX - from.x) ||
    !clip(-dy, from.y - minY) ||
    !clip(dy, maxY - from.y)
  ) {
    return null;
  }

  return {
    from: { x: from.x + entry * dx, y: from.y + entry * dy },
    to: { x: from.x + exit * dx, y: from.y + exit * dy },
  };
}

function isInsideBounds(system: StarmapSystemListItemDto, bounds: RouteBounds) {
  return (
    system.cx >= bounds.minX &&
    system.cx <= bounds.maxX &&
    system.cy >= bounds.minY &&
    system.cy <= bounds.maxY
  );
}

function pointsEqual(a: Point, b: Point) {
  return Math.abs(a.x - b.x) < 0.0001 && Math.abs(a.y - b.y) < 0.0001;
}

function isMinorRoute(route: HyperspaceRouteDto) {
  return /kessel|minor|pipeline/i.test(`${route.key} ${route.name}`);
}

export function HyperspaceRouteOverlay({
  layer,
  routes,
  bounds,
  className = '',
  renderMode = 'normalized',
  cellSize = 28,
  widthPx,
  heightPx,
}: HyperspaceRouteOverlayProps) {
  if (routes.length === 0) return null;

  const widthCells = bounds ? bounds.maxX - bounds.minX + 1 : layer.width;
  const heightCells = bounds ? bounds.maxY - bounds.minY + 1 : layer.height;
  if (widthCells <= 0 || heightCells <= 0) return null;

  const isSectorMode = renderMode === 'sector';
  const svgWidth = isSectorMode ? (widthPx ?? widthCells * cellSize) : 100;
  const svgHeight = isSectorMode ? (heightPx ?? heightCells * cellSize) : 100;
  if (svgWidth <= 0 || svgHeight <= 0) return null;

  const toOverlayPoint = (point: Point) => {
    const originX = bounds ? bounds.minX : 1;
    const originY = bounds ? bounds.minY : 1;
    if (isSectorMode) {
      return {
        x: (point.x - originX + 0.5) * cellSize,
        y: (point.y - originY + 0.5) * cellSize,
      };
    }
    return {
      x: ((point.x - originX + 0.5) / widthCells) * 100,
      y: ((point.y - originY + 0.5) / heightCells) * 100,
    };
  };

  const buildSegmentPath = (points: Point[]) => {
    if (points.length < 2) return null;
    const pathPoints = bounds
      ? points.flatMap((point, index) => {
          if (index === points.length - 1) return [];
          const clipped = clipLineToBounds(point, points[index + 1], bounds);
          if (!clipped) return [];
          return pointsEqual(clipped.from, clipped.to)
            ? []
            : [clipped.from, clipped.to];
        })
      : points;
    if (pathPoints.length < 2) return null;

    const [first, ...rest] = pathPoints.map(toOverlayPoint);
    return `M ${first.x} ${first.y} ${rest
      .map((point) => `L ${point.x} ${point.y}`)
      .join(' ')}`;
  };

  const landmarkSystems = new Map<number, StarmapSystemListItemDto>();
  for (const route of routes) {
    for (const segment of route.segments) {
      if (segment.fromSystem.isLandmark) {
        landmarkSystems.set(segment.fromSystem.id, segment.fromSystem);
      }
      if (segment.toSystem.isLandmark) {
        landmarkSystems.set(segment.toSystem.id, segment.toSystem);
      }
    }
  }

  return (
    <svg
      className={`pointer-events-none absolute inset-0 z-20 h-full w-full ${className}`}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {routes.flatMap((route) =>
        route.segments.map((segment) => {
          const controlPoints = segment.controlPoints ?? [];
          const d = buildSegmentPath([
            { x: segment.fromSystem.cx, y: segment.fromSystem.cy },
            ...controlPoints,
            { x: segment.toSystem.cx, y: segment.toSystem.cy },
          ]);
          if (!d) return null;

          const minorRoute = isMinorRoute(route);
          const strokeDasharray = minorRoute ? '5 4' : undefined;
          return (
            <g key={`${route.id}-${segment.id}`}>
              <path
                d={d}
                fill="none"
                stroke={route.color}
                strokeWidth={isSectorMode ? 6 : 1.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.18}
                vectorEffect="non-scaling-stroke"
                strokeDasharray={strokeDasharray}
              />
              <path
                d={d}
                fill="none"
                stroke={route.color}
                strokeWidth={isSectorMode ? (minorRoute ? 1.6 : 2.2) : 0.35}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={minorRoute ? 0.72 : 0.86}
                vectorEffect="non-scaling-stroke"
                strokeDasharray={strokeDasharray}
              />
            </g>
          );
        }),
      )}
      {[...landmarkSystems.values()].map((system) => {
        if (bounds && !isInsideBounds(system, bounds)) return null;
        const center = toOverlayPoint({ x: system.cx, y: system.cy });
        return (
          <circle
            key={`lm-${system.id}`}
            cx={center.x}
            cy={center.y}
            r={isSectorMode ? 3.4 : 0.45}
            fill="#facc15"
            stroke="#020617"
            strokeWidth={isSectorMode ? 1.2 : 0.18}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}
