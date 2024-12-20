# Use an official Node.js runtime as a parent image
FROM node:18

# Install dependencies required by msnodesqlv8
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    unixodbc-dev

# Set the working directory
WORKDIR /app

# Copy the backend package.json and package-lock.json files
COPY backend/package*.json ./backend/

# Copy the frontend package.json, package-lock.json, tsconfig.json, and source files
COPY frontend/package*.json ./frontend/
COPY frontend/tsconfig.json ./frontend/
COPY frontend/src ./frontend/src
COPY frontend/public ./frontend/public
COPY frontend/index.html ./frontend/

# Install backend dependencies
RUN cd backend && npm install

# Install frontend dependencies and build the React application
RUN cd frontend && npm install && npm run build

# Copy the backend and frontend directories
COPY backend ./backend
COPY frontend ./frontend

# Set the working directory to the backend
WORKDIR /app/backend

# Rebuild the msnodesqlv8 module
RUN npm rebuild msnodesqlv8

# Copy the built React application to the backend's public directory
RUN mkdir -p public && cp -r ../frontend/dist/* public/

# Expose the port the app runs on
EXPOSE 3000

# Start the Node.js server
CMD ["node", "index.js"]