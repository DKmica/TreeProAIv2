# --- Build Stage (Frontend) ---
FROM node:18-slim as frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Set build-time env var for API URL to be relative
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# --- Backend Stage ---
FROM node:18-slim
WORKDIR /usr/src/app

# Copy backend dependencies manifests
COPY backend/package*.json ./

# Install backend dependencies
RUN npm install --only=production

# Copy backend code
COPY backend/server.js .
COPY backend/db.js .
# Add any other .js files your backend needs

# Copy built frontend assets from the build stage
COPY --from=frontend-build /app/dist ./public

# Expose the port the Node server will run on (Cloud Run default is 8080)
EXPOSE 8080

# Run the backend server
CMD [ "node", "server.js" ]