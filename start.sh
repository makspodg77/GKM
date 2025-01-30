#!/bin/bash

# Uruchom aplikacje za pomocą PM2
echo "Starting applications with PM2..."
pm2 start ecosystem.config.js

# Utrzymuj kontener przy życiu
pm2 logs