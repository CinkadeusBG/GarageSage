import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@garagesage/prisma';
import { CreateReminderDto, UpdateReminderDto, CompleteReminderDto } from '@garagesage/shared';

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(vehicleId: string, userId: string) {
    return this.prisma.reminder.findMany({
      where:   { vehicleId, vehicle: { userId }, status: { not: 'DISMISSED' } },
      orderBy: [{ priority: 'desc' }, { nextDueDate: 'asc' }],
    });
  }

  // All upcoming reminders across all user vehicles (for dashboard)
  async upcoming(userId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId, isActive: true },
      select: { id: true },
    });
    const vehicleIds = vehicles.map(v => v.id);

    return this.prisma.reminder.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        status:    'ACTIVE',
      },
      orderBy:  [{ priority: 'desc' }, { nextDueDate: 'asc' }],
      take:     10,
      include:  { vehicle: { select: { make: true, model: true, year: true } } },
    });
  }

  async findOne(id: string, userId: string) {
    const r = await this.prisma.reminder.findFirst({
      where: { id, vehicle: { userId } },
    });
    if (!r) throw new NotFoundException(`Reminder ${id} not found`);
    return r;
  }

  async create(dto: CreateReminderDto, userId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, userId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const nextDueDate    = this.calcNextDueDate(dto.lastDoneDate ? new Date(dto.lastDoneDate) : null, dto.intervalDays);
    const nextDueMileage = this.calcNextDueMileage(dto.lastDoneMileage ?? vehicle.currentMileage, dto.intervalMileage);

    return this.prisma.reminder.create({
      data: {
        ...dto,
        ...(dto.lastDoneDate ? { lastDoneDate: new Date(dto.lastDoneDate) } : {}),
        nextDueDate,
        nextDueMileage,
      },
    });
  }

  async update(id: string, dto: UpdateReminderDto, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.reminder.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.lastDoneDate ? { lastDoneDate: new Date(dto.lastDoneDate) } : {}),
      },
    });
  }

  async complete(id: string, dto: CompleteReminderDto, userId: string) {
    const reminder = await this.findOne(id, userId);
    const completedAt = dto.completedAt ? new Date(dto.completedAt) : new Date();

    const nextDueDate    = this.calcNextDueDate(completedAt, reminder.intervalDays ?? undefined);
    const nextDueMileage = this.calcNextDueMileage(dto.currentMileage, reminder.intervalMileage ?? undefined);

    return this.prisma.reminder.update({
      where: { id },
      data: {
        lastDoneDate:    completedAt,
        lastDoneMileage: dto.currentMileage,
        nextDueDate,
        nextDueMileage,
        status: 'ACTIVE',
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.reminder.update({ where: { id }, data: { status: 'DISMISSED' } });
  }

  private calcNextDueDate(from: Date | null, intervalDays?: number): Date | null {
    if (!intervalDays) return null;
    const base = from ?? new Date();
    const d    = new Date(base);
    d.setDate(d.getDate() + intervalDays);
    return d;
  }

  private calcNextDueMileage(currentMileage: number, intervalMileage?: number): number | null {
    if (!intervalMileage) return null;
    return currentMileage + intervalMileage;
  }
}
