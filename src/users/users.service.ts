import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '../../generated/prisma/client.js';
import { hashPassword } from '../auth/password';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

type PublicUser = {
  id: string;
  username: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

function toPublicUser(user: PublicUser): PublicUser {
  const { id, username, role, createdAt, updatedAt } = user;
  return { id, username, role, createdAt, updatedAt };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const passwordHash = await hashPassword(dto.password); // nunca se guarda la contraseña en texto plano

    try {
      const user = await this.prisma.user.create({
        data: { username: dto.username, role: dto.role, passwordHash },
        select: { id: true, username: true, role: true, createdAt: true, updatedAt: true }, // nunca selecciona passwordHash
      });
      return toPublicUser(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' // código de Prisma para "valor único duplicado"
      ) {
        throw new ConflictException('Username already exists'); // se traduce a 409
      }
      throw error;
    }
  }

  async findCredentialsByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      select: { id: true, passwordHash: true },
    });
  }

  async findAll(): Promise<PublicUser[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' }, // el más nuevo primero
      select: { id: true, username: true, role: true, createdAt: true, updatedAt: true },
    });
    return users.map(toPublicUser);
  }

  async findOne(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, role: true, createdAt: true, updatedAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return toPublicUser(user);
  }
}
