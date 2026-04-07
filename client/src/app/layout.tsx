import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chat App',
  description: 'Real-time chat with Socket.io',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
