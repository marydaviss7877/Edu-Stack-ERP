import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

let io: SocketServer | null = null;

/** Pulls a single cookie value out of a raw `Cookie` header string. */
function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  const found = header.split(';').map(c => c.trim()).find(c => c.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : undefined;
}

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (!origin || env.isDev) return cb(null, true);
        if (
          origin === env.frontendUrl ||
          origin === `https://${env.baseDomain}` ||
          origin.endsWith(`.${env.baseDomain}`) ||
          (env.vercelPreviewUrl && origin === env.vercelPreviewUrl)
        ) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    // The web app authenticates via an HttpOnly `accessToken` cookie (JS can't read it
    // to pass it explicitly), so prefer the cookie and fall back to an explicit auth
    // token for clients that pass one directly (e.g. a future mobile socket client).
    const token = socket.handshake.auth.token || readCookie(socket.handshake.headers.cookie, 'accessToken');
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = jwt.verify(token, env.jwtSecret) as {
        userId: string;
        orgId?: string;
        branchId?: string;
        role: string;
      };
      socket.data.userId = payload.userId;
      socket.data.orgId = payload.orgId;
      socket.data.branchId = payload.branchId;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, orgId, branchId } = socket.data;

    // Join personal room for targeted notifications
    socket.join(`user:${userId}`);

    // Join org+branch room for broadcast messages
    if (orgId && branchId) {
      socket.join(`branch:${orgId}:${branchId}`);
    }

    socket.on('disconnect', () => {
      socket.leave(`user:${userId}`);
    });
  });

  return io;
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

/** Send a notification to a specific user */
export function emitToUser(userId: string, event: string, data: unknown): void {
  getIO().to(`user:${userId}`).emit(event, data);
}

/** Broadcast to all users in a branch */
export function emitToBranch(orgId: string, branchId: string, event: string, data: unknown): void {
  getIO().to(`branch:${orgId}:${branchId}`).emit(event, data);
}
