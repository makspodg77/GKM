#!/bin/bash

# Uruchom backend
echo "Starting backend..."
cd /app/backend
npm start &

# Uruchom frontend (statyczny serwer)
echo "Starting frontend..."
cd /app/frontend
npx serve -p 8080 -s dist &

# Utrzymuj kontener przy życiu
tail -f /dev/null