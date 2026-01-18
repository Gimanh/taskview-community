#!/bin/bash

VERSION=$1

docker buildx build --platform=linux/amd64,linux/arm64 -t gimanhead/taskview-ce-db-migration:$VERSION -t gimanhead/taskview-ce-db-migration:latest . --load
