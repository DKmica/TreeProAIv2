# TreePro AI - Full-Stack Application

This application bundles a React frontend and a Node.js/Express backend API server (connecting to PostgreSQL) into a single container deployable on Google Cloud Run.

## Project Structure

- `/`: Contains frontend code (React, Vite), Dockerfile for combined build, `cloudbuild.yaml`.
- `/backend`: Contains backend code (Node.js, Express), database initialization (`init.sql`), `db.js`.

## Setup and Running

### 1. Database Setup (One-Time Task)

Before running the application for the first time, set up your PostgreSQL database schema.

1.  **Connect** to your Cloud SQL instance or local PostgreSQL database.
2.  **Execute** the entire contents of `backend/init.sql`. This creates the necessary tables.

### 2. Environment Variables

**A. Backend Database Connection:**
Create a `.env` file inside the `backend/` directory (`backend/.env`) with your database connection string:

```env
# Example for standard PostgreSQL
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# Example for Google Cloud SQL (using Cloud SQL Proxy locally or direct connection)
# DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"

# Add your Gemini API Key here if needed by the backend directly
# GEMINI_API_KEY="YOUR_GEMINI_API_KEY"