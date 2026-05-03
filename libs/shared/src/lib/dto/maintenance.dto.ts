import { IsString, IsInt, IsOptional, IsDateString, IsNumber, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMaintenanceLogDto {
  @IsString()
  vehicleId: string;

  @IsDateString()
  date: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  mileage: number;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cost?: number;

  @IsOptional()
  @IsString()
  shop?: string;

  @IsOptional()
  @IsString()
  technician?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateMaintenanceLogDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  mileage?: number;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cost?: number;

  @IsOptional()
  @IsString()
  shop?: string;

  @IsOptional()
  @IsString()
  technician?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
