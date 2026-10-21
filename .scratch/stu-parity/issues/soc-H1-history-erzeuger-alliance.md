# Globale History: Erzeuger ALLIANCE

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

In STU erzeugen Kriegserklärungen, Vertragsabschlüsse, Kündigungen und Siedler-Abkommen globale History-Einträge. SWU führt diese Ereignisse in der **Diplomatie-Chronik** je Allianz/Partei; der History-Typ ALLIANCE ist im Filter von `/events` sichtbar, aber immer leer. Dieses Issue spiegelt öffentliche Diplomatie-Ereignisse in die globale History, falls gewünscht.

## STU-Quellen

- `src/Component/History/Event/HistoryEntrySubscriber.php`
- `src/Component/Player/Relation/UserRelationHistory.php`
- `src/Module/Alliance/Action/AcceptOffer`, `CancelContract`

## SWU-Pfade

- `apps/backend/src/modules/events/game-event.service.ts` (neue Methode, z. B. `recordAlliance`)
- `apps/backend/src/modules/alliance/alliance.service.ts` (`appendPartyChronicleEntry`, `appendAllianceChronicle`), `typeorm-alliance.store.ts#appendDiplomacyChronicleEntry`
- `packages/shared/src/lib/common/index.ts` (`GameEventType.ALLIANCE`)
- `apps/frontend/src/pages/events.tsx`

## Akzeptanzkriterien

- [ ] Kriegserklärung, Friedensschluss, Vertragsabschluss und Kündigung (Allianzen und Siedler-Abkommen) erzeugen in derselben Transaktion wie der Chronik-Eintrag einen `GameEvent` vom Typ ALLIANCE mit Parteinamen.
- [ ] `/events` zeigt sie im Filter ALLIANCE.
- [ ] Backend-Tests je Ereignistyp; Frontend-Test für den Filter.

## Entscheidung

Vorgabe: Variante (a). Alle Beziehungswechsel zwischen Parteien (Kriegserklärung, Friedensschluss, Vertragsabschluss, Kündigung; Allianzen und Siedler-Abkommen) erscheinen zusätzlich als `GameEvent` vom Typ ALLIANCE in `/events`. Die Diplomatie-Chronik bleibt bestehen.

## Comments

- 2026-10-21 Product Owner: Option a – Öffentliche Diplomatie-Ereignisse werden wie in STU zusätzlich als ALLIANCE-Ereignis in die globale History gespiegelt.
