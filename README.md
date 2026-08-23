# Gaming-Zeitstrahl

Private Web-App: zeigt eine persönliche Gaming-Chronik als Zeitstrahl (öffentlich) und bietet einen
geschützten Admin-Bereich zum Pflegen der Daten.

**Stack**: SvelteKit (TypeScript, `adapter-node`) · Tailwind CSS · SQLite via Drizzle ORM
(`better-sqlite3`) · eigene Session-Cookie-Auth (Argon2 + signierter JWT).

## Setup

```bash
npm install
cp .env.example .env
```

`.env` ausfüllen:

- `DATABASE_URL` — Pfad zur SQLite-Datei, z. B. `file:./data/games.db` (Verzeichnis muss existieren:
  `mkdir -p data`)
- `ADMIN_USER` / `ADMIN_PASSWORD_HASH` — leer lassen. Das Admin-Konto legst du beim ersten Öffnen
  der App unter `/setup` direkt im Browser an (Benutzername + Passwort, landet in der DB) — kein
  Node/npx auf dem Zielhost nötig. Diese beiden Variablen sind nur ein Fallback für den Fall, dass
  du den Hash lieber vorab lokal erzeugen willst:
  ```bash
  npx tsx scripts/hash-password.ts "dein-passwort"
  ```
  Base64-kodiert, damit die `$`-Trenner im Argon2-Hash nicht von dotenv als Variablen-Referenzen
  fehlinterpretiert werden. Sobald ein Admin-Konto existiert (per `/setup` oder diesem Fallback),
  gewinnt immer die DB — `ADMIN_USER`/`ADMIN_PASSWORD_HASH` werden dann ignoriert.
- `SESSION_SECRET` — langer Zufallsstring zum Signieren der Session-JWTs, z. B.:
  ```bash
  openssl rand -base64 48
  ```
- `ORIGIN` — öffentliche URL der App (für Cookie/CSRF-Checks)
- `PORT` — Port, auf dem der Node-Server lauscht
- `STEAMGRIDDB_API_KEY` — optional. API-Key aus deinem [SteamGridDB-Profil](https://www.steamgriddb.com/profile/preferences/api).
  Ohne Key funktioniert die App normal, nur der "Cover laden"-Button im Admin-Formular schlägt fehl.

## Datenbank

Schema per Drizzle-Migration anlegen/aktualisieren:

```bash
npm run db:push
```

Startdaten werden nicht mitgeliefert — Spiele werden über den Admin-Bereich (`/admin`) erfasst,
manuell oder per JSON-Import (Schema aus dem `game-lookup`-Skill).

### Erster Start (`/setup`)

Solange kein Admin-Konto existiert (weder in der DB noch vollständig über `ADMIN_USER`/
`ADMIN_PASSWORD_HASH` in `.env`), leitet die App jeden Zugriff auf `/admin` und `/login` auf
`/setup` um. Dort Benutzername + Passwort vergeben — landet direkt in der DB, keine weitere
Konfiguration nötig. Danach ist `/setup` gesperrt (leitet auf `/login` um); das Passwort lässt
sich anschließend über `/admin` → Einstellungen → Passwort ändern.

### Einstellungen (Admin → Einstellungen)

- **Seitentitel & Headline**: frei editierbarer Browser-Titel und Hero-Überschrift der
  öffentlichen Seite, gespeichert in der `settings`-Tabelle (Single-Row, `id = 1`).
- **Akzentfarbe & Hintergrundfarbe**: aus der Akzentfarbe wird serverseitig eine 100–600er
  Shade-Rampe abgeleitet (`src/lib/theme.ts`) und bei jedem Request per `hooks.server.ts` als
  CSS-Variablen (`--accent-100` … `--accent-600`, `--canvas`) in den Seitenkopf injiziert. Alle
  vormals hartkodierten `violet-*`-Klassen im UI nutzen jetzt `accent-*` (definiert in
  `src/routes/layout.css` über Tailwinds `@theme`), reagieren also automatisch auf die
  eingestellte Farbe.
- **Passwort ändern**: verlangt das aktuelle Passwort, speichert den neuen Argon2-Hash direkt in
  der DB (kein `$`-Escaping nötig, da nicht über dotenv geladen) und greift sofort — kein
  Neustart nötig.
- **Skills herunterladen**: Links im JSON-Import-Bereich für `game-lookup` (ein Titel) und
  `game-lookups` (mehrere kommagetrennte Titel, liefert ein Array) — beide Formate akzeptiert der
  Import. Ausgeliefert direkt aus `static/`.

### Cover-Bilder (SteamGridDB)

Im Formular (manuell anlegen/bearbeiten) kann eine SteamGridDB-Game-ID eingegeben werden. "Cover
laden" ruft die [SteamGridDB-API](https://www.steamgriddb.com/api/v2#tag/GRIDS/operation/getGridsByGameId)
auf, lädt das erste Grid-Ergebnis serverseitig herunter und speichert es lokal unter
`data/covers/` — die App verlinkt dann `/covers/<datei>` statt extern zu hotlinken. Ausgeliefert
wird das Bild über die Route `src/routes/covers/[filename]`. Cover-URL und -Lizenz lassen sich
danach noch manuell anpassen, bevor gespeichert wird.

## Entwicklung

```bash
npm run dev -- --open
```

## Build & Deploy

```bash
npm run build
```

Erzeugt einen Node-Server unter `build/`, passend zu `adapter-node`. Start:

```bash
node build
```

Läuft dann auf `PORT` (siehe `.env`) und ist für den Betrieb hinter einem bestehenden
Reverse-Proxy (nginx, Caddy, …) gedacht — der Proxy terminiert TLS und leitet an `http://localhost:$PORT`
weiter. `ORIGIN` muss dabei auf die öffentliche HTTPS-URL zeigen, damit SvelteKits CSRF-Schutz für
Formulare korrekt greift.

`npm run preview` dient nur zum lokalen Testen des Builds, nicht für den Produktivbetrieb.

### Deploy mit Docker (empfohlen)

Das Image enthält nur Code, `node_modules` und den Build — `.env` und `data/` (SQLite-DB +
heruntergeladene Cover) bleiben außerhalb und werden erst beim Start eingebunden. Dadurch lässt
sich das Image neu bauen/deployen, ohne Config oder Daten anzufassen.

Einmalige Einrichtung (legt `data/` an und fragt `ORIGIN`/`PORT` ab, um `.env` zu erzeugen —
kein Node/npx auf dem Zielhost nötig, das Admin-Konto legst du danach unter `/setup` im Browser an):

```bash
make setup                              # Standardpfad /home/docker/gamehistory
make setup DATA_PATH=/anderer/pfad      # abweichender Pfad
```

`make setup` überschreibt eine bereits vorhandene `.env` nicht. Alternativ manuell:

```bash
cp .env.example .env   # ausfüllen, siehe oben — PORT hier auf 3000 lassen
mkdir -p data
docker compose up -d --build
```

- `.env` wird über `env_file` als Umgebungsvariablen in den Container injiziert (nicht als Datei
  gemountet) — die Werte müssen daher schon beim `docker compose up` vorliegen.
- `./data` wird nach `/app/data` gemountet (SQLite-Datei + `data/covers/`).
- Port-Mapping ist `3000:3000` (`docker-compose.yml` anpassen, falls dein Reverse-Proxy einen
  anderen Host-Port erwartet).

Ohne Compose, mit reinem `docker run`:

```bash
docker build -t gamehistory .
docker run -d --name gamehistory \
  --env-file .env \
  -v "$(pwd)/data:/app/data" \
  -p 3000:3000 \
  gamehistory
```

Neu deployen nach Code-Änderungen: `docker compose up -d --build` — Daten und Config bleiben
unangetastet, da sie nicht Teil des Images sind.

## Sonstiges

- `npm run check` — Typprüfung (Svelte + TypeScript, strict mode)
- `npm run lint` / `npm run format` — Prettier + ESLint
- `npm run db:studio` — Drizzle Studio zum Inspizieren der Datenbank
