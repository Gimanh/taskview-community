#!/bin/sh
# Generates runtime config for the SPA from environment variables.
# Runs automatically at container start (nginx docker-entrypoint.d).
set -e

if [ -n "${TASKVIEW_API_URL:-}" ]; then
  echo "window.__TASKVIEW_CONFIG__ = { apiUrl: \"${TASKVIEW_API_URL}\" };" > /usr/share/nginx/html/config.js
  echo "TaskView runtime config: apiUrl=${TASKVIEW_API_URL}"
fi
