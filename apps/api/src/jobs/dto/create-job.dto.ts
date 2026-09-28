import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsDateString,
  IsNumber,
  IsArray,
  MinLength,
  MaxLength,
  Min,
  ValidateNested,
  IsLatitude,
  IsLongitude,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobPriority } from '@fieldops/shared';

export class JobAddressDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  street: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  state: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  postalCode: string;

  @ApiPropertyOptional({ default: 'US' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLongitude()
  longitude?: number;
}

export class CreateJobDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: JobPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedWorkerId?: string;

  @ApiProperty({ type: JobAddressDto })
  @ValidateNested()
  @Type(() => JobAddressDto)
  address: JobAddressDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledStartAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledEndAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  geofenceId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  customFields?: Array<{ key: string; value: string; type: 'text' | 'number' | 'checkbox' | 'date' }>;
}
