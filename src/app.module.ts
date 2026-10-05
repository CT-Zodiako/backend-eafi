import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { CategoriesModule } from './categories/categories.module';
import { EvaluationPeriodsModule } from './evaluation-periods/evaluation-periods.module';
import { CategoryEditionsModule } from './category-editions/category-editions.module';
import { EvaluatorModule } from './evaluator/evaluator.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    CategoriesModule,
    EvaluationPeriodsModule,
    CategoryEditionsModule,
    EvaluatorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
