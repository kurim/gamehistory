# Initiale Einrichtung fürs Docker-Deploy. Richtet unter DATA_PATH ein
# eigenständiges Deploy-Verzeichnis ein — .env, data/ UND eine eigene Kopie
# von docker-compose.yml (referenziert das fertig gebaute Image von GHCR,
# ghcr.io/kurim/gamehistory, kein lokaler Build-Kontext nötig — GitHub
# Actions baut und published das Image bei jedem Push auf main, siehe
# .github/workflows/docker-build.yml). Dadurch braucht KEIN späterer
# `docker compose`-Befehl (restart, logs, down, …) Sonderflags wie
# --project-directory — einfach `cd $(DATA_PATH) && docker compose ...`.
# Läuft idempotent: vorhandene .env/docker-compose.yml dort werden nie
# überschrieben. Der Admin-Zugang selbst wird NICHT hier angelegt, sondern
# beim ersten Öffnen der App unter /setup — braucht daher kein Node auf dem
# Zielhost.
#
# Im Repo-Root ausführen (dort liegen Makefile, Dockerfile und
# docker-compose.yml nebeneinander).
#
# Nutzung:
#   make setup                                  # fragt nach dem Pfad, Vorschlag /home/docker/gamehistory
#   make setup DATA_PATH=/anderer/pfad           # abweichender Vorschlag für die Nachfrage
#   make update DATA_PATH=/deploy/pfad           # neuestes Image pullen und Container neu starten

DATA_PATH ?= /home/docker/gamehistory

.DEFAULT_GOAL := help

.PHONY: help setup update

help:
	@echo "Verfügbare Ziele:"
	@echo "  make setup   - fragt Deploy-Pfad, ORIGIN, PORT ab, richtet dort .env + data/ +"
	@echo "                 docker-compose.yml ein, pullt das Image von GHCR und fragt, ob"
	@echo "                 der Container gestartet werden soll"
	@echo "  make update  - pullt das neueste Image und startet den Container im"
	@echo "                 Deploy-Verzeichnis (DATA_PATH) neu"
	@echo ""
	@echo "Admin-Zugang wird NICHT hier angelegt — das passiert beim ersten"
	@echo "Öffnen der App unter /setup."
	@echo ""
	@echo "Nach dem Setup laufen alle docker-compose-Befehle im Deploy-Verzeichnis,"
	@echo "nicht im Repo: cd <deploy-pfad> && docker compose restart / logs / down / ..."
	@echo ""
	@echo "Pfad-Vorschlag überschreiben: make setup DATA_PATH=/anderer/pfad"

setup:
	@read -p "Deploy-Verzeichnis für .env, data/ und docker-compose.yml [$(DATA_PATH)]: " data_path; \
	data_path=$${data_path:-$(DATA_PATH)}; \
	data_dir="$$data_path/data"; \
	env_file="$$data_path/.env"; \
	compose_file="$$data_path/docker-compose.yml"; \
	mkdir -p "$$data_dir"; \
	echo "Datenverzeichnis angelegt: $$data_dir"; \
	if [ -f "$$compose_file" ]; then \
		echo "docker-compose.yml existiert bereits unter $$compose_file — wird nicht überschrieben."; \
	else \
		cp "$(CURDIR)/docker-compose.yml" "$$compose_file"; \
		echo "docker-compose.yml kopiert nach $$compose_file"; \
	fi; \
	if [ -f "$$env_file" ]; then \
		echo ".env existiert bereits unter $$env_file — wird nicht überschrieben."; \
	else \
		read -p "Öffentliche URL, ORIGIN [https://games.example.com]: " origin; \
		origin=$${origin:-https://games.example.com}; \
		read -p "Port [3000]: " port; \
		port=$${port:-3000}; \
		if command -v ss >/dev/null 2>&1; then \
			port_free() { ! ss -Htln 2>/dev/null | grep -qE ":$$1([[:space:]]|$$)"; }; \
			if ! port_free "$$port"; then \
				echo "Port $$port ist bereits belegt."; \
				alt=$$port; tries=0; \
				while ! port_free "$$alt" && [ "$$tries" -lt 50 ]; do \
					alt=$$((alt + 1)); tries=$$((tries + 1)); \
				done; \
				read -p "Alternativer freier Port [$$alt]: " chosen; \
				port=$${chosen:-$$alt}; \
			fi; \
		else \
			echo "Hinweis: 'ss' nicht gefunden — Port-Verfügbarkeit wird nicht geprüft."; \
		fi; \
		session_secret=$$(openssl rand -base64 48); \
		{ \
			echo "DATABASE_URL=\"file:./data/games.db\""; \
			echo "SESSION_SECRET=\"$$session_secret\""; \
			echo "STEAMGRIDDB_API_KEY=\"\""; \
			echo "ORIGIN=\"$$origin\""; \
			echo "PORT=$$port"; \
		} > "$$env_file"; \
		chmod 600 "$$env_file"; \
		echo ".env erstellt unter $$env_file"; \
		echo "Admin-Konto beim ersten App-Aufruf unter $$origin/setup anlegen."; \
	fi; \
	(cd "$$data_path" && docker compose pull); \
	read -p "Docker-Container jetzt starten (docker compose up -d)? [y/N] " start_now; \
	case "$$start_now" in \
		[yY]*) (cd "$$data_path" && docker compose up -d) ;; \
		*) echo "Übersprungen. Später starten mit: cd $$data_path && docker compose up -d" ;; \
	esac

update:
	@if [ ! -f "$(DATA_PATH)/docker-compose.yml" ]; then \
		echo "Kein Deploy-Verzeichnis unter $(DATA_PATH) gefunden — erst 'make setup' ausführen."; \
		exit 1; \
	fi; \
	(cd "$(DATA_PATH)" && docker compose pull && docker compose up -d); \
	echo "Container läuft jetzt mit dem neuesten Image."
