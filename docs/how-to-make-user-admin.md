# User nach Registrierung zum Admin machen

## Variante A — direkt in Datenbank setzen

### 1. User normal registrieren

Im Frontend oder per API registrieren.

### 2. Datenbank öffnen

Wenn Docker Compose läuft, meist so:

```bash
docker compose exec db psql -U postgres -d swuniverse
```

Falls dein Datenbankname anders ist, Namen anpassen.

### 3. User prüfen

```sql
SELECT id, username, email, "isAdmin"
FROM users
ORDER BY id;
```

### 4. User zum Admin machen

Beispiel für User `tom`:

```sql
UPDATE users
SET "isAdmin" = true
WHERE username = 'tom';
```

### 5. Kontrolle

```sql
SELECT id, username, "isAdmin"
FROM users
WHERE username = 'tom';
```

Erwartet:

```text
 isAdmin = true
```

### 6. Neu einloggen

Wichtig.
JWT und Frontend-Store müssen neuen Admin-Status neu laden.

- ausloggen
- wieder einloggen

Danach:

- Sidebar zeigt `Map Admin`
- `/admin/starmap` funktioniert

---

## Variante B — automatisch beim Backend-Start

Es gibt jetzt Bootstrap-Logik über Env-Variable.

### 1. User erst registrieren

Zum Beispiel `tom`.

### 2. Backend mit Env-Variable starten

```bash
BOOTSTRAP_ADMIN_USERNAME=tom npm run dev
```

Oder in `.env` / docker compose setzen:

```env
BOOTSTRAP_ADMIN_USERNAME=tom
```

### 3. Backend startet

Beim Start sucht Backend User `tom` und setzt `isAdmin = true`.

### 4. Neu einloggen

Auch hier danach neu einloggen.

---

## Variante C — direkt per SQL in Docker

Wenn DB im Container läuft:

```bash
docker compose exec db psql -U postgres -d swuniverse -c "UPDATE users SET \"isAdmin\" = true WHERE username = 'tom';"
```

Danach wieder neu einloggen.

---

## Wenn `Map Admin` nicht erscheint

Prüfen:

1. `isAdmin` wirklich gesetzt?

```sql
SELECT username, "isAdmin" FROM users WHERE username = 'tom';
```

2. Neu eingeloggt?
   Alter Token kennt `isAdmin` noch nicht.

3. `/api/auth/me` prüfen
   Response sollte enthalten:

```json
{
  "username": "tom",
  "isAdmin": true
}
```

4. Backend neu gestartet nach Codeänderung?

---

## Kurzfassung

Schnellster Weg:

```bash
docker compose exec db psql -U postgres -d swuniverse
```

Dann:

```sql
UPDATE users
SET "isAdmin" = true
WHERE username = 'tom';
```

Dann:

- logout
- login
- `/admin/starmap` öffnen
