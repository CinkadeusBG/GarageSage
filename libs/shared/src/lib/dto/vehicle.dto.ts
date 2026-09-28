import { IsString, IsInt, IsOptional, Min, Max, IsBoolean, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVehicleDto {
  @IsString()
  make: string;

  @IsString()
  model: string;

  @IsOptional()
  @IsString()
  trim?: string;

  @IsInt()
  @Min(1886)
  @Max(new Date().getFullYear() + 2)
  @Type(() => Number)
  year: number;

  @IsOptional()
  @IsString()
  vin?: string;

  @IsOptional()
  @IsString()
  licensePlate?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  currentMileage?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  outOfService?: boolean;

  @IsOptional()
  @IsObject()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  specs?: any;
}

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  trim?: string;

  @IsOptional()
  @IsInt()
  @Min(1886)
  @Type(() => Number)
  year?: number;

  @IsOptional()
  @IsString()
  vin?: string;

  @IsOptional()
  @IsString()
  licensePlate?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  currentMileage?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  outOfService?: boolean;

  @IsOptional()
  @IsObject()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  specs?: any;
}
