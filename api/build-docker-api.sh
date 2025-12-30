#!/bin/bash

# This script builds the docker image for the taskview-ce-api-server and migration container
# Build multiple docker images for different platforms

VERSION=$1

node -v

# Build the server scripts for the docker container (obfuscated scripts)
npm run vite-build-docker

# Create the taskview-server.js file for running the server 
# (taskview-server-api.jsc is bytecode file that will be created by bytenode when docker file is run)
echo "const bytenode = require('bytenode');  require('./taskview-server-api.jsc');" > ./dist/taskview-server.js

# Copy the production package.json to the dist folder
cp ./production.package.json ./dist/package.json

# Copy the production ecosystem.config.js to the dist folder
cp ./production.ecosystem.config.js ./dist/ecosystem.config.js

# Build the migration scripts for the docker container (obfuscated scripts)
npm run vite-build-migration
mkdir ./dist-migration/taskview
cp -R ./src/migrations/taskview/* ./dist-migration/taskview
node ./commands/copy-migration-files.js

docker buildx build --platform=linux/amd64,linux/arm64 -t gimanhead/taskview-ce-api-server:$VERSION -t gimanhead/taskview-ce-api-server:latest . --load

cd postgresql
bash ./build-docker-migrations.sh $VERSION
cd ..