#!/bin/bash

# This script builds the docker images for TaskView Community Edition
# - taskview-ce-api-server
# - taskview-ce-db-migration
# - taskview-ce-webapp

set -e

VERSION=$1

# If version not provided, read from package.json
if [ -z "$VERSION" ]; then
    VERSION=$(node -p "require('./package.json').version")
fi

echo "Building TaskView CE version: $VERSION"

# Build CE API
echo "========================================="
echo "Building CE API Server..."
echo "========================================="
cd api
bash build-docker-api.sh $VERSION
cd ..

# Build CE Web
echo "========================================="
echo "Building CE Web App..."
echo "========================================="
cd web
bash build-docker-web.sh $VERSION
cd ..

echo "========================================="
echo "Build complete!"
echo "Images built:"
echo "  - gimanhead/taskview-ce-api-server:$VERSION"
echo "  - gimanhead/taskview-ce-webapp:$VERSION"
echo "========================================="
