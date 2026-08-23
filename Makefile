# Initiale Einrichtung fürs Docker-Deploy — legt data/ und .env außerhalb des
# Images an (siehe docker-compose.yml), baut das Image und fragt, ob der
# Container direkt gestartet werden soll. Läuft idempotent: vorhandene .env
# wird nie überschrieben. Der Admin-Zugang selbst wird NICHT hier angelegt,
# sondern beim ersten Öffnen der App unter /setup — braucht daher kein Node
# auf dem Zielhost.
#
# Im Repo-Root ausführen (dort liegen Makefile, Dockerfile und
# docker-compose.yml nebeneinander).
#
# Nutzung:
#   make setup                                  # Standardpfad /home/docker/gamehistory
#   make setup DATA_PATH=/anderer/pfad           # abweichender Pfad

DATA_PATH ?= /home/docker/gamehistory
DATA_DIR  := $(DATA_PATH)/data
ENV_FILE  := $(DATA_PATH)/.env

.DEFAULT_GOAL := help

.PHONY: help setup data-dir env docker-build docker-start

help:
	@echo "Verfügbare Ziele:"
	@echo "  make setup       - data-dir + env + docker-build + docker-start (komplett)"
	@echo "  make data-dir    - legt $(DATA_DIR) an"
	@echo "  make env         - fragt ORIGIN/PORT ab, erzeugt $(ENV_FILE)"
	@echo "  make docker-build - baut das Image (docker compose build)"
	@echo "  make docker-start - fragt, ob der Container gestartet werden soll"
	@echo ""
	@echo "Admin-Zugang wird NICHT hier angelegt — das passiert beim ersten"
	@echo "Öffnen der App unter /setup."
	@echo ""
	@echo "Pfad überschreiben: make setup DATA_PATH=/anderer/pfad"

setup: data-dir env docker-build docker-start

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

docker-build:
	docker compose build

docker-start:
	@read -p "Docker-Container jetzt starten (docker compose up -d)? [y/N] " start_now; \
	case "$$start_now" in \
		[yY]*) docker compose up -d ;; \
		*) echo "Übersprungen. Später starten mit: docker compose up -d" ;; \
	esac
