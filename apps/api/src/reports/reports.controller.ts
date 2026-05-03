import { Controller, Get, Query, Res, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard }  from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/reports')
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Full dashboard summary (YTD costs, recent activity)' })
  dashboard(@Request() req) {
    return this.svc.dashboardSummary(req.user.id);
  }

  @Get('cost-by-month')
  @ApiQuery({ name: 'vehicleId', required: false })
  @ApiQuery({ name: 'year',      required: false })
  costByMonth(
    @Request() req,
    @Query('vehicleId') vehicleId?: string,
    @Query('year')      year?: string,
  ) {
    return this.svc.costByMonth(req.user.id, vehicleId, year ? +year : undefined);
  }

  @Get('cost-by-type')
  @ApiQuery({ name: 'vehicleId', required: false })
  costByType(@Request() req, @Query('vehicleId') vehicleId?: string) {
    return this.svc.costByType(req.user.id, vehicleId);
  }

  @Get('fuel-trend')
  @ApiQuery({ name: 'vehicleId', required: false })
  @ApiQuery({ name: 'limit',     required: false })
  fuelTrend(
    @Request() req,
    @Query('vehicleId') vehicleId?: string,
    @Query('limit')     limit?: string,
  ) {
    return this.svc.fuelTrend(req.user.id, vehicleId, limit ? +limit : 20);
  }

  @Get('export/maintenance.csv')
  @ApiOperation({ summary: 'Download full maintenance history as CSV' })
  @ApiQuery({ name: 'vehicleId', required: false })
  async exportCsv(
    @Request() req,
    @Res() res: Response,
    @Query('vehicleId') vehicleId?: string,
  ) {
    const csv = await this.svc.exportMaintenanceCsv(req.user.id, vehicleId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="maintenance-history.csv"');
    res.send(csv);
  }
}
