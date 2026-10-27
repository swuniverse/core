import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { formatDateTime } from '../lib/format';
import type { Faction } from '@swuniverse/shared';

const AVAILABLE_PERMISSIONS = ['MAP_EDITOR'] as const;

interface UserEntry {
  id: number;
  username: string;
  isAdmin: boolean;
  isNpc: boolean;
  description: string | null;
  permissions: string[];
  faction: Faction | null;
  createdAt: string;
  lastActiveAt: string | null;
  vacationMode: boolean;
  deletionMark: number;
  lock: { remainingTicks: number; reason: string } | null;
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [lockUser, setLockUser] = useState<UserEntry | null>(null);
  const [ticks, setTicks] = useState('1');
  const [reason, setReason] = useState('');

  useEffect(() => {
    api.get<UserEntry[]>('/auth/admin/users').then((data) => {
      setUsers(data);
      setLoading(false);
    });
  }, []);

  async function updateNpc(user: UserEntry) {
    await api.patch(`/auth/admin/users/${user.id}`, {
      username: user.username,
      description: user.description,
    });
  }

  async function togglePermission(user: UserEntry, permission: string) {
    const updated = user.permissions.includes(permission)
      ? user.permissions.filter((item) => item !== permission)
      : [...user.permissions, permission];
    await api.patch(`/auth/admin/users/${user.id}/permissions`, { permissions: updated });
    setUsers((previous) => previous.map((item) => item.id === user.id ? { ...item, permissions: updated } : item));
  }

  async function submitLock() {
    if (!lockUser) return;
    const value = { ticks: Number(ticks), reason };
    await api.post(`/auth/admin/users/${lockUser.id}/lock`, value);
    setUsers((previous) => previous.map((item) => item.id === lockUser.id ? { ...item, lock: { remainingTicks: value.ticks, reason: value.reason } } : item));
    setLockUser(null);
  }

  async function unlock(user: UserEntry) {
    await api.delete(`/auth/admin/users/${user.id}/lock`);
    setUsers((previous) => previous.map((item) => item.id === user.id ? { ...item, lock: null } : item));
  }

  if (loading) return <p className="p-6 text-swu-muted">Lade...</p>;
  const normalizedQuery = query.trim().toLowerCase();
  const visibleUsers = users.filter((user) => !normalizedQuery || String(user.id) === normalizedQuery || user.username.toLowerCase().includes(normalizedQuery));

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-bold text-swu-primary">Spielerliste</h1>
      <label className="mb-3 block text-xs text-swu-muted">
        Spieler suchen
        <input className="ml-2 border border-swu-border bg-swu-bg px-2 py-1 text-swu-text" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead><tr className="bg-black/40 text-center font-bold text-swu-primary">
            {['ID', 'Spieler', 'Fraktion', 'Registriert', 'Letzte Aktivität', 'Status', 'MAP_EDITOR', 'Aktion'].map((label) => <th key={label} className="border border-swu-border px-1.5 py-1">{label}</th>)}
          </tr></thead>
          <tbody>{visibleUsers.map((user) => (
            <tr key={user.id} className="hover:bg-white/5">
              <td className="border border-swu-border px-1.5 py-1 text-right font-mono">{user.id}</td>
              <td className="border border-swu-border px-1.5 py-1 text-swu-primary">
                {user.isNpc ? <div className="grid gap-1"><input aria-label={`Name für ${user.username}`} value={user.username} onChange={(event) => setUsers((previous) => previous.map((item) => item.id === user.id ? { ...item, username: event.target.value } : item))} /><textarea aria-label={`Beschreibung für ${user.username}`} value={user.description ?? ''} onChange={(event) => setUsers((previous) => previous.map((item) => item.id === user.id ? { ...item, description: event.target.value } : item))} /><button type="button" onClick={() => void updateNpc(user)}>NPC speichern</button></div> : user.username}
              </td>
              <td className="border border-swu-border px-1.5 py-1">{user.faction ?? '—'}</td>
              <td className="border border-swu-border px-1.5 py-1">{formatDateTime(user.createdAt)}</td>
              <td className="border border-swu-border px-1.5 py-1">{user.lastActiveAt ? formatDateTime(user.lastActiveAt) : '—'}</td>
              <td className="border border-swu-border px-1.5 py-1">{user.isAdmin ? 'Admin' : user.isNpc ? 'NPC' : user.lock ? `Gesperrt (${user.lock.remainingTicks}): ${user.lock.reason}` : user.vacationMode ? 'Urlaub' : user.deletionMark ? `Löschmarke ${user.deletionMark}` : 'Aktiv'}</td>
              <td className="border border-swu-border px-1.5 py-1 text-center">{AVAILABLE_PERMISSIONS.map((permission) => <input key={permission} type="checkbox" checked={user.isAdmin || user.permissions.includes(permission)} disabled={user.isAdmin} onChange={() => void togglePermission(user, permission)} />)}</td>
              <td className="border border-swu-border px-1.5 py-1 text-center">{!user.isAdmin && (user.lock ? <button type="button" onClick={() => void unlock(user)}>Entsperren</button> : <button type="button" onClick={() => { setLockUser(user); setTicks('1'); setReason(''); }}>Sperren</button>)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {lockUser && <div role="dialog" aria-modal="true" className="fixed inset-0 grid place-items-center bg-black/70"><div className="w-96 border border-swu-border bg-swu-surface p-4"><h2 className="mb-3 text-swu-primary">{lockUser.username} sperren</h2><label className="block text-xs">Anzahl Ticks<input aria-label="Anzahl Ticks" type="number" min="1" className="mt-1 w-full border border-swu-border bg-swu-bg p-2" value={ticks} onChange={(event) => setTicks(event.target.value)} /></label><label className="mt-3 block text-xs">Begründung<textarea aria-label="Begründung" maxLength={500} className="mt-1 h-28 w-full border border-swu-border bg-swu-bg p-2" value={reason} onChange={(event) => setReason(event.target.value)} /></label><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setLockUser(null)}>Abbrechen</button><button type="button" disabled={Number(ticks) < 1 || !reason.trim()} onClick={() => void submitLock()}>Sperre setzen</button></div></div></div>}
    </div>
  );
}
