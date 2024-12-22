#!/bin/bash
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Seeding the database..."
npx prisma db seed

echo "Starting the server..."
exec "$@"