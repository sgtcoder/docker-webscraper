#!/bin/bash

REGISTRY="sgtcoder"
PROJECT_NAME="webscraper"

#./deploy-docker.sh --no-cache

npm update --prefix app

docker build $1 -t $REGISTRY/$PROJECT_NAME . || exit 1

docker push $REGISTRY/$PROJECT_NAME
