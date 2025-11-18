import type { Server } from 'http';
import http from 'http';

let serverInstance: { app: any; startServer: () => Promise<void>; stopServer: (exitCode?: number) => Promise<void>; getServer: () => Server | undefined } | null = null;
let isServerStartedByTest = false;

/**
 * Check if a port is already in use
 */
const isPortInUse = async (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const testServer = http.createServer();
    
    testServer.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    
    testServer.once('listening', () => {
      testServer.close();
      resolve(false);
    });
    
    testServer.listen(port, '0.0.0.0');
  });
};

export const startTestServer = async (): Promise<void> => {
  if (serverInstance) {
    return;
  }

  const port = 3001;
  const portInUse = await isPortInUse(port);
  
  const serverModule = require('../../backend/server.js');
  serverInstance = serverModule;
  
  if (portInUse) {
    console.log(`✓ Backend server already running on port ${port}, tests will use the existing instance`);
    isServerStartedByTest = false;
    
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 500);
    });
    return;
  }
  
  try {
    await serverInstance!.startServer();
    isServerStartedByTest = true;
    
    await new Promise<void>((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 100;
      
      const checkServer = setInterval(() => {
        attempts++;
        const server = serverInstance?.getServer();
        if (server && server.listening) {
          clearInterval(checkServer);
          console.log('✓ Test server started successfully');
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkServer);
          reject(new Error('Server failed to start within timeout'));
        }
      }, 100);
    });
  } catch (err) {
    console.error('Failed to start test server:', err);
    isServerStartedByTest = false;
  }
};

export const stopTestServer = async (): Promise<void> => {
  if (!serverInstance || !isServerStartedByTest) {
    serverInstance = null;
    return;
  }

  try {
    await serverInstance.stopServer(0);
    isServerStartedByTest = false;
  } catch (err) {
    console.error('Error stopping test server:', err);
  } finally {
    serverInstance = null;
  }
};

export const getTestServerApp = () => {
  return serverInstance?.app;
};
