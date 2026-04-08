'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SocketProvider } from '@/context/SocketContext';
import { Sidebar } from '@/components/Sidebar';
import { ChatWindow } from '@/components/ChatWindow';
import { MembersPanel } from '@/components/MembersPanel';
import { Header } from '@/components/Header';
import { ConversationSummary } from '@chat-app/shared';
import { AuthUser } from '@/lib/api';

export default function ChatPage() {
  const router = useRouter();
  const [activeConversation, setActiveConversation] = useState<ConversationSummary | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr) as AuthUser);
      } catch (error) {
        console.error('Failed to parse user data:', error);
      }
    }
  }, [router]);

  return (
    <SocketProvider>
      <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
        {/* Header */}
        <Header user={currentUser} />

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200">
            <Sidebar
              activeConversationId={activeConversation?.id ?? null}
              onSelect={setActiveConversation}
            />
          </div>

          {/* Chat Window */}
          <div className="flex-1 flex flex-col min-w-0">
            {activeConversation ? (
              <ChatWindow conversation={activeConversation} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                Select a conversation to start chatting
              </div>
            )}
          </div>

          {/* Members Panel — only for group conversations */}
          {activeConversation?.type === 'group' && (
            <div className="w-64 flex-shrink-0 bg-white border-l border-gray-200">
              <MembersPanel conversation={activeConversation} />
            </div>
          )}
        </div>
      </div>
    </SocketProvider>
  );
}
