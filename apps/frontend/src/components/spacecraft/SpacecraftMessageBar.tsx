import { useCallback } from 'react';
import { useSocket } from '../../hooks/use-socket';
import { WsEventType } from '@swuniverse/shared';
import { useToast } from '../Toast';

interface SpacecraftMessageBarProps {
  shipId: number;
}

export function SpacecraftMessageBar({ shipId }: SpacecraftMessageBarProps) {
  const toast = useToast();

  const handleEvent = useCallback(
    (payload: unknown) => {
      const data = payload as { shipId?: number; detail?: string };
      if (data.shipId === shipId && data.detail) toast.info(data.detail);
    },
    [shipId, toast],
  );

  useSocket(WsEventType.SPACECRAFT_EVENT, handleEvent);
  return null;
}
