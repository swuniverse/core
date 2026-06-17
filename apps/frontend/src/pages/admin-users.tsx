import { useEffect, useState } from 'react';
import { api } from '../services/api';

const AVAILABLE_PERMISSIONS = ['MAP_EDITOR'] as const;

interface UserEntry {
  id: number;
  username: string;
  isAdmin: boolean;
  permissions: string[];
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<UserEntry[]>('/auth/admin/users').then((data) => {
      setUsers(data);
      setLoading(false);
    });
  }, []);

  async function togglePermission(user: UserEntry, perm: string) {
    const has = user.permissions.includes(perm);
    const updated = has
      ? user.permissions.filter((p) => p !== perm)
      : [...user.permissions, perm];
    await api.patch(`/auth/admin/users/${user.id}/permissions`, {
      permissions: updated,
    });
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, permissions: updated } : u)),
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-swu-primary">Benutzerrechte</h1>
        <p className="mt-4 text-swu-muted">Lade...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-swu-primary mb-4">Benutzerrechte</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-swu-muted border-b border-swu-border">
            <th className="py-2 px-2">User</th>
            <th className="py-2 px-2">Admin</th>
            {AVAILABLE_PERMISSIONS.map((p) => (
              <th key={p} className="py-2 px-2">{p}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-swu-border/50">
              <td className="py-2 px-2 text-swu-primary">{user.username}</td>
              <td className="py-2 px-2">
                {user.isAdmin && (
                  <span className="text-xs bg-swu-accent/20 text-swu-accent rounded px-1">
                    Admin
                  </span>
                )}
              </td>
              {AVAILABLE_PERMISSIONS.map((perm) => (
                <td key={perm} className="py-2 px-2">
                  <input
                    type="checkbox"
                    checked={user.isAdmin || user.permissions.includes(perm)}
                    disabled={user.isAdmin}
                    onChange={() => void togglePermission(user, perm)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
