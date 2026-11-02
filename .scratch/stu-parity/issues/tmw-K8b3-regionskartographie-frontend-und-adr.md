# Regionskartographie: Frontend und Architekturdokumentation

**Status:** ready-for-agent
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

- [ ] Auf einem geeigneten Galaxiefeld zeigt die Schiffsoberfläche „Region kartographieren“; außerhalb einer Region oder bei nicht erfüllten Voraussetzungen bleibt die Aktion verborgen beziehungsweise erklärt den serverseitigen Ablehnungsgrund.
- [ ] Planung, Messpunktliste, Fortschritt, Start der Finalisierung, Restzeit, Abbruch und Abschluss folgen der bestehenden Systemkartographie-UX mit klarer Regionsbezeichnung.
- [ ] Karte und Schiffsansicht aktualisieren den Regionsfortschritt nach erreichten Messpunkten und Abschluss ohne manuelles Neuladen.
- [ ] Eine neue Folge-ADR `docs/adr/<nächste freie Nummer>-regionskartographie.md` beschreibt Zielmodell, höchstens fünf Messpunkte, einzige Entdeckungsquelle, Idempotenz, Prestige und Verhältnis zu ADR-0003.
- [ ] `CONTEXT.md` definiert „Regionskartographie“ und „Regionsentdeckung“.
- [ ] `.scratch/stu-messpunkt-systemkartographie/spec.md` erhält einen Nachtrag, dass das generalisierte Modell Regionen einschließt, ohne historische Systemakzeptanzkriterien umzudeuten.
- [ ] Frontend-Tests decken verfügbare und nicht verfügbare Aktion, Planung, Fortschritt, Finalisierung und Abschlussanzeige ab.

## Entscheidung

Das Frontend verwendet denselben typisierten Kartographievertrag für Systeme und Regionen; Regeln werden nicht clientseitig dupliziert.
