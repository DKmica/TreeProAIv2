# TreePro AI - Full-Stack Application

This application includes a frontend user interface and a backend API server designed to connect to a PostgreSQL database (like Google Cloud SQL).

## Running the Full Stack

There are two main ways to run this application:
1.  **Frontend Locally + Backend on Cloud Run:** The recommended approach for testing your deployed backend.
2.  **Frontend Locally + Backend Locally:** Best for rapid backend development.

---

### 1. Database Setup (One-Time Task)

Before running the backend for the first time, you must set up your PostgreSQL database schema.

1.  **Connect** to your Cloud SQL instance or local PostgreSQL database using a SQL client (like `psql`, DBeaver, or the Google Cloud Shell).
2.  **Execute** the entire contents of the `backend/init.sql` file. This will create all the necessary tables (`customers`, `jobs`, `quotes`, etc.) with the correct structure.

---

### 2. Backend Setup & Running

The backend code is located in the `backend/` directory.

**A. Install Dependencies:**
Navigate into the backend directory and install the required Node.js packages.

```bash
cd backend
npm install
cd .. 
# Go back to the root directory
```

**B. Configure Environment Variables:**
The backend connects to your database using environment variables. Create a `.env` file inside the `backend/` directory (`backend/.env`) with the following content, replacing the placeholder values with your actual database credentials:

```env
# Example for a standard PostgreSQL connection
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# Example for Google Cloud SQL (often requires SSL)
# DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
```

**C. Running the Backend:**

To run the backend server, execute the following command from the **root** directory of the project:

```bash
node backend/server.js
```

You should see the output: `Backend server running on http://localhost:3001`.

---

### 3. Frontend Setup & Running

The frontend needs to know the URL of your backend API.

**A. Configure Environment Variable:**
In the **root** directory of the project, create a file named `.env` and add the following line:

```env
# To connect to your deployed backend on Cloud Run (replace with your URL)
REACT_APP_API_URL=https://your-cloud-run-service-url.a.run.app

# To connect to your local backend server
# REACT_APP_API_URL=http://localhost:3001
```

**B. Running the Frontend:**
Start the frontend React application from the **root** directory:

```bash
npm start
```

This will open the application in your browser. It will now make API calls to the URL you specified in your `.env` file.
