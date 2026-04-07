import request from 'supertest';
import { app } from '../src/app';
import { AppDataSource } from '../src/data-source';

beforeAll(async () => {
  await AppDataSource.initialize();
});

afterAll(async () => {
  await AppDataSource.destroy();
});

describe('POST /api/auth/register', () => {
  it('creates a new user and returns token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'password123',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('username');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('returns 409 if email already exists', async () => {
    const email = `dup_${Date.now()}@example.com`;
    await request(app).post('/api/auth/register').send({ username: `user1_${Date.now()}`, email, password: 'pass' });
    const res = await request(app).post('/api/auth/register').send({ username: `user2_${Date.now()}`, email, password: 'pass' });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it('returns token on valid credentials', async () => {
    const email = `login_${Date.now()}@example.com`;
    await request(app).post('/api/auth/register').send({ username: `loginuser_${Date.now()}`, email, password: 'password123' });
    const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nonexistent@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns current user with valid token', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      username: `meuser_${Date.now()}`,
      email: `me_${Date.now()}@example.com`,
      password: 'password123',
    });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('email');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
