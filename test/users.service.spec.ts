import { ConflictException, NotFoundException } from '@nestjs/common';
import { scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { Prisma, UserRole } from '../generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/users/users.service';

const deriveKey = promisify(scrypt);
const dto = { username: 'evaluator', password: 'correct horse battery', role: UserRole.EVALUATOR };
const storedUser = {
  id: 'c5e5c8c5-c44f-4a43-bdd8-78056694f6df',
  username: dto.username,
  role: dto.role,
  createdAt: new Date(),
  updatedAt: new Date(),
  passwordHash: 'must never escape',
};

describe('UsersService', () => {
  const user = { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() };
  let service: UsersService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new UsersService({ user } as unknown as PrismaService);
    user.create.mockResolvedValue(storedUser);
    user.findUnique.mockResolvedValue(storedUser);
  });

  it('stores independently salted scrypt hashes and returns only public fields', async () => {
    const result = await service.create(dto);
    await service.create(dto);
    const first = user.create.mock.calls[0][0];
    const second = user.create.mock.calls[1][0];
    const [algorithm, n, r, p, salt, hash] = first.data.passwordHash.split('$');
    expect([algorithm, n, r, p]).toEqual(['scrypt', '16384', '8', '1']);
    expect(salt).toMatch(/^[a-f0-9]{32}$/);
    expect(hash).toMatch(/^[a-f0-9]{128}$/);
    expect((await deriveKey(dto.password, salt, 64) as Buffer).toString('hex')).toBe(hash);
    expect(second.data.passwordHash).not.toBe(first.data.passwordHash);
    expect(first.data).toEqual({ username: dto.username, role: dto.role, passwordHash: first.data.passwordHash });
    expect(first.select.passwordHash).toBeUndefined();
    expect(result).toEqual({ id: storedUser.id, username: dto.username, role: dto.role, createdAt: storedUser.createdAt, updatedAt: storedUser.updatedAt });
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('password');
  });

  it('maps unique constraint conflicts to 409', async () => {
    user.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002', clientVersion: '7.10.0', meta: { target: ['username'] },
    }));
    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not hide unrelated persistence errors', async () => {
    const error = new Error('unavailable');
    user.create.mockRejectedValue(error);
    await expect(service.create(dto)).rejects.toBe(error);
  });

  it('looks up by id without exposing credentials', async () => {
    const result = await service.findOne(storedUser.id);
    expect(user.findUnique).toHaveBeenCalledWith({ where: { id: storedUser.id }, select: {
      id: true, username: true, role: true, createdAt: true, updatedAt: true,
    } });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('returns 404 for a missing user', async () => {
    user.findUnique.mockResolvedValue(null);
    await expect(service.findOne(storedUser.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists users ordered by creation date without exposing credentials', async () => {
    user.findMany.mockResolvedValue([storedUser]);
    const result = await service.findAll();
    expect(user.findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' }, select: {
      id: true, username: true, role: true, createdAt: true, updatedAt: true,
    } });
    expect(result).toEqual([{ id: storedUser.id, username: dto.username, role: dto.role, createdAt: storedUser.createdAt, updatedAt: storedUser.updatedAt }]);
    expect(result[0]).not.toHaveProperty('passwordHash');
  });
});
