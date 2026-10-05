import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { UserRole } from '../../generated/prisma/enums.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { EvaluatorService } from './evaluator.service';

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller('evaluator')
export class EvaluatorController {
  constructor(private readonly evaluatorService: EvaluatorService) {}

  @Get('projects') // GET /evaluator/projects
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard) // primero valida el token, después el rol
  @Roles(UserRole.EVALUATOR) // solo evaluadores ven sus proyectos asignados
  findAssignedProjects(@Req() req: AuthenticatedRequest) {
    return this.evaluatorService.findAssignedProjects(req.user.id);
  }
}
