import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BbCodeText } from './BbCodeText';

interface ActionResultProps {
  messages: string[];
  onClose: () => void;
  continueTo?: string;
  continueLabel?: string;
}

export function ActionResult({
  messages,
  onClose,
  continueTo,
  continueLabel = 'Weiter',
}: ActionResultProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => setExpanded(false), [messages]);
  if (messages.length === 0) return null;

  const visibleMessages = expanded ? messages : messages.slice(0, 5);

  return (
    <section className="border border-swu-border bg-black/30 text-xs">
      <header className="flex items-center justify-between border-b border-swu-border px-3 py-1.5">
        <h2 className="font-bold text-swu-primary">Meldung</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Meldung schließen"
          className="text-swu-muted hover:text-swu-accent"
        >
          ×
        </button>
      </header>
      <div className="space-y-1 px-3 py-2">
        {visibleMessages.map((message, index) => (
          <BbCodeText key={`${message}-${index}`} text={message} />
        ))}
        {messages.length >= 6 && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="mt-2 text-swu-primary hover:text-swu-accent"
          >
            {expanded ? 'Weniger Meldungen anzeigen' : `Alle ${messages.length} Meldungen anzeigen`}
          </button>
        )}
        {continueTo && (
          <div>
            <Link className="text-swu-primary hover:text-swu-accent" to={continueTo}>
              {continueLabel}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

export function useActionResult() {
  const [messages, setMessages] = useState<string[]>([]);
  const { pathname } = useLocation();

  useEffect(() => setMessages([]), [pathname]);

  return {
    messages,
    show: useCallback((nextMessages: string[]) => setMessages(nextMessages), []),
    clear: useCallback(() => setMessages([]), []),
  };
}
