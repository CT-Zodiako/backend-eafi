import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type PublicProject = {
  id: string;
  name: string;
  description: string;
  categoryEditionId: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class EvaluatorService {
  constructor(private readonly prisma: PrismaService) {}

  findAssignedProjects(evaluatorId: string): Promise<PublicProject[]> {
    return this.prisma.project.findMany({
      where: { assignedEvaluators: { some: { evaluatorId } } },
      select: { id: true, name: true, description: true, categoryEditionId: true, createdAt: true, updatedAt: true },
    });
  }
}
