import { useEffect, useState, type KeyboardEvent } from 'react';
import {
  ALLIANCE_PERMISSION_PARENT,
  AlliancePermission as P,
  grantsAlliancePermission,
  type AllianceDetailDto,
  type AllianceRoleDto,
  type UpdateAllianceRoleRequest,
} from '@swuniverse/shared';
import { api } from '../../services/api';

const inputClass =
  'min-w-0 flex-1 border border-swu-border bg-swu-bg px-2 py-1 text-sm text-swu-text focus:border-swu-accent focus:outline-none disabled:opacity-60';
const buttonClass =
  'border border-swu-border px-2 py-0.5 text-xs text-swu-muted hover:text-swu-primary disabled:opacity-40';
const dangerButtonClass =
  'border border-swu-danger/70 px-2 py-0.5 text-xs text-red-400 hover:bg-swu-danger/20 disabled:opacity-40';

/** STU `AllianceJobPermissionEnum::getDescription`. */
const PERMISSION_LABEL: Record<P, string> = {
  [P.FOUNDER]: 'Präsident',
  [P.SUCCESSOR]: 'Vize',
  [P.DIPLOMATIC]: 'Diplomat',
  [P.CREATE_AGREEMENTS]: 'Kann Abkommen erstellen',
  [P.EDIT_DIPLOMATIC_DOCUMENTS]: 'Kann Vertragswerk ändern',
  [P.ALLIANCE_LEADERSHIP]: 'Gehört zur Allianzleitung',
  [P.EDIT_ALLIANCE]: 'Kann Allianz editieren',
  [P.MANAGE_APPLICATIONS]: 'Kann Bewerbungen bearbeiten',
  [P.MANAGE_JOBS]: 'Kann Rollen verwalten',
  [P.VIEW_COLONIES]: 'Kann Kolonien einsehen',
  [P.VIEW_MEMBER_DATA]: 'Kann Mitgliederdaten einsehen',
  [P.VIEW_SHIPS]: 'Kann Schiffe einsehen',
  [P.VIEW_ALLIANCE_STORAGE]: 'Kann Allianzdepots einsehen',
  [P.VIEW_ALLIANCE_HISTORY]: 'Kann Allianz-History einsehen',
};

/** STU `allianceEdit.twig`: diplomatic rights first, then management rights. */
const PERMISSION_GROUPS = [
  { title: 'Diplomatische Rechte', parent: P.DIPLOMATIC },
  { title: 'Verwaltungsrechte', parent: P.SUCCESSOR },
].map((group) => ({
  ...group,
  children: (Object.keys(ALLIANCE_PERMISSION_PARENT) as P[]).filter(
    (p) => ALLIANCE_PERMISSION_PARENT[p] === group.parent,
  ),
}));

/**
 * STU `initializePermissionLogic`: a set parent replaces its children, and
 * ticking all children sets the parent (only if the viewer may grant it).
 */
function normalizePermissions(value: P[], held: readonly P[]): P[] {
  let next = value;
  for (const { parent, children } of PERMISSION_GROUPS) {
    const complete = children.every((c) => next.includes(c));
    if (
      !next.includes(parent) &&
      complete &&
      grantsAlliancePermission(held, parent)
    ) {
      next = [...next, parent];
    }
    if (next.includes(parent)) next = next.filter((p) => !children.includes(p));
  }
  return next;
}

const sameSet = (a: readonly P[], b: readonly P[]) =>
  a.length === b.length && a.every((p) => b.includes(p));

/** One role card; `role` is null for a role not saved yet. */
interface Card {
  key: string;
  role: AllianceRoleDto | null;
  title: string;
  permissions: P[];
  open: boolean;
}

const toCard = (role: AllianceRoleDto): Card => ({
  key: `role-${role.id}`,
  role,
  title: role.title,
  permissions: role.permissions,
  open: false,
});

const editable = (card: Card) => card.role?.actions.edit ?? true;
// The founder role stays first (STU: not draggable); all others move.
const movable = (card: Card) => !card.role?.founder;

/** Moves `from` to the place of `to`; the founder card keeps its place. */
function moveCard(cards: Card[], from: string, to: string): Card[] {
  const slots = cards.flatMap((c, i) => (movable(c) ? [i] : []));
  const order = slots.map((i) => cards[i]);
  const fromIndex = order.findIndex((c) => c.key === from);
  const toIndex = order.findIndex((c) => c.key === to);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return cards;
  const [moved] = order.splice(fromIndex, 1);
  order.splice(toIndex, 0, moved);
  const next = [...cards];
  slots.forEach((slot, i) => (next[slot] = order[i]));
  return next;
}

function PermissionCheckbox({
  permission,
  value,
  held,
  locked,
  onChange,
}: {
  permission: P;
  value: readonly P[];
  held: readonly P[];
  locked: boolean;
  onChange: (next: P[]) => void;
}) {
  const parent = ALLIANCE_PERMISSION_PARENT[permission];
  const included = parent !== undefined && value.includes(parent);
  const missing = !grantsAlliancePermission(held, permission);
  return (
    <label
      className={`flex items-center gap-1.5 text-xs ${parent ? 'pl-5' : 'font-bold'}`}
      title={
        missing
          ? 'Dieses Recht besitzt Du selbst nicht'
          : included
            ? 'Im Oberrecht enthalten'
            : undefined
      }
    >
      <input
        type="checkbox"
        checked={included || value.includes(permission)}
        disabled={locked || included || missing}
        onChange={(e) =>
          onChange(
            e.target.checked
              ? [...value, permission]
              : value.filter((p) => p !== permission),
          )
        }
      />
      {PERMISSION_LABEL[permission]}
      {missing && !included && (
        <span className="font-normal text-swu-muted">(fehlt Dir)</span>
      )}
    </label>
  );
}

function RoleCard({
  card,
  held,
  busy,
  dragging,
  onChange,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  onMove,
}: {
  card: Card;
  held: readonly P[];
  busy: boolean;
  dragging: boolean;
  onChange: (patch: Partial<Card>) => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragEnd: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  // Stable while typing, so labels do not jump.
  const label = card.role?.title ?? 'Neue Rolle';
  const founder = card.role?.founder ?? false;
  const locked = !editable(card) || busy;
  const deletable = card.role ? card.role.actions.delete : true;
  const handleKey = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    onMove(event.key === 'ArrowUp' ? -1 : 1);
  };

  return (
    <li
      aria-label={`Rolle ${label}`}
      draggable={movable(card) && !busy}
      onDragStart={(event) => {
        event.dataTransfer?.setData('text/plain', card.key);
        onDragStart();
      }}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver();
      }}
      onDragEnd={onDragEnd}
      onDrop={(event) => event.preventDefault()}
      className={`space-y-2 border bg-swu-bg/40 p-2 ${
        dragging
          ? 'border-dashed border-swu-accent opacity-40'
          : 'border-swu-border'
      }`}
    >
      <div className="flex items-center gap-2">
        {movable(card) && (
          <button
            type="button"
            aria-label={`${label} verschieben`}
            title="Ziehen oder mit Pfeiltasten verschieben"
            disabled={busy}
            onKeyDown={handleKey}
            className="cursor-grab select-none text-lg leading-none text-swu-muted hover:text-swu-accent"
          >
            ☰
          </button>
        )}
        <input
          aria-label={`Titel der Rolle ${label}`}
          value={card.title}
          placeholder="Rollenbezeichnung"
          maxLength={30}
          disabled={locked}
          onChange={(e) => onChange({ title: e.target.value })}
          className={inputClass}
        />
        {!founder && (
          <button
            type="button"
            aria-label={`Rechte von ${label}`}
            aria-expanded={card.open}
            className={buttonClass}
            onClick={() => onChange({ open: !card.open })}
          >
            {card.open ? '▲' : '▼'}
          </button>
        )}
        {!founder && deletable && (
          <button
            type="button"
            disabled={busy}
            className={dangerButtonClass}
            onClick={onDelete}
          >
            Löschen
          </button>
        )}
      </div>
      {!founder && card.open && (
        <div className="space-y-3 border-t border-swu-border pt-2">
          {PERMISSION_GROUPS.map((group) => (
            <fieldset key={group.parent} className="space-y-1">
              <legend className="mb-1 text-xs font-bold text-swu-accent">
                {group.title}
              </legend>
              {[group.parent, ...group.children].map((permission) => (
                <PermissionCheckbox
                  key={permission}
                  permission={permission}
                  value={card.permissions}
                  held={held}
                  locked={locked}
                  onChange={(next) =>
                    onChange({ permissions: normalizePermissions(next, held) })
                  }
                />
              ))}
            </fieldset>
          ))}
        </div>
      )}
      {!founder && !editable(card) && (
        <p className="text-xs text-swu-muted">
          Gesperrt: Die Rolle enthält Rechte oder Inhaber, die Du nicht
          verwalten darfst.
        </p>
      )}
    </li>
  );
}

/**
 * STU „Allianz Rollen“ (`allianceEdit.twig`, `ally.js`): edit all roles
 * locally, then save them at once. The server enforces the protection rule.
 */
export function AllianceRolesEditor({
  alliance,
  busy,
  run,
  reload,
}: {
  alliance: AllianceDetailDto;
  busy: boolean;
  run: (action: () => Promise<unknown>) => void;
  reload: () => Promise<void>;
}) {
  const held = alliance.viewer.permissions ?? [];
  const [cards, setCards] = useState<Card[]>([]);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    setCards([...alliance.roles].sort((a, b) => a.sort - b.sort).map(toCard));
  }, [alliance.roles]);

  const update = (key: string, patch: Partial<Card>) =>
    setCards((all) => all.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  const move = (key: string, direction: -1 | 1) =>
    setCards((all) => {
      const order = all.filter(movable);
      const target = order[order.findIndex((c) => c.key === key) + direction];
      return target ? moveCard(all, key, target.key) : all;
    });

  // shortcut: saves role by role with the existing endpoints, not in one
  // transaction; a failure midway reloads the partly saved state.
  async function saveAll() {
    if (cards.some((c) => editable(c) && c.title.trim().length < 3)) {
      throw new Error(
        'Alle Rollenbezeichnungen müssen mindestens 3 Zeichen lang sein',
      );
    }
    const base = `/alliances/${alliance.id}/roles`;
    const order = cards.filter(movable);
    let next = Math.max(0, ...alliance.roles.map((r) => r.sort));
    const slots = [
      ...order.flatMap((c) => (c.role ? [c.role.sort] : [])),
      ...order.flatMap((c) => (c.role ? [] : [++next])),
    ].sort((a, b) => a - b);
    const sortOf = new Map(order.map((c, i) => [c.key, slots[i]]));
    const kept = new Set(cards.map((c) => c.role?.id));
    let changed = false;
    try {
      for (const role of alliance.roles) {
        if (kept.has(role.id)) continue;
        await api.delete(`${base}/${role.id}`);
        changed = true;
      }
      for (const card of cards) {
        const sort = sortOf.get(card.key);
        if (!card.role) {
          const { id } = await api.post<{ id: number }>(base, {
            title: card.title,
            permissions: card.permissions,
          });
          changed = true;
          if (sort !== undefined) await api.patch(`${base}/${id}`, { sort });
          continue;
        }
        const patch: UpdateAllianceRoleRequest = {};
        if (sort !== undefined && sort !== card.role.sort) patch.sort = sort;
        // Locked roles may only change their place (protection rule).
        if (!editable(card)) {
          if (patch.sort === undefined) continue;
          await api.patch(`${base}/${card.role.id}`, patch);
          changed = true;
          continue;
        }
        if (card.title.trim() !== card.role.title) patch.title = card.title;
        if (
          !card.role.founder &&
          !sameSet(card.permissions, card.role.permissions)
        ) {
          patch.permissions = card.permissions;
        }
        if (Object.keys(patch).length === 0) continue;
        await api.patch(`${base}/${card.role.id}`, patch);
        changed = true;
      }
    } catch (error) {
      if (changed) await reload();
      throw error;
    }
  }

  return (
    <section className="space-y-3 border border-swu-border bg-swu-surface p-4">
      <h2 className="text-sm font-bold text-swu-primary">Allianz Rollen</h2>
      <ul className="space-y-2">
        {cards.map((card) => (
          <RoleCard
            key={card.key}
            card={card}
            held={held}
            busy={busy}
            dragging={dragKey === card.key}
            onChange={(patch) => update(card.key, patch)}
            onDelete={() => {
              if (
                !window.confirm('Möchtest Du diese Rolle wirklich löschen?')
              ) {
                return;
              }
              setCards((all) => all.filter((c) => c.key !== card.key));
            }}
            onDragStart={() => setDragKey(card.key)}
            onDragOver={() => {
              if (dragKey && movable(card)) {
                setCards((all) => moveCard(all, dragKey, card.key));
              }
            }}
            onDragEnd={() => setDragKey(null)}
            onMove={(direction) => move(card.key, direction)}
          />
        ))}
      </ul>
      <div className="flex flex-wrap gap-2 border-t border-swu-border pt-3">
        <button
          type="button"
          disabled={busy}
          className={buttonClass}
          onClick={() => {
            setNewCount(newCount + 1);
            setCards([
              ...cards,
              {
                key: `new-${newCount + 1}`,
                role: null,
                title: '',
                permissions: [],
                open: true,
              },
            ]);
          }}
        >
          Neue Rolle hinzufügen
        </button>
        <button
          type="button"
          disabled={busy}
          className={buttonClass}
          onClick={() => run(saveAll)}
        >
          Rollen speichern
        </button>
      </div>
    </section>
  );
}
