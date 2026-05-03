import { Injectable } from '@nestjs/common';
import { PrismaService } from '@garagesage/prisma';
import { createObjectCsvStringifier } from 'csv-writer';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // Monthly cost breakdown for Chart.js bar chart
  async costByMonth(userId: string, vehicleId?: string, year?: number) {
    const targetYear = year ?? new Date().getFullYear();
    const vehicles   = await this.userVehicleIds(userId, vehicleId);

    const logs = await this.prisma.maintenanceLog.findMany({
      where: {
        vehicleId: { in: vehicles },
        cost:      { not: null },
        date: {
          gte: new Date(`${targetYear}-01-01`),
          lte: new Date(`${targetYear}-12-31`),
        },
      },
      select: { date: true, cost: true, type: true },
    });

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      label: new Date(targetYear, i, 1).toLocaleString('default', { month: 'short' }),
      total: 0,
    }));

    for (const log of logs) {
      const m = log.date.getMonth();
      months[m].total += log.cost ?? 0;
    }

    return { year: targetYear, months };
  }

  // Cost grouped by service type (for pie/doughnut chart)
  async costByType(userId: string, vehicleId?: string) {
    const vehicles = await this.userVehicleIds(userId, vehicleId);
    return this.prisma.maintenanceLog.groupBy({
      by:    ['type'],
      where: { vehicleId: { in: vehicles }, cost: { not: null } },
      _sum:  { cost: true },
      _count: true,
      orderBy: { _sum: { cost: 'desc' } },
    });
  }

  // Fuel efficiency trend (last N fill-ups)
  async fuelTrend(userId: string, vehicleId?: string, limit = 20) {
    const vehicles = await this.userVehicleIds(userId, vehicleId);
    return this.prisma.fuelLog.findMany({
      where:   { vehicleId: { in: vehicles }, mpg: { not: null } },
      orderBy: { date: 'asc' },
      take:    limit,
      select:  { date: true, mileage: true, mpg: true, l100km: true, totalCost: true },
    });
  }

  // Full dashboard summary
  async dashboardSummary(userId: string) {
    const vehicles = await this.userVehicleIds(userId);
    const now      = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [
      totalMaintenanceCost,
      totalFuelCost,
      maintenanceCount,
      upcomingReminders,
      recentActivity,
    ] = await Promise.all([
      this.prisma.maintenanceLog.aggregate({
        where: { vehicleId: { in: vehicles }, date: { gte: yearStart } },
        _sum:  { cost: true },
      }),
      this.prisma.fuelLog.aggregate({
        where: { vehicleId: { in: vehicles }, date: { gte: yearStart } },
        _sum:  { totalCost: true },
      }),
      this.prisma.maintenanceLog.count({
        where: { vehicleId: { in: vehicles }, date: { gte: yearStart } },
      }),
      this.prisma.reminder.count({
        where: {
          vehicleId: { in: vehicles },
          status:    'ACTIVE',
          OR: [
            { nextDueDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } },
          ],
        },
      }),
      this.prisma.maintenanceLog.findMany({
        where:   { vehicleId: { in: vehicles } },
        orderBy: { date: 'desc' },
        take:    5,
        select:  {
          id: true, date: true, type: true, cost: true, mileage: true,
          vehicle: { select: { make: true, model: true, year: true } },
        },
      }),
    ]);

    return {
      ytdMaintenanceCost: totalMaintenanceCost._sum.cost  ?? 0,
      ytdFuelCost:        totalFuelCost._sum.totalCost     ?? 0,
      ytdMaintenanceJobs: maintenanceCount,
      upcomingReminders,
      recentActivity,
    };
  }

  // Export maintenance history to CSV
  async exportMaintenanceCsv(userId: string, vehicleId?: string): Promise<string> {
    const vehicles = await this.userVehicleIds(userId, vehicleId);
    const logs     = await this.prisma.maintenanceLog.findMany({
      where:   { vehicleId: { in: vehicles } },
      orderBy: { date: 'desc' },
      include: { vehicle: { select: { make: true, model: true, year: true } } },
    });

    const csv = createObjectCsvStringifier({
      header: [
        { id: 'date',        title: 'Date'        },
        { id: 'vehicle',     title: 'Vehicle'     },
        { id: 'mileage',     title: 'Mileage'     },
        { id: 'type',        title: 'Service Type' },
        { id: 'description', title: 'Description' },
        { id: 'cost',        title: 'Cost ($)'    },
        { id: 'shop',        title: 'Shop'        },
        { id: 'technician',  title: 'Technician'  },
      ],
    });

    const records = logs.map(l => ({
      date:        l.date.toISOString().slice(0, 10),
      vehicle:     `${l.vehicle.year} ${l.vehicle.make} ${l.vehicle.model}`,
      mileage:     l.mileage,
      type:        l.type,
      description: l.description ?? '',
      cost:        l.cost?.toFixed(2) ?? '',
      shop:        l.shop ?? '',
      technician:  l.technician ?? '',
    }));

    return csv.getHeaderString() + csv.stringifyRecords(records);
  }

  private async userVehicleIds(userId: string, vehicleId?: string): Promise<string[]> {
    if (vehicleId) return [vehicleId];
    const vehicles = await this.prisma.vehicle.findMany({
      where:  { userId, isActive: true },
      select: { id: true },
    });
    return vehicles.map(v => v.id);
  }
}
