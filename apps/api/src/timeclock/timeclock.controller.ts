import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TimeclockService } from './timeclock.service';
import { ClockEventDto } from './dto/timeclock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@fieldops/shared';

@ApiTags('TimeClock')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('timeclock')
export class TimeclockController {
  constructor(private readonly svc: TimeclockService) {}

  @Post('clock-in')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: 'Clock in for work' })
  clockIn(@Body() dto: ClockEventDto, @CurrentUser() user: CurrentUserData) {
    return this.svc.clockIn(user.id, dto);
  }

  @Post('clock-out')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: 'Clock out from work' })
  clockOut(@Body() dto: ClockEventDto, @CurrentUser() user: CurrentUserData) {
    return this.svc.clockOut(user.id, dto);
  }

  @Get('status')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: 'Get current clock-in status' })
  getStatus(@CurrentUser() user: CurrentUserData) {
    return this.svc.getStatus(user.id);
  }

  @Get('today')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: "Get today's shifts" })
  getToday(@CurrentUser() user: CurrentUserData) {
    return this.svc.getTodayShifts(user.id);
  }

  @Get('shifts')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all shifts (admin)' })
  getShifts(
    @Query('workerId') workerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.svc.getShifts({
      workerId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page, limit,
    });
  }

  @Get('summary')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get hours summary per worker' })
  getSummary(@Query('from') from?: string, @Query('to') to?: string) {
    const end = to ? new Date(to) : new Date();
    const start = from ? new Date(from) : new Date(Date.now() - 30 * 864e5);
    return this.svc.getWorkerHoursSummary(start, end);
  }
}
