import 'reflect-metadata';
import http from 'http';
import { app } from './app';
import { AppDataSource } from './data-source';
import { setupSocket } from './socket';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 4000;

async function main() {
  await AppDataSource.initialize();
  console.log('Database connected');

  const httpServer = http.createServer(app);
  setupSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch(console.error);
