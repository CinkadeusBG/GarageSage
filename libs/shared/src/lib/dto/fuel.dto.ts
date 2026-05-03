import { IsString, IsInt, IsOptional, IsDateString, IsNumber, IsBoolean, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum FuelType {
  GASOLINE = 'GASOLINE',
  DIESEL   = 'DIESEL',
  E85      = 'E85',
  PREMIUM  = 'PREMIUM',
  ELECTRIC = 'ELECTRIC',
  HYBRID   = 'HYBRID',
}

export class CreateFuelLogDto {
  @IsString()
  vehicleId: string;

  @IsDateString()
  date: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  mileage: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  liters?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  gallons?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pricePerUnit?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalCost?: number;

  @IsOptional()
  @IsString()
  station?: string;

  @IsOptional()
  @IsBoolean()
  fullTank?: boolean;

  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;
}

export class UpdateFuelLogDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  mileage?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  liters?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  gallons?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pricePerUnit?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalCost?: number;

  @IsOptional()
  @IsString()
  station?: string;

  @IsOptional()
  @IsBoolean()
  fullTank?: boolean;

  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;
}
