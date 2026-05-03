import { Controller, Get, Post, Put, Delete, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard }    from '../auth/guards/jwt-auth.guard';
import { RemindersService } from './reminders.service';
import { CreateReminderDto, UpdateReminderDto, CompleteReminderDto } from '@garagesage/shared';

@ApiTags('reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/reminders')
export class RemindersController {
  constructor(private readonly svc: RemindersService) {}

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming reminders across all vehicles (dashboard)' })
  upcoming(@Request() req) {
    return this.svc.upcoming(req.user.id);
  }

  @Get('vehicle/:vehicleId')
  findAll(@Param('vehicleId') vehicleId: string, @Request() req) {
    return this.svc.findAll(vehicleId, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.svc.findOne(id, req.user.id);
  }

  @Post()
  create(@Body() dto: CreateReminderDto, @Request() req) {
    return this.svc.create(dto, req.user.id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateReminderDto, @Request() req) {
    return this.svc.update(id, dto, req.user.id);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Mark a reminder as done and compute next due date' })
  complete(@Param('id') id: string, @Body() dto: CompleteReminderDto, @Request() req) {
    return this.svc.complete(id, dto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.svc.remove(id, req.user.id);
  }
}
