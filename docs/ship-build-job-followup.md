# Schiffbau-Queue / BuildJob Folgeplanung

Status: Folgeplanung nach MVP-Direktbau.

## Warum

Der aktuelle MVP-Schiffbau soll bewusst direkt sein: Kosten pruefen, Ressourcen abziehen, `Spacecraft` erzeugen. Das macht den ersten Progressionsloop schnell testbar.

Fuer STU-naeheren Betrieb braucht Schiffbau danach eine Queue.

## Vorschlag Entity

`ship_build_jobs`

- `id`
- `userId`
- `colonyId`
- `shipClassId`
- `name`
- `costsSnapshot jsonb`
- `startedAt`
- `finishesAt`
- `status` (`QUEUED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `FAILED`)
- `createdShipId nullable`

## Service-Ablauf

1. `ColonyService.buildShip(...)` wird zu `enqueueShipBuild(...)`.
2. Kosten und Unlocks werden beim Erstellen des Jobs geprueft.
3. Ressourcen werden sofort reserviert/abgezogen.
4. Minute-Process-Tick prueft faellige Jobs.
5. Fertige Jobs erzeugen `Spacecraft` an Kolonie-/Systemposition.
6. Dashboard und Kolonie-Werftpanel zeigen laufende Schiffbauauftraege.

## Nicht im MVP-Direktbau

- Keine Queue-Tabelle
- Keine Storno-/Refund-Logik
- Keine parallelen Werft-Slots
- Keine Priorisierung

## Naechster sinnvoller Zeitpunkt

Nach erfolgreichem Flow:
Homeworld → Forschung → Werfthub → erster Direktbau → Spacecraft-Seite.
