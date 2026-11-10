import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from 'react';
import { createPortal } from 'react-dom';

type Position = { x: number; y: number };
type OpenTooltip = { id: string; close: () => void } | null;

const CURSOR_OFFSET = 20;
const VIEWPORT_GAP = 8;
let openTooltip: OpenTooltip = null;

function claimTooltip(id: string, close: () => void) {
  if (openTooltip?.id !== id) openTooltip?.close();
  openTooltip = { id, close };
}

function releaseTooltip(id: string) {
  if (openTooltip?.id === id) openTooltip = null;
}

function elementPosition(element: HTMLElement): Position {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.bottom + CURSOR_OFFSET };
}

function panelPosition(
  desired: Position,
  panel: HTMLDivElement | null,
): CSSProperties {
  const width = panel?.offsetWidth ?? 0;
  const height = panel?.offsetHeight ?? 0;
  const maxX = Math.max(VIEWPORT_GAP, window.innerWidth - width - VIEWPORT_GAP);
  const below = desired.y + height <= window.innerHeight - VIEWPORT_GAP;
  const top = below
    ? desired.y
    : Math.max(VIEWPORT_GAP, desired.y - height - CURSOR_OFFSET * 2);
  return {
    left: Math.min(Math.max(VIEWPORT_GAP, desired.x), maxX),
    top,
  };
}

export function Tooltip({
  content,
  title,
  onOpen,
  children,
}: {
  content: ReactNode;
  title?: string;
  onOpen?: () => void;
  children: ReactElement;
}) {
  const generatedId = useId();
  const tooltipId = `tooltip-${generatedId.replace(/:/g, '')}`;
  const [position, setPosition] = useState<Position | null>(null);
  const [touchOpen, setTouchOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const ignoreNextClick = useRef(false);

  const close = () => {
    setPosition(null);
    setTouchOpen(false);
    releaseTooltip(tooltipId);
  };

  const open = (nextPosition: Position, byTouch = false) => {
    claimTooltip(tooltipId, close);
    setTouchOpen(byTouch);
    setPosition(nextPosition);
  };

  useEffect(() => {
    if (!position) return;
    const closeCurrent = () => {
      setPosition(null);
      setTouchOpen(false);
      releaseTooltip(tooltipId);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCurrent();
    };
    const closeOutside = (event: PointerEvent) => {
      if (!triggerRef.current?.contains(event.target as Node)) closeCurrent();
    };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOutside);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOutside);
    };
  }, [position, tooltipId]);

  useEffect(() => () => releaseTooltip(tooltipId), [tooltipId]);

  if (!isValidElement(children)) return children;
  const child = children as ReactElement<Record<string, unknown>>;
  const originalClick = child.props.onClick as
    | ((event: ReactMouseEvent<HTMLElement>) => void)
    | undefined;

  const trigger = cloneElement(child, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      const childRef = (child as ReactElement & { ref?: unknown }).ref;
      if (typeof childRef === 'function') childRef(node);
      else if (childRef && typeof childRef === 'object') {
        (childRef as { current: HTMLElement | null }).current = node;
      }
    },
    'aria-describedby': position ? tooltipId : undefined,
    onMouseEnter: (event: ReactMouseEvent<HTMLElement>) => {
      if (!touchOpen) {
        open({ x: event.clientX, y: event.clientY + CURSOR_OFFSET });
        onOpen?.();
      }
      (child.props.onMouseEnter as
        | ((event: ReactMouseEvent<HTMLElement>) => void)
        | undefined)?.(event);
    },
    onMouseMove: (event: ReactMouseEvent<HTMLElement>) => {
      if (position && !touchOpen) {
        setPosition({ x: event.clientX, y: event.clientY + CURSOR_OFFSET });
      }
      (child.props.onMouseMove as
        | ((event: ReactMouseEvent<HTMLElement>) => void)
        | undefined)?.(event);
    },
    onMouseLeave: (event: ReactMouseEvent<HTMLElement>) => {
      if (!touchOpen) close();
      (child.props.onMouseLeave as
        | ((event: ReactMouseEvent<HTMLElement>) => void)
        | undefined)?.(event);
    },
    onFocus: (event: React.FocusEvent<HTMLElement>) => {
      open(elementPosition(event.currentTarget));
      onOpen?.();
      (child.props.onFocus as
        | ((event: React.FocusEvent<HTMLElement>) => void)
        | undefined)?.(event);
    },
    onBlur: (event: React.FocusEvent<HTMLElement>) => {
      if (!touchOpen) close();
      (child.props.onBlur as
        | ((event: React.FocusEvent<HTMLElement>) => void)
        | undefined)?.(event);
    },
    onTouchStart: (event: ReactTouchEvent<HTMLElement>) => {
      if (!touchOpen) {
        const touch = event.touches[0];
        open(
          touch
            ? { x: touch.clientX, y: touch.clientY + CURSOR_OFFSET }
            : elementPosition(event.currentTarget),
          true,
        );
        onOpen?.();
        ignoreNextClick.current = true;
      }
      (child.props.onTouchStart as
        | ((event: ReactTouchEvent<HTMLElement>) => void)
        | undefined)?.(event);
    },
    onClick: (event: ReactMouseEvent<HTMLElement>) => {
      if (ignoreNextClick.current) {
        ignoreNextClick.current = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      originalClick?.(event);
      if (touchOpen) close();
    },
  });

  return (
    <>
      {trigger}
      {position &&
        createPortal(
          <div
            ref={panelRef}
            id={tooltipId}
            role="tooltip"
            className="pointer-events-none fixed z-[70] max-w-[min(24rem,calc(100vw-1rem))] border border-swu-border bg-swu-surface text-xs text-swu-text"
            style={panelPosition(position, panelRef.current)}
          >
            {title ? (
              <div className="border-b border-swu-border bg-black/40 px-1.5 py-1 text-center font-bold text-swu-primary">
                {title}
              </div>
            ) : null}
            {title ? <div className="p-1.5">{content}</div> : content}
          </div>,
          document.body,
        )}
    </>
  );
}

export function TooltipTable({
  title,
  rows,
}: {
  title?: string;
  rows: ReadonlyArray<readonly [label: ReactNode, value: ReactNode]>;
}) {
  return (
    <table className="w-full border-collapse bg-swu-surface text-xs">
      {title ? (
        <thead>
          <tr>
            <th
              colSpan={2}
              className="border border-swu-border bg-black/40 px-1.5 py-1 text-center font-bold text-swu-primary"
            >
              {title}
            </th>
          </tr>
        </thead>
      ) : null}
      <tbody>
        {rows.map(([label, value], index) => (
          <tr key={index} className="hover:bg-white/5">
            <td className="border border-swu-border px-1.5 py-1">{label}</td>
            <td className="border border-swu-border px-1.5 py-1 text-right font-mono">
              {value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
