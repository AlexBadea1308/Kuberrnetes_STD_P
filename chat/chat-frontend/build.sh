#!/bin/bash

# Construim imaginea
docker build -t chat-frontend .

# Tag pentru registry-ul local
docker tag chat-frontend localhost:32000/chat-frontend:latest

# Împingem în registry
docker push localhost:32000/chat-frontend:latest 