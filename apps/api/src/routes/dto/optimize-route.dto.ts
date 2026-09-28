import {
  IsArray,
  IsUUID,
  IsLatitude,
  IsLongitude,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CoordinateDto {
  @ApiProperty()
  @IsLatitude()
  latitude: number;

  @ApiProperty()
  @IsLongitude()
  longitude: number;
}

export class OptimizeRouteDto {
  @ApiProperty()
  @IsUUID()
  workerId: string;

  @ApiProperty({ type: [String], description: 'Array of job IDs to include in route' })
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMinSize(1)
  jobIds: string[];

  @ApiProperty({ type: CoordinateDto, description: 'Worker starting coordinates' })
  @ValidateNested()
  @Type(() => CoordinateDto)
  startCoordinates: CoordinateDto;

  @ApiPropertyOptional({ type: CoordinateDto, description: 'Return-to destination (optional)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinateDto)
  endCoordinates?: CoordinateDto;
}
