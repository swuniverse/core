import { useEffect, useState } from 'react';
import type { SignatureMaskDto } from '@swuniverse/shared';
import { api } from '../../services/api';

export function SignatureMaskButton({
  shipId,
  available,
  onRefresh,
}: {
  shipId: number;
  available?: boolean;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!available) return null;
  return (
    <>
      <button
        type="button"
        aria-label="Signaturmaskierung öffnen"
        title="Signaturmaskierung"
        className="rounded border border-swu-border bg-black/30 px-2 py-1 text-xs hover:border-swu-accent"
        onClick={() => setOpen(true)}
      >
        Signatur
      </button>
      {open && (
        <SignatureMaskDialog
          shipId={shipId}
          onRefresh={onRefresh}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
function SignatureMaskDialog({
  shipId,
  onRefresh,
  onClose,
}: {
  shipId: number;
  onRefresh: () => void;
  onClose: () => void;
}) {
  const [menu, setMenu] = useState<SignatureMaskDto | null>(null);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const path = `/spacecraft/${shipId}/signature-mask`;
  useEffect(() => {
    let alive = true;
    api
      .get<SignatureMaskDto>(path)
      .then((data) => {
        if (!alive) return;
        setMenu(data);
        setSelected(String(data.choices[0]?.shipClassId ?? ''));
      })
      .catch((reason: unknown) => {
        if (alive)
          setError(
            reason instanceof Error
              ? reason.message
              : 'Signaturmaskierung konnte nicht geladen werden',
          );
      });
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [path]);
  const choice = menu?.choices.find(
    (item) => String(item.shipClassId) === selected,
  );
  const remaining = menu?.active
    ? Math.max(0, Math.ceil((Date.parse(menu.active.expiresAt) - now) / 1000))
    : 0;
  async function change(deactivate: boolean) {
    setBusy(true);
    setError('');
    try {
      const data = deactivate
        ? await api.delete<SignatureMaskDto>(path)
        : await api.post<SignatureMaskDto>(path, {
            shipClassId: Number(selected),
          });
      setMenu(data);
      setNow(Date.now());
      onRefresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Signaturmaskierung konnte nicht geändert werden',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Signaturmaskierung"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-swu-border bg-swu-bg p-4 text-sm text-swu-text">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-swu-primary">Signaturmaskierung</h2>
          <button type="button" autoFocus onClick={onClose}>
            Schließen
          </button>
        </div>
        <p className="mb-3">
          Neue Flugsignaturen zeigen fünf Minuten lang den gewählten Rumpf.
        </p>
        {error && (
          <p role="alert" className="mb-2 text-swu-negative">
            {error}
          </p>
        )}
        {!menu && !error && <p>Laden…</p>}
        {menu && (
          <>
            <p className="mb-2" role="status">
              {remaining && menu.active
                ? `${menu.active.name} · ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')} verbleibend`
                : 'Keine aktive Maskierung'}
            </p>
            <label className="block">
              Signaturrumpf
              <select
                aria-label="Signaturrumpf"
                className="mb-2 mt-1 w-full rounded border border-swu-border bg-swu-bg p-2"
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
                disabled={busy}
              >
                {menu.choices.map((item) => (
                  <option key={item.shipClassId} value={item.shipClassId}>
                    {item.name} – {item.epsCost} EPS
                  </option>
                ))}
              </select>
            </label>
            {!menu.choices.length && <p>Keine geeigneten entdeckten Rümpfe.</p>}
            <p className="mb-2">Verfügbar: {menu.energy} EPS</p>
            {menu.blockReason && (
              <p className="mb-2 text-swu-muted">{menu.blockReason}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={
                  busy ||
                  !!menu.blockReason ||
                  !choice ||
                  menu.energy < choice.epsCost
                }
                className="rounded border border-swu-border px-2 py-1 disabled:opacity-40"
                onClick={() => void change(false)}
              >
                Aktivieren{choice ? ` (${choice.epsCost} EPS)` : ''}
              </button>
              {remaining > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  className="rounded border border-swu-border px-2 py-1"
                  onClick={() => void change(true)}
                >
                  Deaktivieren
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
