#!/bin/bash

API_KEY="48d63c8247debed3e9456b6f707071a432a6ad3e74eea14e15d6a3663b4dd2bc8fbcac8132a31e67c84a6088e14e6dbd2d2db1f1a8d618ffbcca1409fce9ade8"
BASE_URL="https://civenro-backend-production.up.railway.app"
HEALTH_ENDPOINT="$BASE_URL"
BILLS_ENDPOINT="$BASE_URL/api/admin/fetch-bills"
REPS_ENDPOINT="$BASE_URL/api/admin/fetch-representatives"
VOTES_ENDPOINT="$BASE_URL/api/admin/fetch-votes"

MAX_ATTEMPTS=20
SLEEP_SECONDS=10

echo "Running data collection"

# Wait for the backend to be ready
attempt=1
while [ $attempt -le $MAX_ATTEMPTS ]; do
  echo "Checking server health (attempt $attempt/$MAX_ATTEMPTS)..."
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_ENDPOINT)
  
  if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "Server is ready!"
    break
  else
    echo "Server not ready, received HTTP status $HTTP_STATUS. Waiting $SLEEP_SECONDS seconds..."
    sleep $SLEEP_SECONDS
  fi
  
  attempt=$((attempt+1))
done

# If server never became ready, exit
if [ $attempt -gt $MAX_ATTEMPTS ]; then
  echo "ERROR: Server did not become ready after $MAX_ATTEMPTS attempts."
  exit 1
fi

# If we reach here, the server is up and responding
echo "Fetching bills..."
curl -X POST -H "x-api-key: $API_KEY" $BILLS_ENDPOINT

echo "Fetching representatives..."
curl -X POST -H "x-api-key: $API_KEY" $REPS_ENDPOINT

echo "Fetching votes..."
curl -X POST -H "x-api-key: $API_KEY" $VOTES_ENDPOINT
