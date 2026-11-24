import { useEffect, useState } from 'react';
import {
  Faction,
  type AdminBroadcastAudienceDto,
  type AdminBroadcastResultDto,
  type AdminBroadcastTarget,
  type AdminBroadcastMedium,
} from '@swuniverse/shared';
import { BbCodeText } from '../components/BbCodeText';
import { PageHeader } from '../components/PageHeader';
import { getErrorMessage } from '../lib/errors';
import { api } from '../services/api';

const TARGET_LABELS: Record<AdminBroadcastTarget, string> = {
  ALL: 'Alle Spieler',
  [Faction.REBEL_ALLIANCE]: 'Rebellenallianz',
  [Faction.GALACTIC_EMPIRE]: 'Galaktisches Imperium',
};

const inputClass = 'mt-1 w-full border border-swu-border bg-swu-bg p-2 text-swu-text';

export function AdminMassMessagePage() {
  const [broadcastId, setBroadcastId] = useState(() => crypto.randomUUID());
  const [target, setTarget] = useState<AdminBroadcastTarget>('ALL');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [medium, setMedium] = useState<AdminBroadcastMedium>('PM');
  const [audience, setAudience] = useState<AdminBroadcastAudienceDto | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<(AdminBroadcastResultDto & { medium: AdminBroadcastMedium }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAudience(null);
    api
      .get<AdminBroadcastAudienceDto>(`/messages/admin/broadcast/audience?target=${target}`)
      .then((next) => {
        setAudience(next);
      })
      .catch((reason) => setError(getErrorMessage(reason, 'Empfänger konnten nicht ermittelt werden.')));
  }, [target]);

  const valid = subject.trim().length >= 1 && subject.trim().length <= 255 && body.trim().length >= 5;

  async function send() {
    setSending(true);
    setError(null);
    try {
      const sent = await api.post<AdminBroadcastResultDto>('/messages/admin/broadcast', {
        broadcastId,
        subject: subject.trim(),
        body: body.trim(),
        target,
        medium,
      });
      setResult({ ...sent, medium });
      setSubject('');
      setBody('');
      setBroadcastId(crypto.randomUUID());
    } catch (reason) {
      setError(getErrorMessage(reason, 'Die Nachricht konnte nicht verschickt werden.'));
    } finally {
      setSending(false);
      setConfirming(false);
    }
  }

  return (
    <main className="space-y-4 p-4 sm:p-6">
      <PageHeader segments={[{ label: 'Admin', to: '/admin' }, { label: 'Massennachricht' }]} />
      {result && (
        <p role="status" className="border border-swu-positive px-3 py-2 text-sm text-swu-positive">
          {result.medium === 'EMAIL' ? `${result.emailsSent} von ${result.recipients} E-Mails versendet.` : `Persönliche Nachricht an ${result.recipients} Spieler verschickt.`}
        </p>
      )}
      {error && <p role="alert" className="border border-swu-negative px-3 py-2 text-sm text-swu-negative">{error}</p>}
      <section className="grid gap-4 border border-swu-border bg-swu-surface/70 p-4 lg:grid-cols-2">
        <div className="space-y-3">
          <label className="block text-xs text-swu-muted">
            Zielgruppe
            <select className={inputClass} value={target} onChange={(event) => setTarget(event.target.value as AdminBroadcastTarget)}>
              {(Object.keys(TARGET_LABELS) as AdminBroadcastTarget[]).map((key) => (
                <option key={key} value={key}>{TARGET_LABELS[key]}</option>
              ))}
            </select>
          </label>
          <p className="text-xs text-swu-muted">
            {audience
              ? `${audience.recipients} Spieler, davon ${audience.emailRecipients} mit E-Mail-Adresse`
              : 'Ermittle Empfänger …'}
          </p>
          <label className="block text-xs text-swu-muted">
            Betreff
            <input className={inputClass} maxLength={255} value={subject} onChange={(event) => setSubject(event.target.value)} />
          </label>
          <label className="block text-xs text-swu-muted">
            Nachricht
            <textarea className={`${inputClass} h-48`} value={body} onChange={(event) => setBody(event.target.value)} />
          </label>
          <label className="block text-xs text-swu-muted">
            Versandmedium
            <select className={inputClass} value={medium} onChange={event => setMedium(event.target.value as AdminBroadcastMedium)}>
              <option value="PM">Persönliche Nachricht</option>
              <option value="EMAIL">E-Mail</option>
            </select>
          </label>
          <button
            type="button"
            className="border border-swu-primary px-3 py-1 text-swu-primary disabled:opacity-50"
            disabled={!valid || !audience || (medium === 'EMAIL' ? audience.emailRecipients : audience.recipients) === 0 || sending}
            onClick={() => setConfirming(true)}
          >
            Nachricht senden
          </button>
        </div>
        <div>
          <h2 className="mb-2 text-xs font-bold text-swu-primary">Vorschau</h2>
          <div className="min-h-48 border border-swu-border bg-swu-bg p-3 text-sm">
            <p className="mb-2 font-bold">{medium === 'PM' ? `Betreff: ${subject}` : subject || 'Betreff'}</p>
            <BbCodeText text={body} />
          </div>
        </div>
      </section>
      {confirming && audience && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 grid place-items-center bg-black/70">
          <div className="w-96 border border-swu-border bg-swu-surface p-4">
            <h2 className="text-swu-primary">An {medium === 'EMAIL' ? audience.emailRecipients : audience.recipients} Spieler senden?</h2>
            <p className="my-3 text-sm text-swu-muted">
              {TARGET_LABELS[target]}
              {medium === 'EMAIL' ? ', per E-Mail' : ', als persönliche Nachricht'}
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirming(false)}>Abbrechen</button>
              <button type="button" disabled={sending} onClick={() => void send()}>Jetzt senden</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
