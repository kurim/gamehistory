# Initiale Einrichtung fürs Docker-Deploy — legt data/ und .env außerhalb des
# Images an (siehe docker-compose.yml). Läuft idempotent: vorhandene .env
# wird nie überschrieben. Der Admin-Zugang selbst wird NICHT hier angelegt,
# sondern beim ersten Öffnen der App unter /setup — braucht daher kein Node
# auf dem Zielhost.
#
# Nutzung:
#   make setup                                  # Standardpfad /home/docker/gamehistory
#   make setup DATA_PATH=/anderer/pfad           # abweichender Pfad

DATA_PATH ?= /home/docker/gamehistory
DATA_DIR  := $(DATA_PATH)/data
ENV_FILE  := $(DATA_PATH)/.env

.DEFAULT_GOAL := help

.PHONY: help setup data-dir env

help:
	@echo "Verfügbare Ziele:"
	@echo "  make setup      - data-dir + env (komplette Einrichtung)"
	@echo "  make data-dir   - legt $(DATA_DIR) an"
	@echo "  make env        - fragt ORIGIN/PORT ab, erzeugt $(ENV_FILE)"
	@echo ""
	@echo "Admin-Zugang wird NICHT hier angelegt — das passiert beim ersten"
	@echo "Öffnen der App unter /setup."
	@echo ""
	@echo "Pfad überschreiben: make setup DATA_PATH=/anderer/pfad"

setup: data-dir env

data-dir:
	@mkdir -p "$(DATA_DIR)"
	@echo "Datenverzeichnis angelegt: $(DATA_DIR)"

env:
	@if [ -f "$(ENV_FILE)" ]; then \
		echo ".env existiert bereits unter $(ENV_FILE) — wird nicht überschrieben."; \
		exit 0; \
	fi; \
	mkdir -p "$(DATA_PATH)"; \
	read -p "Öffentliche URL, ORIGIN [https://games.example.com]: " origin; \
	origin=$${origin:-https://games.example.com}; \
	read -p "Port [3000]: " port; \
	port=$${port:-3000}; \
	session_secret=$$(openssl rand -base64 48); \
	{ \
		echo "DATABASE_URL=\"file:./data/games.db\""; \
		echo "ADMIN_USER=\"\""; \
		echo "ADMIN_PASSWORD_HASH=\"\""; \
		echo "SESSION_SECRET=\"$$session_secret\""; \
		echo "STEAMGRIDDB_API_KEY=\"\""; \
		echo "ORIGIN=\"$$origin\""; \
		echo "PORT=$$port"; \
	} > "$(ENV_FILE)"; \
	chmod 600 "$(ENV_FILE)"; \
	echo ".env erstellt unter $(ENV_FILE)"; \
	echo "Admin-Konto beim ersten App-Aufruf unter $$origin/setup anlegen."
