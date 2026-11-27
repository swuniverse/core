import { useEffect, useState, type FormEvent } from 'react';
import {
  ALLIANCE_PERMISSION_PARENT,
  AlliancePermission as P,
  grantsAlliancePermission,
  type AllianceDetailDto,
  type AllianceRoleDto,
  type CreateAllianceRoleRequest,
  type UpdateAllianceRoleRequest,
} from '@swuniverse/shared';
import { api } from '../../services/api';

const inputClass =
  'w-full border border-swu-border bg-swu-bg px-2 py-1 text-sm text-swu-text focus:border-swu-accent focus:outline-none';
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
  [P.EDIT_DIPLOMATIC_DOCUMENTS]: 'Kann diplomatische Vertragswerke bearbeiten',
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

/** STU `getPermissionGroup`; children follow `ALLIANCE_PERMISSION_PARENT`. */
const PERMISSION_GROUPS = [
  { title: 'Verwaltungsrechte', parent: P.SUCCESSOR },
  { title: 'Diplomatische Rechte', parent: P.DIPLOMATIC },
].map((group) => ({
  ...group,
  children: (Object.keys(ALLIANCE_PERMISSION_PARENT) as P[]).filter(
    (p) => ALLIANCE_PERMISSION_PARENT[p] === group.parent,
  ),
}));

type Run = (action: () => Promise<unknown>) => void;

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
      className={`flex items-center gap-1.5 text-xs ${parent ? 'pl-4' : 'font-bold'}`}
      title={missing ? 'Dieses Recht besitzt Du selbst nicht' : undefined}
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
      {included && <span className="text-swu-muted">(enthalten)</span>}
      {missing && !included && (
        <span className="text-swu-muted">(fehlt Dir)</span>
      )}
    </label>
  );
}

function PermissionFields({
  value,
  held,
  locked,
  onChange,
}: {
  value: readonly P[];
  held: readonly P[];
  locked: boolean;
  onChange: (next: P[]) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {PERMISSION_GROUPS.map((group) => (
        <fieldset key={group.parent} className="space-y-0.5">
          <legend className="text-[10px] uppercase tracking-wider text-swu-muted">
            {group.title}
          </legend>
          {[group.parent, ...group.children].map((permission) => (
            <PermissionCheckbox
              key={permission}
              permission={permission}
              value={value}
              held={held}
              locked={locked}
              onChange={onChange}
            />
          ))}
        </fieldset>
      ))}
    </div>
  );
}

function RoleRow({
  allianceId,
  role,
  memberCount,
  held,
  busy,
  run,
  up,
  down,
}: {
  allianceId: number;
  role: AllianceRoleDto;
  memberCount: number;
  held: readonly P[];
  busy: boolean;
  run: Run;
  /** Neighbours to swap places with; null when the move is not allowed. */
  up: AllianceRoleDto | null;
  down: AllianceRoleDto | null;
}) {
  const [title, setTitle] = useState(role.title);
  const [permissions, setPermissions] = useState<P[]>(role.permissions);
  useEffect(() => {
    setTitle(role.title);
    setPermissions(role.permissions);
  }, [role]);

  const base = `/alliances/${allianceId}/roles`;
  const rightsChanged =
    permissions.length !== role.permissions.length ||
    permissions.some((p) => !role.permissions.includes(p));
  const changed = title.trim() !== role.title || rightsChanged;
  const swap = (other: AllianceRoleDto) =>
    run(async () => {
      await api.patch(`${base}/${role.id}`, { sort: other.sort });
      await api.patch(`${base}/${other.id}`, { sort: role.sort });
    });

  return (
    <li className="space-y-2 py-3">
      <fieldset aria-label={`Rolle ${role.title}`} className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            aria-label={`Titel der Rolle ${role.title}`}
            value={title}
            maxLength={30}
            disabled={!role.actions.edit || busy}
            onChange={(e) => setTitle(e.target.value)}
            className={`${inputClass} max-w-xs flex-1`}
          />
          <span className="text-xs text-swu-muted">
            {memberCount} {memberCount === 1 ? 'Mitglied' : 'Mitglieder'}
          </span>
          <span className="ml-auto flex flex-wrap gap-1">
            <button
              type="button"
              aria-label={`${role.title} nach oben`}
              disabled={busy || !up}
              className={buttonClass}
              onClick={() => up && swap(up)}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`${role.title} nach unten`}
              disabled={busy || !down}
              className={buttonClass}
              onClick={() => down && swap(down)}
            >
              ↓
            </button>
            {role.actions.edit && (
              <button
                type="button"
                disabled={busy || !changed}
                className={buttonClass}
                onClick={() => {
                  const patch: UpdateAllianceRoleRequest = {};
                  if (title.trim() !== role.title) patch.title = title;
                  if (rightsChanged) patch.permissions = permissions;
                  run(() => api.patch(`${base}/${role.id}`, patch));
                }}
              >
                Speichern
              </button>
            )}
            {role.actions.delete && (
              <button
                type="button"
                disabled={busy}
                className={dangerButtonClass}
                onClick={() => {
                  if (!window.confirm(`Die Rolle ${role.title} löschen?`)) {
                    return;
                  }
                  run(() => api.delete(`${base}/${role.id}`));
                }}
              >
                Löschen
              </button>
            )}
          </span>
        </div>
        {role.founder ? (
          <p className="text-xs text-swu-muted">
            Präsident: alle Rechte, genau ein Inhaber. Die Rolle ist nicht
            löschbar; übergeben wird sie in der Mitgliederverwaltung.
          </p>
        ) : (
          <>
            <PermissionFields
              value={permissions}
              held={held}
              locked={!role.actions.edit || busy}
              onChange={setPermissions}
            />
            {!role.actions.edit && (
              <p className="text-xs text-swu-muted">
                Du kannst diese Rolle nicht ändern: Sie enthält Rechte oder
                Inhaber, die Du nicht verwalten darfst.
              </p>
            )}
          </>
        )}
      </fieldset>
    </li>
  );
}

/** STU „Rollen“ (`ally.js`, `SaveJobs`) with the protection rule of ADR 0001. */
export function AllianceRolesEditor({
  alliance,
  busy,
  run,
}: {
  alliance: AllianceDetailDto;
  busy: boolean;
  run: Run;
}) {
  const [draft, setDraft] = useState<CreateAllianceRoleRequest>({
    title: '',
    permissions: [],
  });
  const held = alliance.viewer.permissions ?? [];
  const roles = [...alliance.roles].sort((a, b) => a.sort - b.sort);
  // The founder role stays first; both swapped roles must be editable.
  const movable = (role: AllianceRoleDto | undefined) =>
    role && !role.founder && role.actions.edit ? role : null;

  function create(event: FormEvent) {
    event.preventDefault();
    run(async () => {
      await api.post(`/alliances/${alliance.id}/roles`, draft);
      setDraft({ title: '', permissions: [] });
    });
  }

  return (
    <section className="space-y-2 border border-swu-border bg-swu-surface p-4">
      <h2 className="text-sm font-bold text-swu-primary">Rollen</h2>
      <ul className="divide-y divide-swu-border/40">
        {roles.map((role, index) => (
          <RoleRow
            key={role.id}
            allianceId={alliance.id}
            role={role}
            memberCount={
              alliance.members.filter((m) =>
                m.roles.some((r) => r.id === role.id),
              ).length
            }
            held={held}
            busy={busy}
            run={run}
            up={movable(role) && movable(roles[index - 1])}
            down={movable(role) && movable(roles[index + 1])}
          />
        ))}
      </ul>
      <form
        onSubmit={create}
        aria-label="Neue Rolle"
        className="space-y-2 border-t border-swu-border pt-3"
      >
        <h3 className="text-xs font-bold text-swu-primary">Neue Rolle</h3>
        <input
          aria-label="Titel der neuen Rolle"
          value={draft.title}
          maxLength={30}
          placeholder="Titel, 3 bis 30 Zeichen"
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          className={`${inputClass} max-w-xs`}
        />
        <PermissionFields
          value={draft.permissions}
          held={held}
          locked={busy}
          onChange={(permissions) => setDraft({ ...draft, permissions })}
        />
        <button
          type="submit"
          disabled={busy || draft.title.trim() === ''}
          className={buttonClass}
        >
          Rolle anlegen
        </button>
      </form>
    </section>
  );
}
