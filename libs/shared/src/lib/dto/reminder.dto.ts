import { IsString, IsInt, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReminderStatus {
  ACTIVE    = 'ACTIVE',
  SNOOZED   = 'SNOOZED',
  COMPLETED = 'COMPLETED',
  DISMISSED = 'DISMISSED',
}

export enum Priority {
  LOW      = 'LOW',
  MEDIUM   = 'MEDIUM',
  HIGH     = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class CreateReminderDto {
  @IsString()
  vehicleId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  intervalMileage?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  intervalDays?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  lastDoneMileage?: number;

  @IsOptional()
  @IsDateString()
  lastDoneDate?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;
}

export class UpdateReminderDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  intervalMileage?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  intervalDays?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  lastDoneMileage?: number;

  @IsOptional()
  @IsDateString()
  lastDoneDate?: string;

  @IsOptional()
  @IsEnum(ReminderStatus)
  status?: ReminderStatus;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;
}

export class CompleteReminderDto {
  @IsInt()
  @Type(() => Number)
  currentMileage: number;

  @IsOptional()
  @IsDateString()
  completedAt?: string;
}
