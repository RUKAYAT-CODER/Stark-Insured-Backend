# Production Deployment Guide

## Build Application

npm run build

## Run with Node

node dist/main.js

## Using Docker

docker build -t app-name .
docker run -p 3000:3000 app-name

## Environment Variables

Set:

- DATABASE_URL
- JWT_SECRET
- NODE_ENV=production