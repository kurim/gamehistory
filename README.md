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

Die App wendet die versionierten Migrationen unter `drizzle/` bei jedem Start automatisch an
(`src/lib/server/db/index.ts`) — auf einer frischen DB werden `games`/`settings` beim ersten
Boot angelegt, kein manueller Schritt nötig, egal ob lokal oder im Container.

Für die Schema-Entwicklung lokal (`schema.ts` ändern → sofort gegen die Dev-DB testen, ohne erst
eine Migration zu erzeugen):

```bash
npm run db:push
```

Sobald `schema.ts` fertig geändert ist, eine echte Migration für Produktion erzeugen und committen:

```bash
npm run db:generate
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

Das Image wird nicht mehr lokal gebaut, sondern von GitHub Actions bei jedem Push auf `main`
gebaut und nach GitHub Container Registry (GHCR) gepusht (`.github/workflows/docker-build.yml`,
Image: `ghcr.io/kurim/gamehistory:latest`). Der Deploy-Host zieht nur noch das fertige Image —
kein Node, kein Build-Toolchain, kein Repo-Checkout auf dem Zielhost nötig. Das GHCR-Package muss
dafür auf **public** stehen (Package-Einstellungen auf GitHub), sonst braucht der Deploy-Host
zusätzlich `docker login ghcr.io` mit einem PAT (`read:packages`).

`.env` und `data/` (SQLite-DB + heruntergeladene Cover) bleiben außerhalb des Images und werden
erst beim Start eingebunden — Updates rühren Config/Daten nie an.

Einrichtung an einem frei wählbaren Deploy-Pfad, der bewusst vom Repo-Checkout abweichen kann
(z. B. Code unter `/opt/gamehistory`, Deploy-Daten unter `/home/docker/gamehistory`):

```bash
mkdir -p /pfad/zum/deploy/data
cp .env.example /pfad/zum/deploy/.env   # ausfüllen: DATABASE_URL, SESSION_SECRET, ORIGIN, PORT
cp docker-compose.yml /pfad/zum/deploy/
cd /pfad/zum/deploy && docker compose pull && docker compose up -d
```

`SESSION_SECRET` z. B. mit `openssl rand -base64 48` erzeugen. Admin-Konto danach unter `/setup`
im Browser anlegen — kein Node/npx auf dem Zielhost nötig.

Da das Deploy-Verzeichnis seine eigene `docker-compose.yml` (+ `.env` + `data/`) hat, laufen alle
weiteren `docker compose`-Befehle dort, nicht im Repo:

```bash
cd /pfad/zum/deploy
docker compose restart
docker compose logs -f
docker compose down
```

Kein `--project-directory` oder sonstige Sonderflags nötig — ganz normale Compose-Befehle, weil
`.env`/`data/`/`docker-compose.yml` dort als Geschwisterdateien liegen.

Neu deployen nach Code-Änderungen (Push auf `main` löst den GHCR-Build automatisch aus):

```bash
cd /pfad/zum/deploy && docker compose pull && docker compose up -d
```

Ohne Compose, mit reinem `docker run`:

```bash
docker pull ghcr.io/kurim/gamehistory:latest
docker run -d --name gamehistory \
  --env-file /pfad/zum/deploy/.env \
  -v "/pfad/zum/deploy/data:/app/data" \
  -p 3000:3000 \
  ghcr.io/kurim/gamehistory:latest
```

Lokal bauen (z. B. zum Testen des Dockerfiles) geht weiterhin mit `docker build -t gamehistory .`.

### Releases (Version-Tags)

Jeder Push auf `main` baut und pusht `ghcr.io/kurim/gamehistory:latest` — die im UI angezeigte
Version (Footer der Startseite, Admin-Bereich) ist dabei per `git describe` abgeleitet, z. B.
`v0.1.0-3-g596865f` (3 Commits nach dem letzten Tag `v0.1.0`) oder, falls noch kein Tag existiert,
einfach der kurze Commit-SHA.

Für einen benannten Release-Stand reicht ein Git-Tag:

```bash
git tag v0.2.0
git push origin v0.2.0
```

Das löst denselben Workflow aus und veröffentlicht zusätzlich zwei weitere Image-Tags:

- `ghcr.io/kurim/gamehistory:v0.2.0` — unveränderlich, bleibt für immer genau dieser Release-Stand
- `ghcr.io/kurim/gamehistory:stable` — beweglich, zeigt immer auf den zuletzt getaggten Release

Im laufenden Container zeigt sich das dann exakt als `v0.2.0` statt der `-N-gSHA`-Variante.
`latest` selbst wird von Tags nicht angefasst, das folgt weiterhin nur `main` (Bleeding Edge).
Für den Produktivbetrieb empfiehlt sich `stable` statt `latest` in der `docker-compose.yml` — dann
gibt es nur nach einem bewussten Release-Tag ein neues Image, nicht bei jedem Push auf `main`.

## Sonstiges

- `npm run check` — Typprüfung (Svelte + TypeScript, strict mode)
- `npm run lint` / `npm run format` — Prettier + ESLint
- `npm run db:studio` — Drizzle Studio zum Inspizieren der Datenbank
