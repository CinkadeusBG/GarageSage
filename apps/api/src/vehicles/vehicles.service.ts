import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@garagesage/prisma';
import { CreateVehicleDto, UpdateVehicleDto } from '@garagesage/shared';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.vehicle.findMany({
      where: { userId, isActive: true },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { maintenanceLogs: true, fuelLogs: true, reminders: true },
        },
      },
    });
  }

  async findOne(id: string, userId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, userId },
      include: {
        reminders: { where: { status: 'ACTIVE' }, orderBy: { nextDueDate: 'asc' }, take: 5 },
        _count: { select: { maintenanceLogs: true, fuelLogs: true } },
      },
    });
    if (!vehicle) throw new NotFoundException(`Vehicle ${id} not found`);
    return vehicle;
  }

  create(dto: CreateVehicleDto, userId: string) {
    return this.prisma.vehicle.create({
      data: { ...dto, userId },
    });
  }

  async update(id: string, dto: UpdateVehicleDto, userId: string) {
    await this.assertOwner(id, userId);
    return this.prisma.vehicle.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) {
    await this.assertOwner(id, userId);
    // Soft delete
    return this.prisma.vehicle.update({ where: { id }, data: { isActive: false } });
  }

  async updatePhoto(id: string, userId: string, photoUrl: string) {
    await this.assertOwner(id, userId);
    return this.prisma.vehicle.update({ where: { id }, data: { photoUrl } });
  }

  async updateMileage(id: string, userId: string, mileage: number) {
    await this.assertOwner(id, userId);
    return this.prisma.vehicle.update({ where: { id }, data: { currentMileage: mileage } });
  }

  private async assertOwner(id: string, userId: string) {
    const v = await this.prisma.vehicle.findFirst({ where: { id, userId } });
    if (!v) throw new NotFoundException(`Vehicle ${id} not found`);
    return v;
  }
}
