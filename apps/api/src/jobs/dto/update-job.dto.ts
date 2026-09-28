import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus } from '@fieldops/shared';
import { CreateJobDto } from './create-job.dto';

export class UpdateJobDto extends PartialType(CreateJobDto) {}

export class UpdateJobStatusDto {
  @ApiPropertyOptional({ enum: JobStatus })
  @IsEnum(JobStatus)
  status: JobStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class AssignJobDto {
  @ApiPropertyOptional()
  @IsString()
  workerId: string;
}

export class AddJobNoteDto {
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(5000)
  content: string;
}

export class AddJobSignatureDto {
  @ApiPropertyOptional()
  @IsString()
  signerName: string;

  @ApiPropertyOptional()
  @IsString()
  signatureDataUrl: string;
}
