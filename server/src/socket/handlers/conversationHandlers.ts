import { Server, Socket } from 'socket.io';
import { In } from 'typeorm';
import { AppDataSource } from '../../data-source';
import { Conversation } from '../../entities/Conversation';
import { ConversationMember } from '../../entities/ConversationMember';
import { User } from '../../entities/User';
import { Message } from '../../entities/Message';
import { MessageStatus } from '../../entities/MessageStatus';
import {
  CreateDMPayload,
  CreateGroupPayload,
  AddMemberPayload,
  RemoveMemberPayload,
  ConversationSummary,
  MessagePayload,
  UserPublic,
} from '@chat-app/shared';
import { getSocketId } from '../onlineUsers';

function toUserPublic(user: User): UserPublic {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    lastSeen: user.lastSeen ?? new Date(),
  };
}

async function buildLastMessage(conversationId: string): Promise<MessagePayload | null> {
  const msgRepo = AppDataSource.getRepository(Message);
  const userRepo = AppDataSource.getRepository(User);
  const statusRepo = AppDataSource.getRepository(MessageStatus);

  const msg = await msgRepo.findOne({
    where: { conversationId },
    order: { createdAt: 'DESC' },
  });
  if (!msg) return null;

  const sender = await userRepo.findOneOrFail({ where: { id: msg.senderId } });
  const statuses = await statusRepo.find({ where: { messageId: msg.id } });

  return {
    id: msg.id,
    content: msg.content,
    conversationId: msg.conversationId,
    sender: toUserPublic(sender),
    isEdited: msg.isEdited,
    deletedAt: msg.deletedAt,
    createdAt: msg.createdAt,
    statuses: statuses.map((s) => ({ userId: s.userId, status: s.status })),
  };
}

async function buildConversationSummary(conversation: Conversation): Promise<ConversationSummary> {
  const memberRepo = AppDataSource.getRepository(ConversationMember);
  const userRepo = AppDataSource.getRepository(User);

  const memberships = await memberRepo.find({ where: { conversationId: conversation.id } });
  const users = await userRepo.find({ where: { id: In(memberships.map((m) => m.userId)) } });
  const lastMessage = await buildLastMessage(conversation.id);

  return {
    id: conversation.id,
    type: conversation.type,
    name: conversation.name,
    createdBy: conversation.createdBy,
    createdAt: conversation.createdAt,
    members: users.map(toUserPublic),
    lastMessage,
  };
}

async function joinRoomForUser(io: Server, targetUserId: string, roomName: string): Promise<void> {
  const socketId = getSocketId(targetUserId);
  if (!socketId) return; // user is offline, they'll join when they reconnect via statusHandlers
  const targetSocket = io.sockets.sockets.get(socketId);
  if (targetSocket) {
    await targetSocket.join(roomName);
  }
}

export function registerConversationHandlers(io: Server, socket: Socket, userId: string): void {
  // Fetch all conversations for the current user
  socket.on('conversation:list', async (callback?: (conversations: ConversationSummary[]) => void) => {
    const memberRepo = AppDataSource.getRepository(ConversationMember);
    const convRepo = AppDataSource.getRepository(Conversation);

    const memberships = await memberRepo.find({ where: { userId } });
    const convIds = memberships.map((m) => m.conversationId);
    if (convIds.length === 0) {
      if (callback) callback([]);
      return;
    }

    const conversations = await convRepo.find({
      where: { id: In(convIds) },
      order: { createdAt: 'DESC' },
    });

    const summaries = await Promise.all(conversations.map(buildConversationSummary));

    // Sort by last message date (most recent first), falling back to createdAt
    summaries.sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    });

    if (callback) callback(summaries);
  });

  // Search users by username (excludes current user)
  socket.on('users:search', async ({ query }: { query: string }, callback?: (users: UserPublic[]) => void) => {
    const userRepo = AppDataSource.getRepository(User);
    const users = await userRepo
      .createQueryBuilder('user')
      .where('user.id != :userId', { userId })
      .andWhere('user.username LIKE :query', { query: `%${query}%` })
      .orderBy('user.username', 'ASC')
      .limit(20)
      .getMany();

    const result = users.map(toUserPublic);
    if (callback) callback(result);
  });

  // Create or retrieve a DM conversation between current user and target
  socket.on('conversation:create_dm', async ({ targetUserId }: CreateDMPayload) => {
    const memberRepo = AppDataSource.getRepository(ConversationMember);
    const convRepo = AppDataSource.getRepository(Conversation);

    // Check if a DM already exists between these two users
    const myMemberships = await memberRepo.find({ where: { userId } });
    const myConvIds = myMemberships.map((m) => m.conversationId);

    let existingConvId: string | null = null;
    for (const convId of myConvIds) {
      const conv = await convRepo.findOne({ where: { id: convId, type: 'dm' } });
      if (!conv) continue;
      const targetMember = await memberRepo.findOne({ where: { conversationId: convId, userId: targetUserId } });
      if (targetMember) {
        existingConvId = convId;
        break;
      }
    }

    if (existingConvId) {
      const conv = await convRepo.findOneOrFail({ where: { id: existingConvId } });
      const summary = await buildConversationSummary(conv);
      socket.emit('conversation:new', summary);
      return;
    }

    // Create new DM
    const conversation = convRepo.create({ type: 'dm', createdBy: userId });
    await convRepo.save(conversation);

    const m1 = memberRepo.create({ conversationId: conversation.id, userId });
    const m2 = memberRepo.create({ conversationId: conversation.id, userId: targetUserId });
    await memberRepo.save([m1, m2]);

    await socket.join(`conversation:${conversation.id}`);
    await joinRoomForUser(io, targetUserId, `conversation:${conversation.id}`);

    const summary = await buildConversationSummary(conversation);

    // Emit to all members in the room (both creator and target)
    io.to(`conversation:${conversation.id}`).emit('conversation:new', summary);
  });

  // Create a group conversation
  socket.on('conversation:create_group', async ({ name, memberIds }: CreateGroupPayload) => {
    const convRepo = AppDataSource.getRepository(Conversation);
    const memberRepo = AppDataSource.getRepository(ConversationMember);

    const conversation = convRepo.create({ type: 'group', name, createdBy: userId });
    await convRepo.save(conversation);

    const allMemberIds = Array.from(new Set([userId, ...memberIds]));
    const members = allMemberIds.map((uid) =>
      memberRepo.create({ conversationId: conversation.id, userId: uid }),
    );
    await memberRepo.save(members);

    await socket.join(`conversation:${conversation.id}`);
    for (const uid of allMemberIds) {
      if (uid !== userId) {
        await joinRoomForUser(io, uid, `conversation:${conversation.id}`);
      }
    }

    const summary = await buildConversationSummary(conversation);
    io.to(`conversation:${conversation.id}`).emit('conversation:new', summary);
  });

  // Add member to group (creator only)
  socket.on('conversation:member_add', async ({ conversationId, userId: targetId }: AddMemberPayload) => {
    const convRepo = AppDataSource.getRepository(Conversation);
    const memberRepo = AppDataSource.getRepository(ConversationMember);

    const conv = await convRepo.findOne({ where: { id: conversationId } });
    if (!conv || conv.type !== 'group' || conv.createdBy !== userId) return;

    const alreadyMember = await memberRepo.findOne({ where: { conversationId, userId: targetId } });
    if (alreadyMember) return;

    await memberRepo.save(memberRepo.create({ conversationId, userId: targetId }));

    await joinRoomForUser(io, targetId, `conversation:${conversationId}`);

    const user = await AppDataSource.getRepository(User).findOneOrFail({ where: { id: targetId } });
    io.to(`conversation:${conversationId}`).emit('conversation:member_added', {
      conversationId,
      user: toUserPublic(user),
    });
  });

  // Remove member from group (creator only)
  socket.on('conversation:member_remove', async ({ conversationId, userId: targetId }: RemoveMemberPayload) => {
    const convRepo = AppDataSource.getRepository(Conversation);
    const memberRepo = AppDataSource.getRepository(ConversationMember);

    const conv = await convRepo.findOne({ where: { id: conversationId } });
    if (!conv || conv.type !== 'group' || conv.createdBy !== userId) return;

    await memberRepo.delete({ conversationId, userId: targetId });

    io.to(`conversation:${conversationId}`).emit('conversation:member_removed', {
      conversationId,
      userId: targetId,
    });
  });
}
