# --- Build Stage (Frontend) ---
FROM node:18-slim as treepro_frontend_build_stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Set build-time env var for API URL to be relative
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# --- Build Stage (Frontend) ---
# This stage runs with the root directory as context
FROM node:18-slim as frontend-build
WORKDIR /app
# Copy root package files first
COPY package*.json ./
RUN npm install
# Copy the rest of the project (including frontend source)
COPY . .
# Set build-time env var for API URL to be relative
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL
# Build the frontend (output goes to /app/dist)
RUN npm run build

# --- Backend Stage ---
FROM node:18-slim
WORKDIR /usr/src/app

# Copy backend dependencies manifests *from the backend subfolder*
COPY backend/package*.json ./

# Install backend dependencies
RUN npm install --only=production

# Copy backend code *from the backend subfolder*
COPY backend/server.js .
COPY backend/db.js .
# Add any other .js files your backend needs, referencing their path from the root
# e.g., COPY backend/some-other-file.js .

# Copy built frontend assets from the renamed build stage
COPY --from=treepro_frontend_build_stage /app/dist ./public

# Expose the port the Node server will run on (Cloud Run default is 8080)
EXPOSE 8080

# Run the backend server
CMD [ "node", "server.js" ]