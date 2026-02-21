#!/bin/bash

# This script builds the docker image for the taskview-ce-webapp

VERSION=$1

pnpm build

docker buildx build --platform=linux/amd64,linux/arm64 -t gimanhead/taskview-ce-webapp:$VERSION -t gimanhead/taskview-ce-webapp:latest . --load