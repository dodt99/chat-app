import { Server, Socket } from 'socket.io';
import { In } from 'typeorm';
import { AppDataSource } from '../../data-source';
import { Conversation } from '../../entities/Conversation';
import { ConversationMember } from '../../entities/ConversationMember';
import { User } from '../../entities/User';
import {
  CreateDMPayload,
  CreateGroupPayload,
  AddMemberPayload,
  RemoveMemberPayload,
  ConversationSummary,
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

async function buildConversationSummary(conversation: Conversation): Promise<ConversationSummary> {
  const memberRepo = AppDataSource.getRepository(ConversationMember);
  const userRepo = AppDataSource.getRepository(User);

  const memberships = await memberRepo.find({ where: { conversationId: conversation.id } });
  const users = await userRepo.find({ where: { id: In(memberships.map((m) => m.userId)) } });

  return {
    id: conversation.id,
    type: conversation.type,
    name: conversation.name,
    createdBy: conversation.createdBy,
    createdAt: conversation.createdAt,
    members: users.map(toUserPublic),
    lastMessage: null,
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
