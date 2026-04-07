import { Server, Socket } from 'socket.io';
import { AppDataSource } from '../../data-source';
import { Message } from '../../entities/Message';
import { MessageStatus } from '../../entities/MessageStatus';
import { User } from '../../entities/User';
import { ConversationMember } from '../../entities/ConversationMember';
import {
  SendMessagePayload,
  ReadMessagePayload,
  EditMessagePayload,
  DeleteMessagePayload,
  JoinConversationPayload,
  MessagePayload,
  UserPublic,
} from '@chat-app/shared';

function toUserPublic(user: User): UserPublic {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    lastSeen: user.lastSeen ?? new Date(),
  };
}

async function buildMessagePayload(message: Message): Promise<MessagePayload> {
  const sender = await AppDataSource.getRepository(User).findOneOrFail({ where: { id: message.senderId } });
  const statuses = await AppDataSource.getRepository(MessageStatus).find({ where: { messageId: message.id } });
  return {
    id: message.id,
    content: message.deletedAt ? '' : message.content,
    conversationId: message.conversationId,
    sender: toUserPublic(sender),
    isEdited: message.isEdited,
    deletedAt: message.deletedAt,
    createdAt: message.createdAt,
    statuses: statuses.map((s) => ({ userId: s.userId, status: s.status })),
  };
}

export function registerMessageHandlers(io: Server, socket: Socket, userId: string): void {
  // Join a conversation's socket room on demand
  socket.on('conversation:join', async ({ conversationId }: JoinConversationPayload) => {
    const isMember = await AppDataSource.getRepository(ConversationMember).findOne({
      where: { conversationId, userId },
    });
    if (!isMember) return;
    await socket.join(`conversation:${conversationId}`);
  });

  // Send a message
  socket.on('message:send', async ({ conversationId, content }: SendMessagePayload) => {
    const isMember = await AppDataSource.getRepository(ConversationMember).findOne({
      where: { conversationId, userId },
    });
    if (!isMember) return;

    const msgRepo = AppDataSource.getRepository(Message);
    const message = msgRepo.create({ conversationId, content, senderId: userId });
    await msgRepo.save(message);

    // Mark as delivered for sender
    const statusRepo = AppDataSource.getRepository(MessageStatus);
    const delivered = statusRepo.create({ messageId: message.id, userId, status: 'delivered' });
    await statusRepo.save(delivered);

    const payload = await buildMessagePayload(message);

    // Notify sender: delivered
    socket.emit('message:delivered', { messageId: message.id });

    // Broadcast to entire conversation room
    io.to(`conversation:${conversationId}`).emit('message:new', payload);
  });

  // Mark message as read
  socket.on('message:read', async ({ messageId, conversationId }: ReadMessagePayload) => {
    const statusRepo = AppDataSource.getRepository(MessageStatus);
    const existing = await statusRepo.findOne({ where: { messageId, userId } });
    if (existing) {
      existing.status = 'read';
      await statusRepo.save(existing);
    } else {
      await statusRepo.save(statusRepo.create({ messageId, userId, status: 'read' }));
    }
    io.to(`conversation:${conversationId}`).emit('message:read_update', { messageId, userId });
  });

  // Edit a message (sender only)
  socket.on('message:edit', async ({ messageId, content }: EditMessagePayload) => {
    const repo = AppDataSource.getRepository(Message);
    const message = await repo.findOne({ where: { id: messageId, senderId: userId } });
    if (!message || message.deletedAt) return;

    message.content = content;
    message.isEdited = true;
    await repo.save(message);

    io.to(`conversation:${message.conversationId}`).emit('message:edited', { messageId, content });
  });

  // Delete a message — soft delete (sender only)
  socket.on('message:delete', async ({ messageId, conversationId }: DeleteMessagePayload) => {
    const repo = AppDataSource.getRepository(Message);
    const message = await repo.findOne({ where: { id: messageId, senderId: userId } });
    if (!message) return;

    message.deletedAt = new Date();
    await repo.save(message);

    io.to(`conversation:${conversationId}`).emit('message:deleted', { messageId, conversationId });
  });
}
