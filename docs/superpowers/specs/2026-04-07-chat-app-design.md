# Chat App Design Spec
**Date:** 2026-04-07
**Stack:** Next.js 16 + Express + Socket.io + MySQL + TypeORM + JWT

---

## Overview

A Telegram-style real-time chat application supporting group rooms and 1:1 direct messages, with JWT authentication, message persistence, typing indicators, online/offline status, and message read receipts.

---

## Project Structure

```
realtime/
├── socketio-learning-path.md
├── chat-app/
│   ├── client/              # Next.js 14 (App Router)
│   ├── server/              # Express + Socket.io
│   ├── shared/              # Shared TypeScript types
│   ├── package.json         # Root npm workspaces config
│   └── docs/
│       └── superpowers/
│           └── specs/
│               └── 2026-04-07-chat-app-design.md
```

---

## Architecture

### Monorepo (npm workspaces)

- **`client/`** — Next.js 16 App Router, Tailwind CSS, socket.io-client, JWT stored in httpOnly cookie
- **`server/`** — Express REST (auth only) + Socket.io (all real-time), TypeORM + MySQL
- **`shared/`** — Shared TypeScript interfaces/types used by both client and server

### Communication pattern

- **REST** — auth only: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- **Socket.io** — everything else: messages, typing, online status, read receipts, group management

### Authentication

- Register/login via REST → returns JWT
- JWT stored in `httpOnly` cookie on client
- Socket.io middleware verifies JWT on every connection — unauthenticated sockets are rejected before any event fires
- Protected Next.js routes redirect to `/login` if no valid JWT

---

## Data Models (TypeORM Entities)

### User
| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| username | varchar | unique |
| email | varchar | unique |
| passwordHash | varchar | bcrypt hashed |
| avatarUrl | varchar | nullable |
| lastSeen | datetime | updated on disconnect |
| createdAt | datetime | |

> `isOnline` is NOT stored in DB — derived from active Socket.io connections in memory.

### Conversation
| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| type | enum | `dm` or `group` |
| name | varchar | nullable (null for DMs) |
| createdBy | uuid | FK → User |
| createdAt | datetime | |

### ConversationMember
| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| conversationId | uuid | FK → Conversation |
| userId | uuid | FK → User |
| joinedAt | datetime | |

### Message
| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| content | text | |
| conversationId | uuid | FK → Conversation |
| senderId | uuid | FK → User |
| isEdited | boolean | default false |
| deletedAt | datetime | nullable, soft delete |
| createdAt | datetime | |

### MessageStatus
| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| messageId | uuid | FK → Message |
| userId | uuid | FK → User (recipient) |
| status | enum | `delivered`, `read` |
| updatedAt | datetime | |

---

## Socket.io Events

All events are scoped to Socket.io rooms named by `conversationId`.

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `conversation:join` | `{ conversationId }` | Join a conversation's socket room |
| `message:send` | `{ conversationId, content }` | Send a message |
| `message:read` | `{ messageId, conversationId }` | Mark message as read (opens chat) |
| `message:edit` | `{ messageId, content }` | Edit a sent message |
| `message:delete` | `{ messageId, conversationId }` | Delete message for everyone |
| `typing:start` | `{ conversationId }` | User started typing |
| `typing:stop` | `{ conversationId }` | User stopped typing |
| `conversation:member_add` | `{ conversationId, userId }` | Group creator adds member (creator = admin, no separate role system) |
| `conversation:member_remove` | `{ conversationId, userId }` | Group creator removes member |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `message:new` | `{ message }` | New message in conversation |
| `message:delivered` | `{ messageId }` | Message reached server (✓) |
| `message:read_update` | `{ messageId, userId }` | Receiver read message (✓✓) |
| `message:edited` | `{ messageId, content }` | Message was edited |
| `message:deleted` | `{ messageId, conversationId }` | Message was deleted |
| `typing:update` | `{ conversationId, username, isTyping }` | Typing indicator update |
| `user:status` | `{ userId, isOnline, lastSeen }` | Online/offline changed |
| `conversation:new` | `{ conversation }` | New DM or group created |
| `conversation:member_added` | `{ conversationId, user }` | Member was added to group |
| `conversation:member_removed` | `{ conversationId, userId }` | Member was removed from group |

---

## REST Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user profile |

---

## UI Layout

### Pages
- `/login` — login form
- `/register` — register form
- `/` — main chat layout (protected)

### Main Layout (3-panel, Telegram-style)

```
┌─────────────┬──────────────────────────┬─────────────────┐
│  Sidebar    │    Chat Window           │  Members Panel  │
│             │                          │  (group only)   │
│ [Search]    │  [Name + online status]  │                 │
│             │──────────────────────────│  Members list   │
│ DM list     │                          │  with online    │
│ Group list  │  message bubbles...      │  indicators     │
│             │                          │                 │
│             │  [typing indicator...]   │                 │
│             │──────────────────────────│                 │
│             │  [Message Input    ] [→] │                 │
└─────────────┴──────────────────────────┴─────────────────┘
```

### Message Bubbles
- **Right side** — your messages, with ✓ (delivered) / ✓✓ (read, blue) status + timestamp
- **Left side** — others' messages, with avatar + username + timestamp
- **Hover actions** — Edit, Delete (only on your own messages)
- Deleted messages show "This message was deleted" placeholder
- Edited messages show "(edited)" label

### Sidebar
- Search bar to filter existing conversations by name (not global user discovery)
- List of conversations sorted by latest message
- Unread badge count per conversation
- Online indicator (green dot) per user

---

## Online Status Strategy

- On socket **connect** → add userId to in-memory `onlineUsers` Set → broadcast `user:status { isOnline: true }` to relevant users
- On socket **disconnect** → remove from Set → update `lastSeen` in DB → broadcast `user:status { isOnline: false, lastSeen }`
- On client request → derive online status from `onlineUsers` Set, never from DB

---

## Key Technical Notes

- Typing indicator uses a **debounce timer** on the server — if `typing:stop` is not received within 3s, auto-clear the indicator
- Message soft delete — `deletedAt` timestamp, content replaced with placeholder on client
- Socket.io room naming: `conversation:{conversationId}`
- JWT expiry: 7 days; refresh strategy out of scope for this project
- No file/media upload in this version — text messages only
