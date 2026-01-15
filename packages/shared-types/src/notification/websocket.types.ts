/**
 * WebSocket Types - Real-time communication
 */

export type WebSocketMessageType =
  | 'notification'
  | 'chat'
  | 'presence'
  | 'typing'
  | 'task_update'
  | 'project_update'
  | 'meeting_update'
  | 'system'
  | 'ping'
  | 'pong';

export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  event: string;
  payload: T;
  timestamp: Date;
  senderId?: string;
  tenantId: string;
  targetUserIds?: string[];
  targetRoomId?: string;
}

export interface PresenceUpdate {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeenAt: Date;
  currentActivity?: string;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  roomId: string;
  isTyping: boolean;
}

export interface WebSocketRoom {
  id: string;
  type: 'direct' | 'group' | 'project' | 'task' | 'meeting';
  participants: string[];
  name?: string;
  createdAt: Date;
}

export interface WebSocketConnection {
  connectionId: string;
  userId: string;
  tenantId: string;
  deviceId?: string;
  connectedAt: Date;
  lastActivityAt: Date;
  rooms: string[];
}

export interface RealtimeSubscription {
  userId: string;
  channels: string[];
  topics: string[];
  filters?: Record<string, unknown>;
}
