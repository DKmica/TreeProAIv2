# Use an official Node.js runtime as a parent image
FROM node:18-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if you had backend dependencies)
# COPY package*.json ./
# RUN npm install --only=production # Uncomment if you add backend dependencies

# Copy the server code and data
# Make sure your mockData.js is in a 'data' subdirectory relative to server.js
COPY server.js ./
COPY data/mockData.js ./data/

# Make port 3001 available to the world outside this container
EXPOSE 3001

# Define environment variable (optional, Cloud Run can inject this too)
# ENV PORT=3001

# Run server.js when the container launches
CMD [ "node", "server.js" ]