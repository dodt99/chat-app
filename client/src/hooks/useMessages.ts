import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '@/context/SocketContext';
import { MessagePayload } from '@chat-app/shared';

export function useMessages(conversationId: string | null) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<MessagePayload[]>([]);

  // Join room when conversation changes
  useEffect(() => {
    if (!socket || !conversationId) {
      setMessages([]);
      return;
    }

    socket.emit('conversation:join', { conversationId });

    function onNewMessage(msg: MessagePayload) {
      setMessages((prev) => [...prev, msg]);
      // Mark as read immediately when message arrives in active chat
      socket!.emit('message:read', { messageId: msg.id, conversationId });
    }

    function onMessageEdited({ messageId, content }: { messageId: string; content: string }) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content, isEdited: true } : m))
      );
    }

    function onMessageDeleted({ messageId }: { messageId: string }) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, deletedAt: new Date(), content: '' } : m))
      );
    }

    function onReadUpdate({ messageId, userId }: { messageId: string; userId: string }) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                statuses: [
                  ...m.statuses.filter((s) => s.userId !== userId),
                  { userId, status: 'read' as const },
                ],
              }
            : m
        )
      );
    }

    socket.on('message:new', onNewMessage);
    socket.on('message:edited', onMessageEdited);
    socket.on('message:deleted', onMessageDeleted);
    socket.on('message:read_update', onReadUpdate);

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('message:edited', onMessageEdited);
      socket.off('message:deleted', onMessageDeleted);
      socket.off('message:read_update', onReadUpdate);
    };
  }, [socket, conversationId]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!socket || !conversationId || !content.trim()) return;
      socket.emit('message:send', { conversationId, content });
    },
    [socket, conversationId]
  );

  const editMessage = useCallback(
    (messageId: string, content: string) => {
      socket?.emit('message:edit', { messageId, content });
    },
    [socket]
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      if (!conversationId) return;
      socket?.emit('message:delete', { messageId, conversationId });
    },
    [socket, conversationId]
  );

  return { messages, sendMessage, editMessage, deleteMessage };
}
