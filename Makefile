# Define default shell to use bash
SHELL := /bin/bash

# Set default target
.DEFAULT_GOAL := help

# Variables
TSX := tsx

# Targets
dev: ## Start the application with tsx --watch
	docker compose -f docker-compose.dev.yml up -d && pnpm run dev | pino-pretty

start: ## Start the application with tsx --watch
	pnpm run dev | pino-pretty

test: ## Run the test command
	@echo "Error: no test specified" && exit 1

migrate: ## Run migrations (e.g., make migrate type=up)
	$(TSX) src/db/migrate.ts $(type)

seed: ## Run database seeders (e.g., make seed count=100)
	$(TSX) database/seeders/seeder.ts $(count)

help: ## Display help for each target
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'
