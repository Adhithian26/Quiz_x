import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { setupSocketHandlers } from './socket';
import { config } from './config';

const { app, sessionManager } = createApp();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling']
});

setupSocketHandlers(io, sessionManager);

server.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`🚀 QuizX Live Server running on port ${config.port}`);
  console.log(`📡 Environment: ${config.nodeEnv}`);
  console.log(`🔌 Database Mode: ${config.hasSupabase ? 'Supabase PostgreSQL' : 'Local Fast Memory Adapter'}`);
  console.log(`🔑 Host Passcode: ${config.hostSecret}`);
  console.log(`=======================================================`);
});

// Graceful shutdown handling
const gracefulShutdown = () => {
  console.log('\n[Server] Graceful shutdown initiated...');
  server.close(() => {
    console.log('[Server] HTTP and Socket server closed.');
    process.exit(0);
  });

  // Force shutdown after 5 seconds if connections hang
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout.');
    process.exit(1);
  }, 5000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export { app, server, io, sessionManager };
