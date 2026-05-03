import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@garagesage/prisma';
import { CreateFuelLogDto, UpdateFuelLogDto } from '@garagesage/shared';

@Injectable()
export class FuelService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(vehicleId: string, userId: string) {
    return this.prisma.fuelLog.findMany({
      where: { vehicleId, vehicle: { userId } },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const log = await this.prisma.fuelLog.findFirst({
      where: { id, vehicle: { userId } },
    });
    if (!log) throw new NotFoundException(`Fuel log ${id} not found`);
    return log;
  }

  async create(dto: CreateFuelLogDto, userId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, userId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    // Calculate efficiency from previous fill-up
    const { mpg, l100km } = await this.calculateEfficiency(dto);

    const log = await this.prisma.fuelLog.create({
      data: {
        ...dto,
        date: new Date(dto.date),
        mpg,
        l100km,
      },
    });

    // Update vehicle mileage
    if (dto.mileage > vehicle.currentMileage) {
      await this.prisma.vehicle.update({
        where: { id: dto.vehicleId },
        data:  { currentMileage: dto.mileage },
      });
    }

    return log;
  }

  async update(id: string, dto: UpdateFuelLogDto, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.fuelLog.update({
      where: { id },
      data: { ...dto, ...(dto.date ? { date: new Date(dto.date) } : {}) },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.fuelLog.delete({ where: { id } });
  }

  // Fuel efficiency stats for a vehicle
  async stats(vehicleId: string, userId: string) {
    const logs = await this.prisma.fuelLog.findMany({
      where: { vehicleId, vehicle: { userId }, mpg: { not: null } },
      orderBy: { date: 'desc' },
      take: 20,
    });

    if (!logs.length) return { avgMpg: null, avgL100km: null, totalCost: 0, entries: 0 };

    const mpgs = logs.map(l => l.mpg!).filter(Boolean);
    return {
      avgMpg:   mpgs.reduce((a, b) => a + b, 0) / mpgs.length,
      avgL100km: logs.filter(l => l.l100km).reduce((a, b) => a + b.l100km!, 0) / logs.length,
      totalCost: logs.reduce((a, b) => a + (b.totalCost ?? 0), 0),
      entries:   logs.length,
    };
  }

  private async calculateEfficiency(dto: CreateFuelLogDto) {
    if (!dto.fullTank) return { mpg: null, l100km: null };

    // Find the previous full-tank log
    const prev = await this.prisma.fuelLog.findFirst({
      where: { vehicleId: dto.vehicleId, fullTank: true, mileage: { lt: dto.mileage } },
      orderBy: { mileage: 'desc' },
    });

    if (!prev) return { mpg: null, l100km: null };

    const distance = dto.mileage - prev.mileage;
    if (distance <= 0) return { mpg: null, l100km: null };

    let mpg: number | null    = null;
    let l100km: number | null = null;

    if (dto.gallons && dto.gallons > 0) {
      mpg = distance / dto.gallons;
    }
    if (dto.liters && dto.liters > 0) {
      // distance in miles → convert to km
      const distanceKm = distance * 1.60934;
      l100km = (dto.liters / distanceKm) * 100;
      if (!mpg) mpg = distance / (dto.liters * 0.264172);
    }

    return { mpg, l100km };
  }
}
