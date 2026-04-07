import { Server } from 'socket.io';
import http from 'http';
import dotenv from 'dotenv';
import { verifyToken } from '../utils/jwt';
import { registerStatusHandlers } from './handlers/statusHandlers';
import { registerMessageHandlers } from './handlers/messageHandlers';
import { registerTypingHandlers } from './handlers/typingHandlers';

dotenv.config();

export function setupSocket(httpServer: http.Server): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  // JWT auth middleware — runs before any event
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = verifyToken(token);
      socket.data.userId = payload.userId;
      socket.data.username = payload.username;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId: string = socket.data.userId;
    const username: string = socket.data.username;

    registerStatusHandlers(io, socket, userId);
    registerMessageHandlers(io, socket, userId);
    registerTypingHandlers(socket, username);
    // registerConversationHandlers(io, socket, userId); // Task 8
  });

  return io;
}
