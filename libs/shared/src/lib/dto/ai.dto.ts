import { IsString, IsOptional, IsArray } from 'class-validator';

export class AiChatDto {
  @IsString()
  question: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vehicleIds?: string[];
}
