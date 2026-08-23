# Initiale Einrichtung fürs Docker-Deploy — legt data/ und .env außerhalb des
# Images an (siehe docker-compose.yml). Läuft idempotent: vorhandene .env
# wird nie überschrieben.
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
	@echo "  make env        - fragt Zugangsdaten ab, erzeugt $(ENV_FILE)"
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
	read -p "Admin-Benutzername [admin]: " admin_user; \
	admin_user=$${admin_user:-admin}; \
	admin_password=""; \
	while [ -z "$$admin_password" ]; do \
		read -s -p "Admin-Passwort: " admin_password; echo; \
		if [ -z "$$admin_password" ]; then echo "Darf nicht leer sein."; fi; \
	done; \
	read -p "Öffentliche URL, ORIGIN [https://games.example.com]: " origin; \
	origin=$${origin:-https://games.example.com}; \
	read -p "Port [3000]: " port; \
	port=$${port:-3000}; \
	echo "Erzeuge Argon2-Hash und Session-Secret …"; \
	admin_password_hash=$$(npx tsx scripts/hash-password.ts "$$admin_password"); \
	session_secret=$$(openssl rand -base64 48); \
	{ \
		echo "DATABASE_URL=\"file:./data/games.db\""; \
		echo "ADMIN_USER=\"$$admin_user\""; \
		echo "ADMIN_PASSWORD_HASH=\"$$admin_password_hash\""; \
		echo "SESSION_SECRET=\"$$session_secret\""; \
		echo "STEAMGRIDDB_API_KEY=\"\""; \
		echo "ORIGIN=\"$$origin\""; \
		echo "PORT=$$port"; \
	} > "$(ENV_FILE)"; \
	chmod 600 "$(ENV_FILE)"; \
	echo ".env erstellt unter $(ENV_FILE)"
