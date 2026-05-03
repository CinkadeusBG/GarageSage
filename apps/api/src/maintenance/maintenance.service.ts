import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@garagesage/prisma';
import { CreateMaintenanceLogDto, UpdateMaintenanceLogDto } from '@garagesage/shared';
import { AiService } from '../ai/ai.service';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai:     AiService,
  ) {}

  findAll(vehicleId: string, userId: string) {
    return this.prisma.maintenanceLog.findMany({
      where: { vehicleId, vehicle: { userId } },
      orderBy: { date: 'desc' },
      select: {
        id: true, date: true, mileage: true, type: true,
        description: true, cost: true, shop: true, technician: true,
        tags: true, attachments: true, createdAt: true,
      },
    });
  }

  async findOne(id: string, userId: string) {
    const log = await this.prisma.maintenanceLog.findFirst({
      where: { id, vehicle: { userId } },
    });
    if (!log) throw new NotFoundException(`Log ${id} not found`);
    return log;
  }

  async create(dto: CreateMaintenanceLogDto, userId: string) {
    // Verify vehicle ownership
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, userId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const log = await this.prisma.maintenanceLog.create({
      data: {
        ...dto,
        date: new Date(dto.date),
      },
    });

    // Update vehicle mileage if this log is more recent
    if (dto.mileage > vehicle.currentMileage) {
      await this.prisma.vehicle.update({
        where: { id: dto.vehicleId },
        data:  { currentMileage: dto.mileage },
      });
    }

    // Index for AI RAG in background (don't await to keep response fast)
    this.ai.indexMaintenanceLog(log.id).catch(() => {});

    return log;
  }

  async update(id: string, dto: UpdateMaintenanceLogDto, userId: string) {
    const log = await this.findOne(id, userId);
    const updated = await this.prisma.maintenanceLog.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.date ? { date: new Date(dto.date) } : {}),
      },
    });
    // Re-index
    this.ai.indexMaintenanceLog(log.id).catch(() => {});
    return updated;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.maintenanceLog.delete({ where: { id } });
  }

  // Summary stats for dashboard
  async summary(userId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId, isActive: true },
      select: { id: true },
    });
    const vehicleIds = vehicles.map(v => v.id);

    const [totalCost, countByType, recentLogs] = await Promise.all([
      this.prisma.maintenanceLog.aggregate({
        where: { vehicleId: { in: vehicleIds } },
        _sum: { cost: true },
        _count: true,
      }),
      this.prisma.maintenanceLog.groupBy({
        by: ['type'],
        where: { vehicleId: { in: vehicleIds } },
        _count: true,
        _sum: { cost: true },
        orderBy: { _count: { type: 'desc' } },
        take: 5,
      }),
      this.prisma.maintenanceLog.findMany({
        where: { vehicleId: { in: vehicleIds } },
        orderBy: { date: 'desc' },
        take: 5,
        select: {
          id: true, date: true, mileage: true, type: true, cost: true,
          vehicle: { select: { make: true, model: true, year: true } },
        },
      }),
    ]);

    return { totalCost, countByType, recentLogs };
  }
}
