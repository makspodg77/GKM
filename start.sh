#!/bin/bash

# Uruchom backend
echo "Starting backend..."
cd ./backend
npm start &

# Utrzymuj kontener przy życiu
tail -f /dev/null