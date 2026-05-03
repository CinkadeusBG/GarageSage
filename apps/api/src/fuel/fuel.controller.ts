import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FuelService }  from './fuel.service';
import { CreateFuelLogDto, UpdateFuelLogDto } from '@garagesage/shared';

@ApiTags('fuel')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/fuel')
export class FuelController {
  constructor(private readonly svc: FuelService) {}

  @Get('vehicle/:vehicleId')
  findAll(@Param('vehicleId') vehicleId: string, @Request() req) {
    return this.svc.findAll(vehicleId, req.user.id);
  }

  @Get('vehicle/:vehicleId/stats')
  stats(@Param('vehicleId') vehicleId: string, @Request() req) {
    return this.svc.stats(vehicleId, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.svc.findOne(id, req.user.id);
  }

  @Post()
  create(@Body() dto: CreateFuelLogDto, @Request() req) {
    return this.svc.create(dto, req.user.id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFuelLogDto, @Request() req) {
    return this.svc.update(id, dto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.svc.remove(id, req.user.id);
  }
}
