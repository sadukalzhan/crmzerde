// Realtime через Socket.IO: обновление канбана и уведомлений.
import { Server as SocketServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { verifyToken } from './auth';
import { env } from './env';
import type { Role } from '../domain/roles';

let io: SocketServer | null = null;

export function initRealtime(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  // Аутентификация по токену в handshake.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Не авторизован'));
    try {
      const payload = verifyToken(token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('Неверный токен'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    const role = socket.data.role as Role;
    socket.join(`user:${userId}`);
    socket.join(`role:${role}`);
  });

  return io;
}

export function getIo(): SocketServer | null {
  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function emitToRole(role: Role, event: string, payload: unknown): void {
  io?.to(`role:${role}`).emit(event, payload);
}

/** Глобальное событие изменения доски (канбан обновляется у всех сотрудников). */
export function emitBoardChanged(payload: unknown): void {
  io?.emit('board:changed', payload);
}
