import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '../../generated/prisma/enums.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller('users') // base de ruta: /api/v1/users
export class UsersController {
  constructor(private readonly usersService: UsersService) {} // inyecta el servicio del backend

  @Post() // POST /users
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard) // primero valida el token, después el rol
  @Roles(UserRole.ADMINISTRATOR) // solo administradores pueden crear usuarios
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get() // GET /users
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR) // solo administradores pueden listar usuarios
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id') // GET /users/:id — sin guard de rol todavía
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.findOne(id);
  }
}
