# Makefile for Civenro Backend

# Specify the shell to use (optional, defaults to /bin/sh)
SHELL := /bin/bash

# Variables
DB_URL := $(shell grep DATABASE_URL .env | cut -d '=' -f2)

# Display help
help:
	@echo "Civenro Backend Makefile"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  install     Install backend dependencies"
	@echo "  dev         Run the development server"
	@echo "  migrate     Run Prisma migrations"
	@echo "  generate    Generate Prisma client"
	@echo "  sql         Open Prisma Studio"
	@echo "  seed        Seed the database"
	@echo "  lint        Lint the codebase"
	@echo "  format      Format the codebase"
	@echo "  test        Run tests"
	@echo "  help        Show this help message"

# Install backend dependencies
install:
	@echo "Installing backend dependencies..."
	npm install

.PHONY: install

# Run the development server
start dev run:
	@echo "Starting the development server..."
	npm run dev
.PHONY: start dev run

# Run Prisma migrations
migrate:
	@echo "Running Prisma migrations..."
	npx prisma migrate dev
.PHONY: migrate

# Generate Prisma client
generate:
	@echo "Generating Prisma client..."
	npx prisma generate
.PHONY: generate

# Open Prisma Studio
studio sql:
	@echo "Opening Prisma Studio..."
	npx prisma studio
.PHONY: studio sql

# Seed the database
seed:
	@echo "Seeding the database..."
	npx prisma db seed
.PHONY: seed

# Lint the codebase
lint:
	@echo "Linting the codebase..."
	npm run lint
.PHONY: lint

# Format the codebase
format:
	@echo "Formatting the codebase..."
	npx prisma format
.PHONY: format

# Run tests
test:
	@echo "Running tests..."
	npm run test
.PHONY: test

# Fetch data
fetch-data fetch:
	@echo "Fetching data..."
	npx ts-node src/scripts/fetchRepresentatives.ts
	npx ts-node src/scripts/fetchBills.ts
	npx ts-node src/scripts/fetchVotes.ts
.PHONY: fetchd-ata fetch

fetch-representatives:
	@echo "Fetching representatives data..."
	npx ts-node src/scripts/fetchRepresentatives.ts
.PHONY: fetch-representatives

fetch-bills:
	@echo "Fetching bills data..."
	npx ts-node src/scripts/fetchBills.ts
.PHONY: fetch-bills

fetch-votes:
	@echo "Fetching votes data..."
	npx ts-node src/scripts/fetchVotes.ts
.PHONY: fetch-votes