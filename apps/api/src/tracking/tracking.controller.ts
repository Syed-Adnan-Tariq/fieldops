import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TrackingService } from './tracking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@fieldops/shared';

@ApiTags('Tracking')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get('live')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get latest locations for all workers' })
  async getLiveLocations() {
    return this.trackingService.getLatestLocations();
  }

  @Get('workers/:workerId/history')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get location history for a worker' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getWorkerHistory(
    @Param('workerId', ParseUUIDPipe) workerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit', new DefaultValuePipe(1000), ParseIntPipe) limit?: number,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    return this.trackingService.getWorkerHistory(workerId, start, end, limit);
  }
}
