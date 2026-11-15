# Regionskartographie: Frontend und Architekturdokumentation

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** tmw-K8b2

## Ziel

Die Schiffsoberfläche macht Regionskartographie außerhalb von Sternensystemen vollständig bedienbar. ADR, Kontext und bestehende Kartographie-Spec dokumentieren das gemeinsame Zielmodell und die Regionsentdeckung.

## SWU-Pfade

- Schiffsdetail und Kartographiekomponenten unter `apps/frontend/src/`
- Shared-Kartographie-DTOs unter `packages/shared/`
- `docs/adr/0003-messpunktbasierte-systemkartographie.md`
- `.scratch/stu-messpunkt-systemkartographie/spec.md`
- `CONTEXT.md`

## Akzeptanzkriterien

- [x] Auf einem geeigneten Galaxiefeld zeigt die Schiffsoberfläche „Region kartographieren“; außerhalb einer Region oder bei nicht erfüllten Voraussetzungen bleibt die Aktion verborgen beziehungsweise erklärt den serverseitigen Ablehnungsgrund.
- [x] Planung, Messpunktliste, Fortschritt, Start der Finalisierung, Restzeit, Abbruch und Abschluss folgen der bestehenden Systemkartographie-UX mit klarer Regionsbezeichnung.
- [x] Karte und Schiffsansicht aktualisieren den Regionsfortschritt nach erreichten Messpunkten und Abschluss ohne manuelles Neuladen.
- [x] Eine neue Folge-ADR `docs/adr/<nächste freie Nummer>-regionskartographie.md` beschreibt Zielmodell, höchstens fünf Messpunkte, einzige Entdeckungsquelle, Idempotenz, Prestige und Verhältnis zu ADR-0003.
- [x] `CONTEXT.md` definiert „Regionskartographie“ und „Regionsentdeckung“.
- [x] `.scratch/stu-messpunkt-systemkartographie/spec.md` erhält einen Nachtrag, dass das generalisierte Modell Regionen einschließt, ohne historische Systemakzeptanzkriterien umzudeuten.
- [x] Frontend-Tests decken verfügbare und nicht verfügbare Aktion, Planung, Fortschritt, Finalisierung und Abschlussanzeige ab.

## Entscheidung

Das Frontend verwendet denselben typisierten Kartographievertrag für Systeme und Regionen; Regeln werden nicht clientseitig dupliziert.

## Comments
- 2026-11-15: Umgesetzt (ed1899fa). Feldkontext und Schiffsdetail laden den Kartographiestatus auch auf Galaxiefeldern mit Region, nach jedem Feldwechsel neu, damit erreichte Messpunkte und der Abschluss ohne Neuladen erscheinen. Auf einem geeigneten Feld steht „Region kartographieren“ (mit Bestätigungsdialog), sonst „Region nicht kartographiert“ mit dem serverseitigen Ablehnungsgrund. Restpunkte, Finalisierung (`Regionskartographie: n/3`) und Abschluss tragen eine klare Regionsbezeichnung. Die Galaxiekarte markiert verbleibende Regionsmesspunkte, und der kaputte Link `/database/regions/:id` im Regionsdialog führt jetzt auf die Datenbankkategorie „Regionen“. Die ADR-0009 `regionskartographie` dokumentiert die Messpunkte entsprechend der Maintainer-Entscheidung aus tmw-K8b2 (wie STU 25 % zufällig) statt „höchstens fünf“. Dazu kommen die Begriffe „Regionskartographie“ und „Regionsentdeckung“ in `CONTEXT.md` und der Nachtrag in `.scratch/stu-messpunkt-systemkartographie/spec.md`. Frontend-Tests decken verfügbare und abgelehnte Aktion, Verbergen außerhalb von Regionen, Planung, Fortschritt, Finalisierung, Abschluss nach Feldwechsel und die Messpunkte auf der Galaxiekarte ab.
