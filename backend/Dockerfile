# --- Build Stage (Frontend) ---
# Use Node 20+ to satisfy dependency requirements
FROM node:20-slim as treepro_frontend_build_stage
WORKDIR /app
# Copy root package files first
COPY package*.json ./
RUN npm install
# Copy the rest of the project (including frontend source)
COPY . .
# Define build-time args for API keys
ARG REACT_APP_API_URL=/api
ARG GOOGLE_MAPS_KEY
ARG GEMINI_API_KEY
# Set build-time env vars from args
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV VITE_GOOGLE_MAPS_KEY=$GOOGLE_MAPS_KEY # Vite uses VITE_ prefix by default
ENV VITE_GEMINI_API_KEY=$GEMINI_API_KEY # Vite uses VITE_ prefix by default
# Build the frontend (output goes to /app/dist)
RUN npm run build

# --- Backend Stage ---
# Use Node 20+ consistently
FROM node:20-slim
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

# Copy built frontend assets from the build stage into a 'public' folder
COPY --from=treepro_frontend_build_stage /app/dist ./public

# Expose the port the Node server will run on (Cloud Run default is 8080)
EXPOSE 8080

# Run the backend server
CMD [ "node", "server.js" ]