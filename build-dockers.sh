#!/bin/bash

# This script builds the docker images for the taskview-ce-monorepo
# - taskview-ce-api-server
# - taskview-ce-db-migration
# - taskview-ce-webapp

VERSION=$(node -p "require('./package.json').version")

echo $VERSION

cd api
bash build-docker-api.sh $VERSION
cd ..


cd web
bash build-docker-web.sh $VERSION
cd ..