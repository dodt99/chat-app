import { Server, Socket } from 'socket.io';
import { AppDataSource } from '../../data-source';
import { User } from '../../entities/User';
import { ConversationMember } from '../../entities/ConversationMember';
import { addOnlineUser, removeOnlineUser } from '../onlineUsers';
import { UserStatusPayload } from '@chat-app/shared';

export function registerStatusHandlers(io: Server, socket: Socket, userId: string): void {
  addOnlineUser(userId, socket.id);

  // Auto-join all conversation rooms this user belongs to
  (async () => {
    const memberships = await AppDataSource.getRepository(ConversationMember).find({
      where: { userId },
    });
    for (const m of memberships) {
      await socket.join(`conversation:${m.conversationId}`);
    }

    // Broadcast online status to all connected clients
    const payload: UserStatusPayload = { userId, isOnline: true, lastSeen: new Date() };
    socket.broadcast.emit('user:status', payload);
  })().catch((err: unknown) => {
    console.error(`[socket] Failed to initialize rooms for user ${userId}:`, err);
  });

  socket.on('disconnect', async () => {
    removeOnlineUser(userId);
    const lastSeen = new Date();
    await AppDataSource.getRepository(User).update({ id: userId }, { lastSeen });
    const payload: UserStatusPayload = { userId, isOnline: false, lastSeen };
    socket.broadcast.emit('user:status', payload);
  });
}
