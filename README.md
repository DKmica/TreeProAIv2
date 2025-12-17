# TreePro Anywhere

A clean, portable rewrite of the TreePro stack. The repo contains a lightweight React + Vite frontend and an Express server that serves the compiled assets and a simple health endpoint. No database or vendor-specific services are required, making it easy to build and deploy on any platform.

## Getting started

```bash
npm install
npm run dev # starts Vite on 5173
```

## Production build

```bash
npm run build         # compiles the React app to dist/
node server/index.js  # serves dist/ and exposes /api/health
```

Set `PORT` to override the default runtime port (4173).

## Docker

A slim multi-stage image is available:

```bash
docker build -t treepro-anywhere .
docker run -p 4173:4173 treepro-anywhere
```

## Project structure

- `src/` – React components, pages, and styles.
- `server/` – Express server that serves static assets and health checks.
- `index.html` – Vite entry.

This reset removes previous vendor-specific assets and leaves a portable baseline you can extend with your own services.
