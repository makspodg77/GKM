# Use an official Node.js runtime as a parent image
FROM node:18

# Install system dependencies for msnodesqlv8 and ODBC Driver 17 for SQL Server
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    unixodbc-dev \
    curl \
    apt-transport-https \
    gnupg \
    software-properties-common && \
    curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - && \
    curl https://packages.microsoft.com/config/ubuntu/18.04/prod.list > /etc/apt/sources.list.d/mssql-release.list && \
    apt-get update && ACCEPT_EULA=Y apt-get install -y msodbcsql17 && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy and install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copy and install frontend dependencies
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# Build the React frontend
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Copy backend source code
COPY backend/ ./backend/

# Move built frontend files to backend's public directory
RUN mkdir -p backend/public && cp -r frontend/build/* backend/public/

# Set the working directory to backend
WORKDIR /app/backend

# Rebuild msnodesqlv8 if necessary
RUN npm rebuild msnodesqlv8

# Expose the application port
EXPOSE 3000

# Start the Node.js server
CMD ["npm", "start"]
