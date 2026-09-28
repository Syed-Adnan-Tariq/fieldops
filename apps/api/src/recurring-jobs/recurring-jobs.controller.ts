import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  validateOrReject,
} from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  RecurringJobsService,
  CreateRecurringJobDto,
  UpdateRecurringJobDto,
} from './recurring-jobs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@fieldops/shared';

@ApiTags('RecurringJobs')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('recurring-jobs')
export class RecurringJobsController {
  constructor(private readonly service: RecurringJobsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a recurring job template' })
  create(
    @Body() dto: CreateRecurringJobDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.service.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all recurring jobs' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a recurring job by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a recurring job' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecurringJobDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a recurring job' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.delete(id);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle active state of a recurring job' })
  toggle(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.toggleActive(id);
  }
}
