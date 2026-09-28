import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateIf,
  ValidateNested,
  IsLatitude,
  IsLongitude,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GeofenceType } from '@fieldops/shared';

export class CoordinateDto {
  @ApiProperty()
  @IsLatitude()
  latitude: number;

  @ApiProperty()
  @IsLongitude()
  longitude: number;
}

export class CreateGeofenceDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ enum: GeofenceType })
  @IsEnum(GeofenceType)
  type: GeofenceType;

  // Circle-specific
  @ApiPropertyOptional({ description: 'Required for circle type' })
  @ValidateIf((o: CreateGeofenceDto) => o.type === GeofenceType.CIRCLE)
  @IsLatitude()
  centerLatitude?: number;

  @ApiPropertyOptional({ description: 'Required for circle type' })
  @ValidateIf((o: CreateGeofenceDto) => o.type === GeofenceType.CIRCLE)
  @IsLongitude()
  centerLongitude?: number;

  @ApiPropertyOptional({ description: 'Required for circle type, in meters' })
  @ValidateIf((o: CreateGeofenceDto) => o.type === GeofenceType.CIRCLE)
  @IsNumber()
  @Min(10)
  @Max(10000)
  radiusMeters?: number;

  // Polygon-specific
  @ApiPropertyOptional({
    description: 'Required for polygon type, min 3 coordinates',
    type: [CoordinateDto],
  })
  @ValidateIf((o: CreateGeofenceDto) => o.type === GeofenceType.POLYGON)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoordinateDto)
  polygonCoordinates?: CoordinateDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  triggerOnEnter?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  triggerOnExit?: boolean;
}
