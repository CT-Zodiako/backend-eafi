import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { UserRole } from '../generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthModule } from '../src/auth/auth.module';
import { EvaluatorModule } from '../src/evaluator/evaluator.module';
import { JwtService } from '@nestjs/jwt';

// HTTP contract tests use a mocked persistence boundary; no database is required.
describe('Evaluator HTTP contract', () => {
  let app: INestApplication;
  const user = { findUnique: jest.fn() };
  const project = { findMany: jest.fn() };

  const evaluator = {
    id: 'c5e5c8c5-c44f-4a43-bdd8-78056694f6df',
    username: 'evaluator-one',
    role: UserRole.EVALUATOR,
    passwordHash: 'private',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const admin = { ...evaluator, id: 'a5e5c8c5-c44f-4a43-bdd8-78056694f6df', role: UserRole.ADMINISTRATOR };
  const assignedProject = {
    id: 'p5e5c8c5-c44f-4a43-bdd8-78056694f6df',
    name: 'Sample project',
    description: 'A sample project',
    categoryEditionId: 'e5e5c8c5-c44f-4a43-bdd8-78056694f6df',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const secret = 'test-only-evaluator-secret';
  const jwt = new JwtService({ secret, signOptions: { algorithm: 'HS256', expiresIn: 60 } });
  const oldSecret = process.env.JWT_SECRET;
  const oldExpiry = process.env.JWT_EXPIRES_IN;
  const tokenFor = (id: string) => jwt.sign({ sub: id });

  beforeAll(async () => {
    process.env.JWT_SECRET = secret;
    process.env.JWT_EXPIRES_IN = '60';
    const module = await Test.createTestingModule({ imports: [AuthModule, EvaluatorModule] })
      .overrideProvider(PrismaService)
      .useValue({ user, project })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    user.findUnique.mockResolvedValue(evaluator);
    project.findMany.mockResolvedValue([]);
  });

  afterAll(async () => {
    await app?.close();
    if (oldSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldSecret;
    if (oldExpiry === undefined) delete process.env.JWT_EXPIRES_IN;
    else process.env.JWT_EXPIRES_IN = oldExpiry;
  });

  it('rejects unauthenticated requests before persistence', async () => {
    await request(app.getHttpServer()).get('/api/v1/evaluator/projects').expect(401);
    expect(project.findMany).not.toHaveBeenCalled();
  });

  it('rejects administrators even when the JWT claims EVALUATOR', async () => {
    user.findUnique.mockResolvedValue(admin);
    await request(app.getHttpServer()).get('/api/v1/evaluator/projects')
      .auth(jwt.sign({ sub: admin.id, role: 'EVALUATOR' }), { type: 'bearer' })
      .expect(403);
    expect(project.findMany).not.toHaveBeenCalled();
  });

  it("returns the evaluator's own filtered project list", async () => {
    project.findMany.mockResolvedValue([assignedProject]);
    const response = await request(app.getHttpServer()).get('/api/v1/evaluator/projects')
      .auth(tokenFor(evaluator.id), { type: 'bearer' }).expect(200);
    expect(response.body).toEqual([{
      id: assignedProject.id,
      name: assignedProject.name,
      description: assignedProject.description,
      categoryEditionId: assignedProject.categoryEditionId,
      createdAt: assignedProject.createdAt.toISOString(),
      updatedAt: assignedProject.updatedAt.toISOString(),
    }]);
    expect(project.findMany).toHaveBeenCalledWith({
      where: { assignedEvaluators: { some: { evaluatorId: evaluator.id } } },
      select: { id: true, name: true, description: true, categoryEditionId: true, createdAt: true, updatedAt: true },
    });
  });

  it('returns an empty list when no projects are assigned', async () => {
    project.findMany.mockResolvedValue([]);
    const response = await request(app.getHttpServer()).get('/api/v1/evaluator/projects')
      .auth(tokenFor(evaluator.id), { type: 'bearer' }).expect(200);
    expect(response.body).toEqual([]);
  });

  it('never leaks evaluator credentials in the response', async () => {
    project.findMany.mockResolvedValue([assignedProject]);
    const response = await request(app.getHttpServer()).get('/api/v1/evaluator/projects')
      .auth(tokenFor(evaluator.id), { type: 'bearer' }).expect(200);
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain('passwordHash');
    expect(serialized).not.toContain(evaluator.passwordHash);
  });
});
