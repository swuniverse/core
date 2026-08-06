import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '../../hooks/use-socket';
import { WsEventType } from '@swuniverse/shared';

interface Message {
  id: number;
  text: string;
}

interface SpacecraftMessageBarProps {
  shipId: number;
}

let msgCounter = 0;

export function SpacecraftMessageBar({ shipId }: SpacecraftMessageBarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const handleEvent = useCallback(
    (payload: unknown) => {
      const data = payload as { shipId?: number; detail?: string };
      if (data.shipId !== shipId || !data.detail) return;
      const id = ++msgCounter;
      setMessages((prev) => [...prev.slice(-4), { id, text: data.detail! }]);
      const timer = setTimeout(() => dismiss(id), 5000);
      timersRef.current.set(id, timer);
    },
    [shipId, dismiss],
  );

  useSocket(WsEventType.SPACECRAFT_EVENT, handleEvent);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  if (messages.length === 0) return null;

  return (
    <div className="mb-2 space-y-0.5">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className="flex items-center justify-between rounded border border-swu-accent/30 bg-swu-surface/80 px-3 py-1 font-mono text-xs text-swu-accent"
        >
          <span>{msg.text}</span>
          <button
            onClick={() => dismiss(msg.id)}
            className="ml-2 text-swu-muted hover:text-swu-primary"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
