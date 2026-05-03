import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard }       from '../auth/guards/jwt-auth.guard';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceLogDto, UpdateMaintenanceLogDto } from '@garagesage/shared';

@ApiTags('maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/maintenance')
export class MaintenanceController {
  constructor(private readonly svc: MaintenanceService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Dashboard summary stats' })
  summary(@Request() req) {
    return this.svc.summary(req.user.id);
  }

  @Get('vehicle/:vehicleId')
  @ApiOperation({ summary: 'List maintenance logs for a vehicle' })
  findAll(@Param('vehicleId') vehicleId: string, @Request() req) {
    return this.svc.findAll(vehicleId, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.svc.findOne(id, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a maintenance log entry' })
  create(@Body() dto: CreateMaintenanceLogDto, @Request() req) {
    return this.svc.create(dto, req.user.id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMaintenanceLogDto, @Request() req) {
    return this.svc.update(id, dto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.svc.remove(id, req.user.id);
  }
}
