#!/bin/bash
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy


if [ "$NODE_ENV" != "production" ]; then
  echo "Seeding the database..."
  npx prisma db seed
else
  echo "Skipping seeding because NODE_ENV=$NODE_ENV"
fi

echo "Starting the server..."
exec "$@"