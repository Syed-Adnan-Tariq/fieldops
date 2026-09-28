import { IsString, IsObject, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';

export class CreateAlertRuleDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() trigger: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() conditions?: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() @IsObject() actions?: Record<string, any>;
}
export class UpdateAlertRuleDto extends PartialType(CreateAlertRuleDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
