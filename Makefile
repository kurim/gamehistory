# Initiale Einrichtung fürs Docker-Deploy — legt data/ und .env außerhalb des
# Images an (siehe docker-compose.yml), baut das Image und fragt, ob der
# Container direkt gestartet werden soll. Läuft idempotent: vorhandene .env
# wird nie überschrieben. Der Admin-Zugang selbst wird NICHT hier angelegt,
# sondern beim ersten Öffnen der App unter /setup — braucht daher kein Node
# auf dem Zielhost.
#
# Im Repo-Root ausführen (dort liegen Makefile, Dockerfile und
# docker-compose.yml nebeneinander). `make setup` fragt interaktiv nach dem
# Datenpfad (Vorschlag per DATA_PATH überschreibbar); .env und data/ landen
# dort, auch wenn das vom Repo-Verzeichnis abweicht.
#
# Nutzung:
#   make setup                                  # fragt nach dem Pfad, Vorschlag /home/docker/gamehistory
#   make setup DATA_PATH=/anderer/pfad           # abweichender Vorschlag für die Nachfrage

DATA_PATH ?= /home/docker/gamehistory
COMPOSE   := docker compose -f "$(CURDIR)/docker-compose.yml"

.DEFAULT_GOAL := help

.PHONY: help setup

help:
	@echo "Verfügbare Ziele:"
	@echo "  make setup   - fragt Datenpfad, ORIGIN, PORT ab, erzeugt data/ + .env,"
	@echo "                 baut das Image und fragt, ob der Container gestartet werden soll"
	@echo ""
	@echo "Admin-Zugang wird NICHT hier angelegt — das passiert beim ersten"
	@echo "Öffnen der App unter /setup."
	@echo ""
	@echo "Pfad-Vorschlag überschreiben: make setup DATA_PATH=/anderer/pfad"

setup:
	@read -p "Verzeichnis für .env und data/ [$(DATA_PATH)]: " data_path; \
	data_path=$${data_path:-$(DATA_PATH)}; \
	data_dir="$$data_path/data"; \
	env_file="$$data_path/.env"; \
	mkdir -p "$$data_dir"; \
	echo "Datenverzeichnis angelegt: $$data_dir"; \
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
	$(COMPOSE) --project-directory "$$data_path" build; \
	read -p "Docker-Container jetzt starten (docker compose up -d)? [y/N] " start_now; \
	case "$$start_now" in \
		[yY]*) $(COMPOSE) --project-directory "$$data_path" up -d ;; \
		*) echo "Übersprungen. Später starten mit: $(COMPOSE) --project-directory \"$$data_path\" up -d" ;; \
	esac
