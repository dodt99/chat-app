# Chat App

Telegram-style real-time chat app built with:
- **Frontend:** Next.js 16, Tailwind CSS, Socket.io client
- **Backend:** Express 4, Socket.io 4, TypeORM 0.3
- **Database:** MySQL 8
- **Auth:** JWT (7-day tokens)

## Setup

### Prerequisites
- Node.js 20+
- MySQL 8

### 1. Install dependencies
```bash
npm install
```

### 2. Configure server environment
Edit `server/.env` with your MySQL credentials:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=chatapp
JWT_SECRET=your-secret-key
```

### 3. Create MySQL database
```sql
CREATE DATABASE chatapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Build shared types
```bash
npm run build --workspace=shared
```

### 5. Run development servers
```bash
npm run dev
```

Server runs on http://localhost:4000  
Client runs on http://localhost:3000

## Features
- Register / Login with JWT
- 1:1 Direct Messages
- Group conversations
- Real-time typing indicators
- Online/offline status
- Message read receipts (✓✓)
- Edit and delete messages
- Add/remove group members
