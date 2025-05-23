#!/bin/bash

# Construim imaginea
docker build -t chat-backend .

# Tag pentru registry-ul local
docker tag chat-backend localhost:32000/chat-backend:latest

# Împingem în registry
docker push localhost:32000/chat-backend:latest