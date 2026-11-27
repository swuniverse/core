import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SpacecraftDetailDto, StationTradePostDto } from '@swuniverse/shared';
import { formatNumber } from '../../lib/format';
import { api } from '../../services/api';

const inputClass = 'border border-swu-border bg-swu-bg px-1 py-0.5';
const buttonClass = 'border border-swu-border px-2 py-0.5 disabled:opacity-40';

type Notice = { ok: boolean; text: string };

function errorText(reason: unknown, fallback: string): string {
  return reason instanceof Error ? reason.message : fallback;
}

/** Owner box of a station's trade post: data, renaming and license condition (STU station trade post box). */
export function StationTradePostPanel({ ship }: { ship: SpacecraftDetailDto }) {
  const [post, setPost] = useState<StationTradePostDto | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const relevant = ship.kind === 'STATION';

  const load = useCallback(async () => {
    setPost(await api.get<StationTradePostDto | null>(`/trade/stations/${ship.id}/post`));
  }, [ship.id]);

  useEffect(() => {
    if (!relevant) return;
    load().catch((reason: unknown) => setNotice({ ok: false, text: errorText(reason, 'Handelsposten nicht ladbar') }));
  }, [relevant, load]);

  if (!relevant || !post) {
    return notice && !notice.ok ? (
      <p role="alert" className="mt-2 px-3 py-1 text-xs text-red-300">
        {notice.text}
      </p>
    ) : null;
  }

  async function run(action: () => Promise<unknown>, success: string, fallback: string) {
    setNotice(null);
    try {
      await action();
      await load();
      setNotice({ ok: true, text: success });
    } catch (reason: unknown) {
      setNotice({ ok: false, text: errorText(reason, fallback) });
    }
  }

  return (
    <section aria-label="Handelsposten" className="mt-2 border border-swu-border bg-swu-surface text-xs">
      <header className="flex items-center justify-between border-b border-swu-border bg-black/30 px-3 py-2">
        <h2 className="font-bold text-swu-primary">Handelsposten</h2>
        <Link to={`/trade?post=${post.tradePostId}`} className="text-swu-accent hover:underline">
          Zum Handel
        </Link>
      </header>
      {notice && (
        <p role={notice.ok ? 'status' : 'alert'} className={`px-3 py-2 ${notice.ok ? 'text-emerald-300' : 'text-red-300'}`}>
          {notice.text}
        </p>
      )}
      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 border-b border-swu-border/50 px-3 py-2">
        <dt className="text-swu-muted">Name</dt>
        <dd>{post.name}</dd>
        <dt className="text-swu-muted">Netz</dt>
        <dd>{post.networkName}</dd>
        <dt className="text-swu-muted">Lager</dt>
        <dd className="font-mono">
          {formatNumber(post.storage.used)} / {formatNumber(post.storage.capacity)}
        </dd>
        <dt className="text-swu-muted">Lizenz</dt>
        <dd>
          {post.condition
            ? `${formatNumber(post.condition.amount)} ${post.condition.commodityName} für ${post.condition.durationDays} Tage`
            : 'Keine Lizenzvergabe'}
        </dd>
        <dt className="text-swu-muted">Lizenznehmer</dt>
        <dd>{formatNumber(post.licenseeCount)}</dd>
      </dl>
      <RenameForm
        key={`${post.name}\u0000${post.description}`}
        post={post}
        onSubmit={(input) =>
          run(() => api.patch(`/trade/posts/${post.tradePostId}`, input), 'Der Name des Handelspostens wurde geändert', 'Umbenennen fehlgeschlagen')
        }
      />
      <ConditionForm
        post={post}
        onSubmit={(input) =>
          run(() => api.put(`/trade/posts/${post.tradePostId}/license-info`, input), 'Lizenzbedingung gespeichert', 'Speichern fehlgeschlagen')
        }
      />
    </section>
  );
}

function RenameForm({
  post,
  onSubmit,
}: {
  post: StationTradePostDto;
  onSubmit: (input: { name: string; description: string }) => Promise<void>;
}) {
  const [name, setName] = useState(post.name);
  const [description, setDescription] = useState(post.description);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await onSubmit({ name, description });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1 border-b border-swu-border/50 px-3 py-2">
      <label className="flex flex-col">
        <span className="text-swu-muted">Name</span>
        <input value={name} maxLength={40} onChange={(event) => setName(event.target.value)} className={inputClass} />
      </label>
      <label className="flex flex-col">
        <span className="text-swu-muted">Beschreibung</span>
        <textarea
          value={description}
          maxLength={1000}
          rows={2}
          onChange={(event) => setDescription(event.target.value)}
          className={inputClass}
        />
      </label>
      <button type="button" disabled={busy} onClick={() => void submit()} className={buttonClass}>
        Umbenennen
      </button>
    </div>
  );
}

function ConditionForm({
  post,
  onSubmit,
}: {
  post: StationTradePostDto;
  onSubmit: (input: { commodityId: number; amount: number; durationDays: number }) => Promise<void>;
}) {
  const [commodityId, setCommodityId] = useState(post.condition?.commodityId ?? post.tradeableCommodities[0]?.id ?? 0);
  const [amount, setAmount] = useState(post.condition?.amount ?? 10);
  const [durationDays, setDurationDays] = useState(post.condition?.durationDays ?? 30);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await onSubmit({ commodityId, amount, durationDays });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-2 px-3 py-2">
      <label className="flex flex-col">
        <span className="text-swu-muted">Ware</span>
        <select value={commodityId} onChange={(event) => setCommodityId(Number(event.target.value))} className={inputClass}>
          {post.tradeableCommodities.map((commodity) => (
            <option key={commodity.id} value={commodity.id}>
              {commodity.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col">
        <span className="text-swu-muted">Menge</span>
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(event) => setAmount(Number(event.target.value))}
          className={`w-20 ${inputClass}`}
        />
      </label>
      <label className="flex flex-col">
        <span className="text-swu-muted">Tage</span>
        <input
          type="number"
          min={1}
          max={365}
          value={durationDays}
          onChange={(event) => setDurationDays(Number(event.target.value))}
          className={`w-20 ${inputClass}`}
        />
      </label>
      <button type="button" disabled={busy} onClick={() => void submit()} className={buttonClass}>
        Bedingung speichern
      </button>
    </div>
  );
}
