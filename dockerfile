# Use an official Node.js runtime as a parent image
FROM node:18-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if you had backend dependencies)
# COPY package*.json ./
# RUN npm install --only=production # Uncomment if you add backend dependencies

# Copy the server code
COPY server.js ./
# Copy the .ts file and rename it to .js for the server to find
COPY data/mockData.ts ./data/mockData.js

# Make port 3001 available to the world outside this container
EXPOSE 3001

# Run server.js when the container launches
CMD [ "node", "server.js" ]