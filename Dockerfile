# Use an official Node.js runtime as a parent image
FROM node:14

# Set the working directory
WORKDIR /app

# Copy the package.json and package-lock.json files
COPY backend/package*.json ./

# Install backend dependencies
RUN npm install

# Copy the backend and frontend directories
COPY backend ./backend
COPY frontend ./frontend

# Build the React application
RUN cd frontend && npm run build

# Set the working directory to the backend
WORKDIR /app/backend

# Copy the built React application to the backend's public directory
RUN mkdir -p public && cp -r ../frontend/build/* public/

# Expose the port the app runs on
EXPOSE 5000

# Start the Node.js server
CMD ["node", "index.js"]