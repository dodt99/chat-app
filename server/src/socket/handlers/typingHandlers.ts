import { Socket } from 'socket.io';
import { TypingPayload, TypingUpdatePayload } from '@chat-app/shared';

// Tracks debounce timers: `${conversationId}:${username}` → timer
const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function registerTypingHandlers(socket: Socket, username: string): void {
  function stopTyping(conversationId: string): void {
    const key = `${conversationId}:${username}`;
    const existing = typingTimers.get(key);
    if (existing) clearTimeout(existing);
    typingTimers.delete(key);

    const payload: TypingUpdatePayload = { conversationId, username, isTyping: false };
    socket.to(`conversation:${conversationId}`).emit('typing:update', payload);
  }

  socket.on('typing:start', ({ conversationId }: TypingPayload) => {
    const key = `${conversationId}:${username}`;

    // Clear existing timer to reset the 3-second window
    const existing = typingTimers.get(key);
    if (existing) clearTimeout(existing);

    // Broadcast typing started to others in the room
    const payload: TypingUpdatePayload = { conversationId, username, isTyping: true };
    socket.to(`conversation:${conversationId}`).emit('typing:update', payload);

    // Auto-clear after 3 seconds if typing:stop not received
    typingTimers.set(
      key,
      setTimeout(() => stopTyping(conversationId), 3000),
    );
  });

  socket.on('typing:stop', ({ conversationId }: TypingPayload) => {
    stopTyping(conversationId);
  });

  socket.on('disconnect', () => {
    // Clear all timers for this user's socket on disconnect
    for (const key of typingTimers.keys()) {
      if (key.endsWith(`:${username}`)) {
        const conversationId = key.split(':')[0];
        stopTyping(conversationId);
      }
    }
  });
}
