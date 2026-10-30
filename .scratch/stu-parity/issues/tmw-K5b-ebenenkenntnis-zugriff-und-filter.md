# Ebenenkenntnis: Zugriff und Datenbankfilter

**Status:** needs-info
**Priority:** P2
**Size:** S
**Blocked by:** tmw-K5a

## Ziel

Spieler können Karten- und Datenbankdaten nur für bekannte Ebenen abrufen. Administratoren und Karteneditoren behalten vollständigen Zugriff.

## STU-Quellen

- `src/Module/Starmap/View/ShowSection/*` (`hasSeen`, unbekannt → Zugriff verweigert)
- `src/Module/Starmap/View/ShowUserStarmap{Data,Image,Realtime}/*`
- `src/Orm/Repository/LayerRepository.php#getKnownByUser`
- `src/Module/Database/View/Category/*`

## SWU-Pfade

- `apps/backend/src/modules/starmap/starmap.controller.ts`, `starmap.service.ts`, `starmap-query.service.ts`
- `apps/backend/src/modules/database/`
- `apps/frontend/src/pages/starmap.tsx`, `apps/frontend/src/pages/database.tsx`

## Akzeptanzkriterien

- [ ] `GET starmap/layers` liefert Spielern ausschließlich bekannte, nicht versteckte Ebenen; Administratoren und Karteneditoren sehen weiterhin alle für ihre Rolle vorgesehenen Ebenen.
- [ ] Alle spielerseitigen `layers/:layerId/*`-Endpunkte prüfen die Ebenenkenntnis zentral und antworten für eine unbekannte Ebene mit HTTP 403.
- [ ] Die Prüfung umfasst mindestens Felder, Sektoren, Systeme, Hyperraumrouten, Wurmlöcher und persönliche Erkundungsdaten; indirekte Systemzugriffe umgehen sie nicht.
- [ ] Datenbankfilter für Sternensysteme, Systemtypen und Planetentypen bieten nur bekannte Ebenen an und lehnen eine explizit unbekannte Ebenen-ID ab.
- [ ] Der Status `KNOWN` genügt für den Zugriff; `EXPLORED` ist keine zusätzliche Autorisierungsvoraussetzung.
- [ ] Frontend-Auswahlfelder zeigen nur die vom Backend gelieferten bekannten Ebenen.
- [ ] Backend-Tests decken jeden Endpunkttyp, HTTP 403 und Rollen-Bypass ab; Frontend-Tests decken die gefilterten Ebenenauswahlen ab.

## Entscheidung

SWU wendet die STU-`hasSeen`-Semantik konsistent an. Anders als gemischte STU-Datenbankansichten dürfen keine Karten- oder Datenbankpfade unbekannte Ebenen offenlegen.

## Comments

- 2026-10-30: Backend-Zugriffsschutz und Datenbank-Ebenenfilter wurden umgesetzt; fokussierte Tests (19/19) sowie alle Builds sind grün. Der verpflichtende Gesamt-Gate bleibt jedoch nach zwei Versuchen an drei fachfremden bestehenden Typecheck-Fehlern in `wreck-decay.service.spec.ts` und `tutorial.service.spec.ts` (TS2554, dokumentiert in sh-AP-23) rot. Produktcode wurde gemäß Abbruchregel verworfen. Bitte nach Behebung der Baseline erneut auf `ready-for-agent` setzen.
