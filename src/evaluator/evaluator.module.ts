import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EvaluatorController } from './evaluator.controller';
import { EvaluatorService } from './evaluator.service';

@Module({
  imports: [PrismaModule],
  controllers: [EvaluatorController],
  providers: [EvaluatorService],
})
export class EvaluatorModule {}
