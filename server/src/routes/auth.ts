import { Router } from 'express';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { signToken } from '../utils/jwt';
import { jwtAuth, AuthRequest } from '../middleware/jwtAuth';
import { UserPublic } from '@chat-app/shared';

export const authRouter = Router();

const userRepo = () => AppDataSource.getRepository(User);

function toPublic(user: User): UserPublic {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    lastSeen: user.lastSeen ?? new Date(),
  };
}

authRouter.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    res.status(400).json({ error: 'username, email, and password are required' });
    return;
  }
  try {
    const existing = await userRepo().findOne({ where: [{ email }, { username }] });
    if (existing) {
      res.status(409).json({ error: 'Email or username already in use' });
      return;
    }
    const user = userRepo().create({
      username,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      avatarUrl: null,
      lastSeen: null,
    });
    await userRepo().save(user);
    const token = signToken({ userId: user.id, username: user.username });
    res.status(201).json({ token, user: toPublic(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }
  try {
    const user = await userRepo().findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const token = signToken({ userId: user.id, username: user.username });
    res.status(200).json({ token, user: toPublic(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.get('/me', jwtAuth, async (req: AuthRequest, res) => {
  try {
    const user = await userRepo().findOne({ where: { id: req.user!.userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: toPublic(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
