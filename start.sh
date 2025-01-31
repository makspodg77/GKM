#!/bin/bash

# Uruchom backend
echo "Starting backend..."
cd /backend
npm start &

# Uruchom frontend (statyczny serwer)
echo "Starting frontend..."
cd /frontend
npm run dev 

# Utrzymuj kontener przy życiu
tail -f /dev/null