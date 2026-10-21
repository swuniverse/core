# Kontaktfreigaben „Als Freund behandeln“ und „Live-Position teilen“

**Status:** ready-for-agent
**Priority:** P3
**Size:** M
**Blocked by:** soc-B1a

## Ziel

In STU kann ein Spieler einem Kontakt einseitig die Rechte „Als Freund behandeln“ und „Live-Position teilen“ geben; die Starmap zeigt dann geteilte Positionen. SWU kennt solche Freigaben nur als beidseitig ausgehandelte **Beziehungsfreigaben** (Allianz-Etappe 4). Dieses Issue setzt einseitige Kontaktfreigaben um, falls gewünscht.

## STU-Quellen

- `src/Module/Message/Action/UpdateContactPermissions`
- `src/Component/Alliance/Enum/RelationPermissionEnum.php`
- `src/Module/Starmap/View/ShowUserStarmapRealtime.php:576-596`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/starmap-visibility.service.ts` (geteilte Live-Positionen)
- `apps/backend/src/modules/alliance/relationship-resolver.service.ts`
- `CONTEXT.md` (Beziehungsfreigabe)
- `docs/adr/0001-allianzen-abweichungen-von-stu.md`

## Akzeptanzkriterien

- [ ] Freigaben „Als Freund behandeln“ und „Live-Position teilen“ sind je Kontakt speicherbar (Migration) und in der Kontaktliste umschaltbar.
- [ ] „Als Freund behandeln“ wirkt einseitig über den Relationship-Resolver: Der Freigebende behandelt den Kontakt als Freund (Vorrang wie in `CONTEXT.md`: andere Fraktion und Allianzkrieg gehen vor); die Gegenrichtung bleibt unverändert.
- [ ] „Live-Position teilen“ erscheint im Sichtbarkeitsdienst nur für den freigebenden Spieler gegenüber dem Kontakt, gebündelt aufgelöst.
- [ ] `CONTEXT.md` (Freund, Beziehungsfreigabe) beschreibt die einseitige Kontaktfreigabe neben der ausgehandelten Beziehungsfreigabe.
- [ ] Tests belegen, dass ohne Freigabe nichts sichtbar bzw. wirksam wird, und die Einseitigkeit beider Freigaben.

## Entscheidung

Vorgabe: Variante (a), einseitig wie STU, für **beide** Freigaben („Als Freund behandeln“ und „Live-Position teilen“; die Empfehlung, nur „Live-Position teilen“ zu übernehmen, wurde nicht gewählt). Der Freigebende entscheidet allein; die Wirkung gilt nur in seiner Richtung (er behandelt den Kontakt als Freund bzw. gibt seine eigenen Positionen preis). Die Freigaben ergänzen die ausgehandelten Beziehungsfreigaben, ersetzen sie nicht.

## Comments

- 2026-10-21 Product Owner: Option a – Einseitige Kontaktfreigaben werden wie in STU eingeführt: Der Freigebende entscheidet allein über „Als Freund behandeln“ und „Live-Position teilen“.
