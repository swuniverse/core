import { useCallback } from 'react';
import { useSocket } from '../../hooks/use-socket';
import { WsEventType, type SpacecraftEventPayload } from '@swuniverse/shared';
import { useToast } from '../Toast';

interface SpacecraftMessageBarProps {
  shipId: number;
}

type ToastMethods = ReturnType<typeof useToast>;

export function spacecraftEventToast(
  toast: ToastMethods,
  data: Partial<SpacecraftEventPayload>,
  shipId: number,
): void {
  if (data.shipId !== shipId || !data.detail) return;
  if (data.severity === 'WARNING') toast.warning(data.detail);
  else toast.info(data.detail);
}

export function SpacecraftMessageBar({ shipId }: SpacecraftMessageBarProps) {
  const toast = useToast();

  const handleEvent = useCallback(
    (payload: unknown) => {
      spacecraftEventToast(toast, payload as Partial<SpacecraftEventPayload>, shipId);
    },
    [shipId, toast],
  );

  useSocket(WsEventType.SPACECRAFT_EVENT, handleEvent);
  return null;
}
