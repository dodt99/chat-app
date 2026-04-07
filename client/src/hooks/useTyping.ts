import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from '@/context/SocketContext';
import { TypingUpdatePayload } from '@chat-app/shared';

export function useTyping(conversationId: string | null) {
  const { socket } = useSocket();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!socket) return;

    function onTypingUpdate({ conversationId: cid, username, isTyping }: TypingUpdatePayload) {
      if (cid !== conversationId) return;
      setTypingUsers((prev) =>
        isTyping
          ? Array.from(new Set([...prev, username]))
          : prev.filter((u) => u !== username)
      );
    }

    socket.on('typing:update', onTypingUpdate);
    return () => {
      socket.off('typing:update', onTypingUpdate);
    };
  }, [socket, conversationId]);

  // Clear typing state when conversation changes
  useEffect(() => {
    setTypingUsers([]);
  }, [conversationId]);

  const onKeyDown = useCallback(() => {
    if (!socket || !conversationId) return;
    if (!isTypingRef.current) {
      socket.emit('typing:start', { conversationId });
      isTypingRef.current = true;
    }
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId });
      isTypingRef.current = false;
    }, 2000);
  }, [socket, conversationId]);

  const onBlur = useCallback(() => {
    if (!socket || !conversationId || !isTypingRef.current) return;
    socket.emit('typing:stop', { conversationId });
    isTypingRef.current = false;
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
  }, [socket, conversationId]);

  return { typingUsers, onKeyDown, onBlur };
}
