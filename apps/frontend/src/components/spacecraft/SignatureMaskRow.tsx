import { useEffect, useState } from 'react';
import type { SignatureMaskDto } from '@swuniverse/shared';
import { api } from '../../services/api';

/** STU `control_right.twig` "Warp-Signatur fälschen", in SWU terms below the hyperdrive. */
export function SignatureMaskRow({
  shipId,
  onRefresh,
}: {
  shipId: number;
  onRefresh: () => void;
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
      .catch(() => alive && setMenu(null));
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [path]);
  if (!menu) return null;
  const remaining = menu.active
    ? Math.max(0, Math.ceil((Date.parse(menu.active.expiresAt) - now) / 1000))
    : 0;
  async function change(deactivate: boolean) {
    setBusy(true);
    setError('');
    try {
      setMenu(
        deactivate
          ? await api.delete<SignatureMaskDto>(path)
          : await api.post<SignatureMaskDto>(path, {
              shipClassId: Number(selected),
            }),
      );
      setNow(Date.now());
      onRefresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Hyperantrieb-Signatur konnte nicht geändert werden',
      );
    } finally {
      setBusy(false);
    }
  }
  const button =
    'border border-swu-border bg-swu-surface px-2 py-0.5 text-[10px] hover:bg-white/5 disabled:opacity-40';
  return (
    <>
      <div className="flex flex-wrap items-center gap-1 p-2">
        <select
          aria-label="Signaturrumpf"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          disabled={busy}
          className="border border-swu-border bg-swu-bg px-1 py-0.5 text-xs"
        >
          {menu.choices.map((item) => (
            <option key={item.shipClassId} value={item.shipClassId}>
              {item.name} – {item.epsCost} EPS
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy || !selected}
          onClick={() => void change(false)}
          className={button}
        >
          Hyperantrieb-Signatur fälschen
        </button>
        {error && (
          <span role="alert" className="w-full text-[11px] text-red-300">
            {error}
          </span>
        )}
      </div>
      {menu.active && remaining > 0 && (
        <div className="flex items-center justify-center gap-2 p-2">
          <span role="status">
            Aktive Hyperantrieb-Signatur: {menu.active.name} (
            {Math.floor(remaining / 60)}:
            {String(remaining % 60).padStart(2, '0')})
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void change(true)}
            className={button}
          >
            beenden
          </button>
        </div>
      )}
    </>
  );
}
