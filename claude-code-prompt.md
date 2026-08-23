# Prompt für Claude Code: Gaming-Zeitstrahl (SvelteKit)

Baue eine private Web-App, die meine persönliche Gaming-Chronik (Spiele, die ich im Laufe von ~36 Jahren gespielt habe) als Zeitstrahl anzeigt, plus einen geschützten Upload-Bereich zum Pflegen der Daten.

## Tech-Stack

- **SvelteKit** (TypeScript), Adapter: `adapter-node` (Deploy auf eigenem Server)
- **Tailwind CSS** für Styling
- **SQLite** über **Drizzle ORM** (`better-sqlite3` als Treiber) — kein zusätzlicher DB-Server nötig
- **Auth**: kein Auth-Framework (Lucia ist deprecated) — eigene, schlanke Session-Cookie-Lösung:
  - Ein einziger Nutzer, Zugangsdaten (Username + Passwort-Hash) über Environment-Variablen (`ADMIN_USER`, `ADMIN_PASSWORD_HASH`)
  - Passwort-Hashing mit `argon2` (oder `bcrypt`, falls einfacher zu integrieren)
  - Session-Token in httpOnly-Cookie, Session-Datensatz in SQLite (Tabelle `sessions`) oder signierter JWT — beides ok, JWT bevorzugt für Einfachheit
  - `hooks.server.ts` prüft die Session für alle `/admin/*`-Routen und leitet bei fehlender Auth auf `/login` um

## Datenmodell

Tabelle `games`:

| Feld           | Typ                                   | Anmerkung                                                                                                                      |
| -------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `id`           | integer, PK, autoincrement            |                                                                                                                                |
| `name`         | text, required                        |                                                                                                                                |
| `year`         | integer, required                     | Erscheinungsjahr                                                                                                               |
| `category`     | text, required                        | z. B. "Strategie", "Shooter", "Taktik" — freies Textfeld, aber mit Autocomplete aus bereits vorhandenen Kategorien im Formular |
| `coverUrl`     | text, optional                        |                                                                                                                                |
| `coverLicense` | text, optional                        | z. B. "SteamGridDB — ...", "non-free / fair-use — ..."                                                                         |
| `wikipediaUrl` | text, optional                        |                                                                                                                                |
| `description`  | text, optional                        |                                                                                                                                |
| `createdAt`    | integer (unix timestamp), default now |                                                                                                                                |

Seed-Skript, das die Tabelle anlegt (Drizzle Migration) — Startdaten müssen NICHT mitgeliefert werden, die trage ich selbst über den Upload-Bereich ein.

## Seiten & Routen

### `/` — Öffentlicher Zeitstrahl (keine Auth nötig)

**Visueller Stil**: dunkles, glasiges SaaS-Landingpage-Design (Referenz: Reflect-Screenshot) — near-black Hintergrund mit violettem Radial-Glow als Signature-Element, floating/blurred Panels mit dünnen hellen Border-Linien, moderne Sans-Serif-Typografie.

Konkrete Design-Tokens als Ausgangspunkt (gerne im Rahmen dieser Palette leicht variieren):

- Hintergrund: `#08060f` (fast schwarz, minimal violetter Unterton)
- Panel/Card-Flächen: `#12101d` mit `border: 1px solid rgba(255,255,255,0.08)`, `backdrop-blur`
- Akzent-Verlauf: violet `#7c3aed` → `#a78bfa`, als Glow/Gradient, nicht als Flächenfarbe
- Text primär: `#f4f2fa`, sekundär: `#9c97ad`
- Schrift: eine klare geometrische Sans-Serif (z. B. "Geist", "Inter" oder "Manrope") für Headlines, gleiche oder eng verwandte Familie für Fließtext — keine zwei völlig unterschiedlichen Font-Welten

**Signature-Element**: statt des Reflect-Portal-Glows einen thematisch passenden Twist bauen — z. B. der violette Glow als "CRT-Boot-Screen"-Kreis/Halbkreis im Hero, aus dem sich die Zeitstrahl-Linie nach unten fortsetzt (verbindet die SaaS-Ästhetik mit dem Gaming-Thema, statt sie 1:1 zu kopieren). Dezente Bewegung ok (z. B. langsames Pulsieren des Glows), aber `prefers-reduced-motion` respektieren.

**Hero-Bereich**:

- Headline: "36 Jahre Gaming-Geschichte" (oder ähnlich, gerne leicht variieren)
- **Kein** Beschreibungstext darunter (bewusst weggelassen)
- Kategorie-Statistik direkt im oberen Bereich: kompakte Stat-Cards/Badges, ein Eintrag pro Kategorie mit Anzahl der Spiele (z. B. "Strategie · 14", "Shooter · 3", ...), aus den DB-Daten aggregiert, keine hartkodierten Werte

**Sprungmenü (Decade/Year-Nav)**:

- Sticky/floating Navigationsleiste (horizontal, z. B. unter dem Hero oder als schwebende Sidebar) mit einem Eintrag pro Jahrzehnt, in dem mindestens ein Spiel erfasst ist (z. B. "1990er", "2000er", "2010er", "2020er")
- Klick scrollt smooth zur jeweiligen Dekaden-Sektion im Zeitstrahl
- **Schwellenwert-Logik**: hat ein Jahrzehnt mehr als 8 Einträge, klappt der Menüpunkt beim Hover/Klick eine Jahres-Unterliste auf (nur die Jahre, in denen tatsächlich etwas erfasst ist), sodass man direkt zum Jahr statt nur zur Dekade springen kann. Bei ≤ 8 Einträgen reicht der Sprung zur Dekade.
- Aktiver Abschnitt beim Scrollen wird im Menü hervorgehoben (Scrollspy)

**Zeitstrahl-Body**:

- Gruppiert nach Jahrzehnt (Sektions-Header, gut sichtbar, als Scroll-Anker für die Sprungnavigation), innerhalb jeder Dekade chronologisch nach Jahr
- Pro Spiel eine Card: Cover-Bild (falls vorhanden, sonst Platzhalter-Icon), Jahr-Badge, Titel, Kategorie-Tag, Kurzbeschreibung, Link-Icon zur Wikipedia-Seite (falls vorhanden)
- Responsive: auf Mobile wird die Sprungnav zu einem Dropdown/Sheet statt Sidebar

### `/login`

Einfaches, zum Rest passendes Login-Formular (Username + Passwort), Fehleranzeige bei falschen Zugangsdaten, redirect zu `/admin` nach Erfolg.

### `/admin` (geschützt)

- Tabellenansicht aller erfassten Spiele (sortierbar nach Jahr), mit Edit/Delete pro Zeile
- Formular zum Hinzufügen eines neuen Spiels — alle Felder aus dem Datenmodell, `category` mit Autocomplete/Datalist aus bereits vorhandenen Kategorien
- **JSON-Import-Feld**: ein Textarea, in das ich das JSON aus meinem `game-lookup`-Skill (Schema: `name`, `year`, `category`, `coverUrl`, `coverLicense`, `wikipediaUrl`, `description`, `note`) einfügen kann — ein Button parst das JSON (auch als Array für mehrere Spiele auf einmal) und befüllt entweder direkt die Tabelle oder das Formular zur Kontrolle vor dem Speichern
- Logout-Button

## Sonstiges

- `.env.example` mit allen benötigten Variablen (inkl. Kommentar, wie man den Passwort-Hash erzeugt, z. B. kleines CLI-Script `scripts/hash-password.ts`)
- `README.md` mit Setup-Schritten (Install, DB-Migration, Dev-Server, Build, Deploy-Hinweis für Node-Adapter hinter bestehendem Reverse Proxy)
- TypeScript strict mode an
- Kein Test-Framework nötig, aber saubere Typisierung (Drizzle-Schema als Single Source of Truth für Types)

## Abnahme-Kriterien

- [ ] `/` zeigt Zeitstrahl mit Kategorie-Statistik oben, ohne den entfernten Beschreibungstext
- [ ] Sprungmenü springt zur Dekade, bei > 8 Einträgen in einer Dekade zusätzlich zum Jahr
- [ ] `/admin` ist ohne gültige Session nicht erreichbar, `/login` funktioniert
- [ ] Neues Spiel lässt sich sowohl manuell als auch per JSON-Paste anlegen
- [ ] Optik folgt der beschriebenen dunklen Violett-Glow-Palette, responsive bis Mobile
