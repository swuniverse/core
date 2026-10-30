# Ebenenkenntnis: Bekanntwerden beim Onboarding und Positionswechsel

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** tmw-K5a

## Ziel

Die Startebene wird beim Onboarding bekannt. Weitere Ebenen werden unmittelbar bekannt, sobald ein eigenes Schiff sie tatsächlich erreicht.

## STU-Quellen

- `src/Component/Player/Register/PlayerDefaultsCreator.php#createDefaultUserLayer`
- `src/Module/Spacecraft/View/ShowSpacecraft/ShowSpacecraft.php#createUserLayerIfNecessary`
- `src/Module/Spacecraft/Lib/Ui/PanelLayerConfiguration.php`

## SWU-Pfade

- `apps/backend/src/modules/onboarding/onboarding.service.ts`
- Autoritative Positionswechsel in `apps/backend/src/modules/spacecraft/`
- Wurmlochflug aus `tmw-K7a`
- Ebenenkenntnis-Service aus `tmw-K5a`

## Akzeptanzkriterien

- [ ] Der erfolgreiche Abschluss der Fraktions- beziehungsweise Heimatweltwahl legt die Startebene idempotent als `KNOWN` an.
- [ ] Jeder erfolgreiche Positionswechsel, bei dem ein eigenes Schiff eine andere Ebene erreicht, legt diese Ebene in derselben fachlichen Operation idempotent als `KNOWN` an.
- [ ] Das gilt für Galaxieflug und nach Umsetzung von `tmw-K7a` für Wurmlochankünfte; der Integrationspunkt ist wiederverwendbar für weitere Bewegungsarten.
- [ ] Bekanntwerden hängt nicht von LSS, Sensorreichweite, Koloniebesitz oder dem späteren Öffnen einer Schiffsansicht ab.
- [ ] Fremde oder verbündete Schiffe machen eine Ebene nicht bekannt. Forschung und Spieler-Adminaktionen gewähren keine Ebenenkenntnis; Rollen-Bypass ersetzt keine persistente Spielerzeile.
- [ ] Fehlgeschlagene oder zurückgerollte Bewegungen erzeugen keine Ebenenkenntnis.
- [ ] Backend-Tests decken Onboarding, normalen Ebenenwechsel, Wiederholung, fremde Schiffe und fehlgeschlagene Bewegung ab; der Wurmloch-Test wird mit `tmw-K7a` ergänzt.

## Entscheidung

SWU übernimmt das fachliche STU-Ergebnis, behebt aber dessen View-Time-Abhängigkeit: Kenntnis entsteht autoritativ bei Onboarding beziehungsweise Ankunft und nicht erst beim Anzeigen eines LSS-Schiffs.
