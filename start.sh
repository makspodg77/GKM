#!/bin/bash

# Uruchom backend
echo "Starting backend..."
cd /backend
npm start &

# Uruchom frontend (statyczny serwer)
echo "Starting frontend..."
cd /frontend
npm run dev &  # Run the Vite dev server in the background

# Utrzymuj kontener przy życiu
tail -f /dev/null