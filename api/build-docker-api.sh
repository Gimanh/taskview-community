#!/bin/bash

# This script builds the docker image for the taskview-ce-api-server and migration container
# Build multiple docker images for different platforms

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Usage: ./build-docker-api.sh <version>"
    echo "Example: ./build-docker-api.sh 1.17.0"
    exit 1
fi

node -v

# Build the server scripts for the docker container
npm run build:docker

# Copy the production package.json to the dist folder
cp ./production.package.json ./dist/package.json

# Copy the production ecosystem.config.js to the dist folder
cp ./production.ecosystem.config.js ./dist/ecosystem.config.js

# Build the migration scripts for the docker container
npm run build:migration
mkdir -p ./dist-migration/taskview
cp -R ./src/migrations/taskview/* ./dist-migration/taskview
node ./commands/copy-migration-files.js

echo "Building docker image..."
docker buildx build --platform=linux/amd64,linux/arm64 -t gimanhead/taskview-ce-api-server:$VERSION -t gimanhead/taskview-ce-api-server:latest . --load

cd postgresql
bash ./build-docker-migrations.sh $VERSION
cd ..

echo "Build complete! Image: gimanhead/taskview-ce-api-server:$VERSION"
