import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard }    from '../auth/guards/jwt-auth.guard';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto } from '@garagesage/shared';

@ApiTags('vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/vehicles')
export class VehiclesController {
  constructor(private readonly svc: VehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'List all vehicles for current user' })
  findAll(@Request() req) {
    return this.svc.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single vehicle with recent reminders' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.svc.findOne(id, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a new vehicle' })
  create(@Body() dto: CreateVehicleDto, @Request() req) {
    return this.svc.create(dto, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update vehicle details' })
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto, @Request() req) {
    return this.svc.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a vehicle' })
  remove(@Param('id') id: string, @Request() req) {
    return this.svc.remove(id, req.user.id);
  }
}
