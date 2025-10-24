console.error(`
[ERROR] This file (server.js) is not the main server file.
You are likely in the project's root directory.
The backend server is located in the 'backend' directory.

Please run the server using one of the following commands:
1. cd backend && npm start
   (This uses the package.json script)

2. node backend/server.js
   (This runs the file directly from the root)

Aborting.
`);
process.exit(1);
