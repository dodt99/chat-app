import { useEffect, useState } from 'react';
import { useSocket } from '@/context/SocketContext';
import { UserStatusPayload } from '@chat-app/shared';

export function useOnlineStatus() {
  const { socket } = useSocket();
  const [onlineStatus, setOnlineStatus] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    if (!socket) return;

    function onUserStatus({ userId, isOnline }: UserStatusPayload) {
      setOnlineStatus((prev) => new Map(prev).set(userId, isOnline));
    }

    socket.on('user:status', onUserStatus);
    return () => {
      socket.off('user:status', onUserStatus);
    };
  }, [socket]);

  return { onlineStatus };
}
