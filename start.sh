#!/bin/bash

# Uruchom backend
echo "Starting backend..."
cd /backend
npm start &

# Uruchom frontend (statyczny serwer)
echo "Starting frontend..."
cd /frontend
npx serve -p 8080 -s dist &

# Utrzymuj kontener przy życiu
tail -f /dev/null