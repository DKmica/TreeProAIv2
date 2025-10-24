# Use an official Node.js runtime as a parent image
FROM node:18-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install backend dependencies
RUN npm install --only=production

# Copy the necessary backend code
# Only copy what's needed for the backend to run
COPY server.js .
COPY db.js .
# Add any other .js files your backend needs

# Make port 3001 available
EXPOSE 3001

# Run server.js when the container launches
CMD [ "node", "server.js" ]