# Stage 1: Build the React application
FROM node:18-slim as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Set build-time env var for API URL (will be relative in combined setup)
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# Stage 2: Serve the built assets using a lightweight server (e.g., Nginx)
# We will actually copy these assets into the backend container in the next step,
# but this stage is defined here for clarity and potential standalone frontend deployment.
FROM nginx:alpine as final
COPY --from=build /app/dist /usr/share/nginx/html
# Add a simple nginx config if needed, e.g., to handle routing for SPA
# COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]