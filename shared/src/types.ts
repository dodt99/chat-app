export interface UserPublic {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  lastSeen: Date;
}

export type ConversationType = 'dm' | 'group';

export interface ConversationSummary {
  id: string;
  type: ConversationType;
  name: string | null;
  createdBy: string;
  createdAt: Date;
  members: UserPublic[];
  lastMessage: MessagePayload | null;
}

export type MessageStatusType = 'delivered' | 'read';

export interface MessagePayload {
  id: string;
  content: string;
  conversationId: string;
  sender: UserPublic;
  isEdited: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  statuses: { userId: string; status: MessageStatusType }[];
}

// Socket event payloads — Client → Server
export interface SendMessagePayload {
  conversationId: string;
  content: string;
}

export interface ReadMessagePayload {
  messageId: string;
  conversationId: string;
}

export interface EditMessagePayload {
  messageId: string;
  content: string;
}

export interface DeleteMessagePayload {
  messageId: string;
  conversationId: string;
}

export interface TypingPayload {
  conversationId: string;
}

export interface JoinConversationPayload {
  conversationId: string;
}

export interface AddMemberPayload {
  conversationId: string;
  userId: string;
}

export interface RemoveMemberPayload {
  conversationId: string;
  userId: string;
}

export interface CreateDMPayload {
  targetUserId: string;
}

export interface CreateGroupPayload {
  name: string;
  memberIds: string[];
}

// Socket event payloads — Server → Client
export interface TypingUpdatePayload {
  conversationId: string;
  username: string;
  isTyping: boolean;
}

export interface UserStatusPayload {
  userId: string;
  isOnline: boolean;
  lastSeen: Date;
}

export interface MemberAddedPayload {
  conversationId: string;
  user: UserPublic;
}

export interface MemberRemovedPayload {
  conversationId: string;
  userId: string;
}
