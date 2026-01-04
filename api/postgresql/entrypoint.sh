#!/bin/sh
# entrypoint.sh

echo "Waiting for the database service to be ready..."

# Wait for the database service to be ready
until PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c '\q'; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 2
done

>&2 echo "Postgres is up - executing command"

# Check if tables exist in the 'tasks' schema using SQL query.
# 'count(*)' will return 0 if there are no tables.
# We read this result and make a decision.
TABLE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'tasks';" | xargs)

if [ "$TABLE_COUNT" -eq 0 ]; then
  echo "No tables found in the 'tasks' schema. Running migration with --create."
  node /app-migration/taskview-db-migration.js --create
else
  echo "Tables already exist in the 'tasks' schema ($TABLE_COUNT tables found). Running standard migration."
  node /app-migration/taskview-db-migration.js
fi

# Check the exit code of the migration script
if [ $? -ne 0 ]; then
  >&2 echo "Migration failed! Exiting with an error."
  exit 1
else
  >&2 echo "Migration successful!"
  exit 0
fi
