# TreePro AI - Full-Stack Application

This application now includes both a frontend user interface and a backend API server. To run the application properly, you must start both services.

## Prerequisites

- Node.js installed on your system.
- A modern web browser.

## Running the Application

You will need to open **two separate terminal windows** to run the backend server and the frontend development server simultaneously.

### 1. Start the Backend Server

In your first terminal window, run the following command to start the Node.js API server:

```bash
node server.js
```

You should see the following output, confirming the server is running:

```
Backend server running on http://localhost:3001
```

**Leave this terminal window open.** It is now serving your application's data.

### 2. Start the Frontend Application

In your second terminal window, start the frontend React application using the standard command:

```bash
npm start
```

This will automatically open the TreePro AI application in your web browser. The application will now fetch all of its data from your local backend server.

## How It Works

- The **Backend Server** (`server.js`) runs on `http://localhost:3001`. It manages all the application data (customers, jobs, etc.) in memory and provides a RESTful API for the frontend to use.
- The **Frontend Application** (`npm start`) runs on a different port (e.g., `http://localhost:3000`) and makes API calls to the backend server to get and modify data.
