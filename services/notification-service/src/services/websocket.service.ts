/**
 * WebSocket Service - Real-time notifications via Socket.IO
 */

import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { config } from '../config';

// ============================================================================
// TYPES
// ============================================================================

interface AuthenticatedSocket extends Socket {
  userId?: string;
  tenantId?: string;
  tenantSlug?: string;
}

interface RealTimeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
}

// Store IO instance
let io: Server | null = null;

// Track connected users by tenant
const connectedUsers = new Map<string, Map<string, Set<string>>>(); // tenantId -> userId -> socketIds

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize WebSocket server
 */
export function initializeWebSocket(httpServer: HTTPServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigins,
      credentials: true,
    },
    path: '/ws',
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    const tenantId = socket.handshake.auth.tenantId;
    const tenantSlug = socket.handshake.auth.tenantSlug;
    const userId = socket.handshake.auth.userId;

    if (!userId || !tenantId) {
      logger.warn({ socketId: socket.id }, 'WebSocket auth failed: missing credentials');
      return next(new Error('Authentication required'));
    }

    // In production, you would verify the token here
    socket.userId = userId;
    socket.tenantId = tenantId;
    socket.tenantSlug = tenantSlug;

    next();
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    const { userId, tenantId } = socket;

    if (!userId || !tenantId) {
      socket.disconnect();
      return;
    }

    logger.info({
      socketId: socket.id,
      userId,
      tenantId,
    }, 'WebSocket client connected');

    // Track connection
    addConnection(tenantId, userId, socket.id);

    // Join tenant and user rooms
    socket.join(`tenant:${tenantId}`);
    socket.join(`user:${tenantId}:${userId}`);

    // Send connection acknowledgment
    socket.emit('connected', {
      socketId: socket.id,
      userId,
      tenantId,
      timestamp: new Date().toISOString(),
    });

    // Handle client events
    socket.on('mark_read', async (data: { notificationId: string }) => {
      logger.debug({ userId, notificationId: data.notificationId }, 'Mark notification read');
      // This can trigger an update via the REST API
      socket.emit('notification_read', { notificationId: data.notificationId });
    });

    socket.on('mark_all_read', async () => {
      logger.debug({ userId }, 'Mark all notifications read');
      socket.emit('all_notifications_read', { timestamp: new Date().toISOString() });
    });

    socket.on('subscribe', (channel: string) => {
      // Allow subscribing to additional channels (e.g., project-specific)
      const allowedPrefixes = ['project:', 'task:', 'team:'];
      const isAllowed = allowedPrefixes.some(prefix => channel.startsWith(prefix));
      
      if (isAllowed) {
        socket.join(`${tenantId}:${channel}`);
        logger.debug({ userId, channel }, 'Subscribed to channel');
      }
    });

    socket.on('unsubscribe', (channel: string) => {
      socket.leave(`${tenantId}:${channel}`);
      logger.debug({ userId, channel }, 'Unsubscribed from channel');
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info({
        socketId: socket.id,
        userId,
        reason,
      }, 'WebSocket client disconnected');

      removeConnection(tenantId, userId, socket.id);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error({ socketId: socket.id, error }, 'WebSocket error');
    });
  });

  logger.info('WebSocket server initialized');

  return io;
}

/**
 * Get the Socket.IO server instance
 */
export function getIO(): Server | null {
  return io;
}

// ============================================================================
// CONNECTION TRACKING
// ============================================================================

function addConnection(tenantId: string, userId: string, socketId: string): void {
  if (!connectedUsers.has(tenantId)) {
    connectedUsers.set(tenantId, new Map());
  }

  const tenantMap = connectedUsers.get(tenantId)!;
  
  if (!tenantMap.has(userId)) {
    tenantMap.set(userId, new Set());
  }

  tenantMap.get(userId)!.add(socketId);
}

function removeConnection(tenantId: string, userId: string, socketId: string): void {
  const tenantMap = connectedUsers.get(tenantId);
  if (!tenantMap) return;

  const userSockets = tenantMap.get(userId);
  if (!userSockets) return;

  userSockets.delete(socketId);

  if (userSockets.size === 0) {
    tenantMap.delete(userId);
  }

  if (tenantMap.size === 0) {
    connectedUsers.delete(tenantId);
  }
}

/**
 * Check if a user is connected
 */
export function isUserConnected(tenantId: string, userId: string): boolean {
  const tenantMap = connectedUsers.get(tenantId);
  if (!tenantMap) return false;

  const userSockets = tenantMap.get(userId);
  return userSockets ? userSockets.size > 0 : false;
}

/**
 * Get count of connected users per tenant
 */
export function getConnectedUsersCount(tenantId: string): number {
  const tenantMap = connectedUsers.get(tenantId);
  return tenantMap ? tenantMap.size : 0;
}

/**
 * Get all connected socket IDs for a user
 */
export function getUserSocketIds(tenantId: string, userId: string): string[] {
  const tenantMap = connectedUsers.get(tenantId);
  if (!tenantMap) return [];

  const userSockets = tenantMap.get(userId);
  return userSockets ? Array.from(userSockets) : [];
}

// ============================================================================
// NOTIFICATION EMITTING
// ============================================================================

/**
 * Send notification to a specific user
 */
export function sendToUser(
  tenantId: string,
  userId: string,
  notification: RealTimeNotification
): boolean {
  if (!io) {
    logger.warn('WebSocket server not initialized');
    return false;
  }

  const room = `user:${tenantId}:${userId}`;
  io.to(room).emit('notification', notification);

  logger.debug({
    userId,
    tenantId,
    notificationId: notification.id,
    type: notification.type,
  }, 'Sent notification to user');

  return isUserConnected(tenantId, userId);
}

/**
 * Send notification to multiple users
 */
export function sendToUsers(
  tenantId: string,
  userIds: string[],
  notification: RealTimeNotification
): number {
  if (!io) {
    logger.warn('WebSocket server not initialized');
    return 0;
  }

  let deliveredCount = 0;

  userIds.forEach(userId => {
    const room = `user:${tenantId}:${userId}`;
    io!.to(room).emit('notification', notification);
    
    if (isUserConnected(tenantId, userId)) {
      deliveredCount++;
    }
  });

  logger.debug({
    tenantId,
    userCount: userIds.length,
    deliveredCount,
    notificationId: notification.id,
  }, 'Sent notification to users');

  return deliveredCount;
}

/**
 * Broadcast notification to all users in a tenant
 */
export function broadcastToTenant(
  tenantId: string,
  notification: RealTimeNotification
): void {
  if (!io) {
    logger.warn('WebSocket server not initialized');
    return;
  }

  const room = `tenant:${tenantId}`;
  io.to(room).emit('notification', notification);

  logger.debug({
    tenantId,
    connectedUsers: getConnectedUsersCount(tenantId),
    notificationId: notification.id,
  }, 'Broadcast notification to tenant');
}

/**
 * Send notification to a specific channel
 */
export function sendToChannel(
  tenantId: string,
  channel: string,
  notification: RealTimeNotification
): void {
  if (!io) {
    logger.warn('WebSocket server not initialized');
    return;
  }

  const room = `${tenantId}:${channel}`;
  io.to(room).emit('notification', notification);

  logger.debug({
    tenantId,
    channel,
    notificationId: notification.id,
  }, 'Sent notification to channel');
}

/**
 * Send generic event to a user
 */
export function emitToUser(
  tenantId: string,
  userId: string,
  event: string,
  data: any
): void {
  if (!io) return;

  const room = `user:${tenantId}:${userId}`;
  io.to(room).emit(event, data);
}

/**
 * Send generic event to all tenant users
 */
export function emitToTenant(
  tenantId: string,
  event: string,
  data: any
): void {
  if (!io) return;

  const room = `tenant:${tenantId}`;
  io.to(room).emit(event, data);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get WebSocket server stats
 */
export async function getStats(): Promise<{
  connected: number;
  tenants: number;
  rooms: number;
}> {
  if (!io) {
    return { connected: 0, tenants: 0, rooms: 0 };
  }

  const sockets = await io.fetchSockets();
  const rooms = io.sockets.adapter.rooms.size;

  return {
    connected: sockets.length,
    tenants: connectedUsers.size,
    rooms,
  };
}

/**
 * Gracefully shutdown WebSocket server
 */
export async function shutdown(): Promise<void> {
  if (!io) return;

  logger.info('Shutting down WebSocket server');

  // Notify all clients
  io.emit('server_shutdown', { message: 'Server is shutting down' });

  // Close all connections
  const sockets = await io.fetchSockets();
  sockets.forEach(socket => socket.disconnect(true));

  // Close the server
  io.close();
  io = null;

  connectedUsers.clear();

  logger.info('WebSocket server shutdown complete');
}
