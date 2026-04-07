// Maps userId → socketId for online users
const onlineUsers = new Map<string, string>();

export function addOnlineUser(userId: string, socketId: string): void {
  onlineUsers.set(userId, socketId);
}

export function removeOnlineUser(userId: string): void {
  onlineUsers.delete(userId);
}

export function isOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

export function getOnlineUserIds(): string[] {
  return Array.from(onlineUsers.keys());
}

export function getSocketId(userId: string): string | undefined {
  return onlineUsers.get(userId);
}
