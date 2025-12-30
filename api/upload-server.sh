#!/bin/bash

# This script build and upload all api-server data to the prod server

source secret.sh
source version.sh

# build docker image, migration script and others
bash build-docker.sh

# upload tar to the server
rsync -vrP tvs-api-$VERSION.tar $USER@$SERVER_IP:/home/user_tmp/docker-images

# replacing env file for production update
cp ./.env.production ./dist-migration/.env

# upload license files for api server 
rsync -vrP ./tv-license $USER@$SERVER_IP:/home/user_tmp/docker-images

# upload migration data to the server
rsync -vrP ./dist-migration $USER@$SERVER_IP:/home/user_tmp/docker-images

# this script will be run on the server
rsync -vrP ./update-tvs-server.sh $USER@$SERVER_IP:/home/user_tmp/docker-images

# compose file for docker compose
rsync -vrP ./docker-compose.yml $USER@$SERVER_IP:/home/user_tmp/docker-images

# copy env file for production server
rsync -vrP ./.env.docker.production $USER@$SERVER_IP:/home/user_tmp/docker-images

# copy version file for including in other bash scripts
rsync -vrP ./version.sh $USER@$SERVER_IP:/home/user_tmp/docker-images