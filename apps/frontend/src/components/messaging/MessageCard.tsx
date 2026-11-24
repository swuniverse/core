import { Link } from 'react-router-dom';
import { ContactMode, type Faction } from '@swuniverse/shared';
import { BbCodeText } from '../BbCodeText';
import { PlayerAvatar } from '../PlayerAvatar';
import { PlayerName } from '../PlayerName';
import { formatGameDateTime } from '../../lib/format';
import { messagePreview } from './message-preview';
import type { UserMessageFolder } from './UserMessageFolders';

export interface MessageParty {
  /** `null` for a deleted account. */
  id: number | null;
  username: string;
  avatar: string | null;
  faction: Faction | null;
  isNpc: boolean;
}

export interface FolderMessage {
  id: number;
  body: string;
  isRead?: boolean;
  readReceipt?: boolean;
  isSystem: boolean;
  createdAt: string;
  senderId: number | null;
  sender?: MessageParty | null;
  recipient?: MessageParty | null;
  senderContact?: { id: number; mode: ContactMode } | null;
}

const CONTACT_MODES: Array<{ mode: ContactMode; label: string; className: string }> = [
  { mode: ContactMode.FRIEND, label: 'Freund', className: 'text-green-500' },
  { mode: ContactMode.NEUTRAL, label: 'Neutral', className: 'text-swu-muted' },
  { mode: ContactMode.ENEMY, label: 'Feind', className: 'text-red-500' },
];

/** One full message like STU pmCategory.twig: no click needed to read it. */
export function MessageCard({
  message,
  outbox,
  selected,
  targetRoute,
  badge,
  moveFolders,
  currentUserFolderId,
  onToggle,
  onDelete,
  onReply,
  onContactMode,
  onMove,
}: {
  message: FolderMessage;
  outbox: boolean;
  selected: boolean;
  targetRoute: string | null;
  badge?: React.ReactNode;
  /** Custom folders the message may move to; `null` when it is not movable. */
  moveFolders: UserMessageFolder[] | null;
  currentUserFolderId: number | null;
  onToggle: () => void;
  onDelete: () => void;
  onReply: () => void;
  onContactMode: (mode: ContactMode) => void;
  onMove: (folderId: number | null) => void;
}) {
  const party = (outbox ? message.recipient : message.isSystem ? null : message.sender) ?? null;
  const isNew = !outbox && message.isRead === false;
  const canReply = !outbox && !message.isSystem && message.senderId !== null;
  const canSwitchContact = canReply && !party?.isNpc;
  const label = messagePreview(message.body);

  return (
    <article
      className={`flex gap-3 p-3 ${isNew ? 'border-l-2 border-l-swu-accent' : ''}`}
      aria-label={`Nachricht ${label}`}
    >
      <div className="flex shrink-0 flex-col items-center gap-2">
        {!outbox && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            aria-label={`Nachricht ${label} auswählen`}
          />
        )}
        {party && party.id !== null ? (
          <Link to={`/players/${party.id}`} aria-label={`Profil von ${party.username}`}>
            <PlayerAvatar name={party.username} avatar={party.avatar} faction={party.faction} decorative className="size-12" />
          </Link>
        ) : party ? (
          <PlayerAvatar name={party.username} avatar={party.avatar} faction={party.faction} decorative className="size-12" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <header className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-swu-primary">
            {outbox && 'An: '}
            {party === null ? (
              'System'
            ) : party.id !== null ? (
              <>
                <Link to={`/players/${party.id}`} className="font-bold hover:text-swu-accent">
                  <PlayerName name={party.username} />
                </Link>{' '}
                <span className="text-swu-muted">({party.id})</span>
              </>
            ) : (
              <PlayerName name={party.username} />
            )}
            {party?.isNpc && (
              <span className="ml-1 rounded border border-amber-400/60 px-1 text-[10px] font-bold text-amber-300">NPC</span>
            )}
          </span>
          <span className="flex items-center gap-2">
            {badge}
            {outbox && message.readReceipt && (
              <span title="Nachricht gelesen" aria-label="Nachricht gelesen" className="font-bold text-green-400">✓✓</span>
            )}
            <time dateTime={message.createdAt} className={isNew ? 'font-bold text-swu-accent' : 'text-swu-muted'}>
              {formatGameDateTime(message.createdAt)}
              {isNew && <span className="sr-only"> (neu)</span>}
            </time>
          </span>
        </header>
        <BbCodeText text={message.body} className="whitespace-pre-wrap text-sm text-swu-text" />
        <footer className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {targetRoute && (
            <Link to={targetRoute} className="border border-swu-accent px-2 py-0.5 text-swu-accent hover:bg-swu-accent/20">
              ansehen
            </Link>
          )}
          {canReply && (
            <button type="button" onClick={onReply} className="border border-swu-accent px-2 py-0.5 text-swu-accent hover:bg-swu-accent/20">
              Antworten
            </button>
          )}
          {canSwitchContact && party && (
            <span role="group" aria-label={`Kontaktmodus für ${party.username}`} className="flex gap-1">
              {CONTACT_MODES.map(({ mode, label: modeLabel, className }) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={message.senderContact?.mode === mode}
                  onClick={() => onContactMode(mode)}
                  className={`border px-1.5 py-0.5 ${className} ${message.senderContact?.mode === mode ? 'border-current' : 'border-swu-border opacity-70'}`}
                >
                  {modeLabel}
                </button>
              ))}
            </span>
          )}
          {moveFolders && (
            <select
              aria-label={`Nachricht ${label} verschieben`}
              value=""
              onChange={(event) => onMove(event.target.value === 'personal' ? null : Number(event.target.value))}
              className="border border-swu-border bg-swu-bg px-1 py-0.5"
            >
              <option value="">Verschieben nach …</option>
              {currentUserFolderId !== null && <option value="personal">Persönlich</option>}
              {moveFolders
                .filter((folder) => folder.id !== currentUserFolderId)
                .map((folder) => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
            </select>
          )}
          <button type="button" onClick={onDelete} aria-label="Nachricht löschen" className="ml-auto text-red-400 hover:text-red-300">
            Löschen
          </button>
        </footer>
      </div>
    </article>
  );
}

/** Page numbers like STU pmNavigation: first, last and a window around the current page. */
export function PageNumbers({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = [...new Set([1, page - 2, page - 1, page, page + 1, page + 2, totalPages])]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
  return (
    <nav aria-label="Seiten" className="flex flex-wrap items-center gap-1 border-t border-swu-border/50 px-3 py-2 text-xs">
      {pages.map((p, index) => (
        <span key={p} className="flex items-center gap-1">
          {index > 0 && p - pages[index - 1] > 1 && <span className="text-swu-muted">…</span>}
          <button
            type="button"
            onClick={() => onPage(p)}
            aria-current={p === page ? 'page' : undefined}
            aria-label={`Seite ${p}`}
            className={`min-w-6 border px-1.5 py-0.5 ${p === page ? 'border-swu-accent text-swu-accent' : 'border-swu-border text-swu-muted hover:text-swu-primary'}`}
          >
            {p}
          </button>
        </span>
      ))}
    </nav>
  );
}
