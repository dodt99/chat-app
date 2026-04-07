import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './entities/User';
import { Conversation } from './entities/Conversation';
import { ConversationMember } from './entities/ConversationMember';
import { Message } from './entities/Message';
import { MessageStatus } from './entities/MessageStatus';
import dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'chatapp',
  synchronize: true,
  logging: false,
  entities: [User, Conversation, ConversationMember, Message, MessageStatus],
});
