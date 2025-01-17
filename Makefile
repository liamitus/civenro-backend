# Makefile for Civenro Backend

# Specify the shell to use (optional, defaults to /bin/sh)
SHELL := /bin/bash

# Display help
help:
	@echo "Civenro Backend Makefile"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  fetch-bills     Fetch bills data"
	@echo "  fetch-data      Fetch data"
	@echo "  fetch-representatives Fetch representatives data"
	@echo "  db              Run the database"
	@echo "  format          Format the codebase"
	@echo "  generate        Generate Prisma client"
	@echo "  init            Initialize the database"
	@echo "  install         Install backend dependencies"
	@echo "  lint            Lint the codebase"
	@echo "  migrate         Run Prisma migrations"
	@echo "  seed            Seed the database"
	@echo "  sql             Open Prisma Studio"
	@echo "  start dev run   Run the development server"
	@echo "  test            Run tests"

# Run the database
db: .PHONY
	@echo "Running the database..."
	docker compose up

fetch-bills: .PHONY
	@echo "Fetching bills data..."
	curl -X POST http://localhost:5001/api/admin/fetch-bills

fetch-data fetch: .PHONY
	@echo "Fetching data..."
	curl -X POST http://localhost:5001/api/admin/fetch-bills
	curl -X POST http://localhost:5001/api/admin/fetch-representatives
	curl -X POST http://localhost:5001/api/admin/fetch-votes

fetch-representatives: .PHONY
	@echo "Fetching representatives data..."
	curl -X POST http://localhost:5001/api/admin/fetch-representatives

fetch-votes: .PHONY
	@echo "Fetching votes data..."
	curl -X POST http://localhost:5001/api/admin/fetch-votes

# Format the codebase
format: .PHONY
	@echo "Formatting the codebase..."
	npx prisma format

# Generate Prisma client
generate: .PHONY
	@echo "Generating Prisma client..."
	npx prisma generate

init: .PHONY
	@echo "Initializing the database..."
	npx prisma db push

# Install backend dependencies
install: .PHONY
	@echo "Installing backend dependencies..."
	npm install

# Lint the codebase
lint: .PHONY
	@echo "Linting the codebase..."
	npm run lint

# Run Prisma migrations
migrate: .PHONY
	@echo "Running Prisma migrations..."
	npx prisma migrate dev

# Seed the database
seed: .PHONY
	@echo "Seeding the database..."
	npx prisma db seed

# Open Prisma Studio
sql: .PHONY
	@echo "Opening Prisma Studio..."
	npx prisma studio

# Connect to the production database
sql-prod: .PHONY
	@echo "Connecting to production database..."
	railway connect Postgres 

# Run the server in development mode
start dev: .PHONY
	@echo "Starting the development server..."
	npm run dev

# Run the server
run: .PHONY
	@echo "Building..."
	npm run build
	@echo "Starting the server..."
	npm run start

# Run tests
test: .PHONY
	@echo "Running tests..."
	npm run test

test-debug: .PHONY
	@echo "Running tests in debug mode..."
	npm run test:debug

.PHONY: