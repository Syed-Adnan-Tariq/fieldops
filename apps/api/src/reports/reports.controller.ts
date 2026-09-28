import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@fieldops/shared';

function toCSV(data: any[]): string {
  if (!data.length) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('mileage')
  @ApiOperation({ summary: 'Get mileage report for workers' })
  @ApiQuery({ name: 'workerId', required: false })
  @ApiQuery({ name: 'startDate', required: true, description: 'ISO date string' })
  @ApiQuery({ name: 'endDate', required: true, description: 'ISO date string' })
  @ApiQuery({ name: 'format', required: false, description: 'Set to "csv" to download as CSV' })
  async getMileage(
    @Query('workerId') workerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    const data = await this.reportsService.getMileageReport({ workerId, startDate: start, endDate: end });
    if (format === 'csv') {
      const csv = toCSV(Array.isArray(data) ? data : [data]);
      res!.setHeader('Content-Type', 'text/csv');
      res!.setHeader('Content-Disposition', 'attachment; filename="mileage-report.csv"');
      res!.send(csv);
      return;
    }
    return data;
  }

  @Get('job-completion')
  @ApiOperation({ summary: 'Get job completion statistics' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'format', required: false, description: 'Set to "csv" to download as CSV' })
  async getJobCompletion(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    const data = await this.reportsService.getJobCompletionReport({ startDate: start, endDate: end });
    if (format === 'csv') {
      // Flatten the nested byWorker into separate rows for CSV
      const rows = data.byWorker.length > 0
        ? data.byWorker.map((w) => ({
            periodStart: data.periodStart,
            periodEnd: data.periodEnd,
            totalJobs: data.totalJobs,
            completedJobs: data.completedJobs,
            cancelledJobs: data.cancelledJobs,
            failedJobs: data.failedJobs,
            completionRate: data.completionRate,
            averageDurationMinutes: data.averageDurationMinutes,
            workerId: w.workerId,
            workerName: w.workerName,
            workerAssigned: w.assigned,
            workerCompleted: w.completed,
            workerCompletionRate: w.completionRate,
          }))
        : [
            {
              periodStart: data.periodStart,
              periodEnd: data.periodEnd,
              totalJobs: data.totalJobs,
              completedJobs: data.completedJobs,
              cancelledJobs: data.cancelledJobs,
              failedJobs: data.failedJobs,
              completionRate: data.completionRate,
              averageDurationMinutes: data.averageDurationMinutes,
            },
          ];
      const csv = toCSV(rows);
      res!.setHeader('Content-Type', 'text/csv');
      res!.setHeader('Content-Disposition', 'attachment; filename="job-completion-report.csv"');
      res!.send(csv);
      return;
    }
    return data;
  }

  @Get('timesheet')
  @ApiOperation({ summary: 'Get timesheet report' })
  @ApiQuery({ name: 'workerId', required: false })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'format', required: false, description: 'Set to "csv" to download as CSV' })
  async getTimesheet(
    @Query('workerId') workerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    const data = await this.reportsService.getTimesheetReport({ workerId, startDate: start, endDate: end });
    if (format === 'csv') {
      const rows = data.entries.map((e) => ({
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        workerId: e.workerId,
        workerName: e.workerName,
        date: e.date,
        checkInTime: e.checkInTime ?? '',
        checkOutTime: e.checkOutTime ?? '',
        totalOnSiteMinutes: e.totalOnSiteMinutes,
        jobsCompleted: e.jobsCompleted,
      }));
      const csv = toCSV(rows.length ? rows : [{ periodStart: data.periodStart, periodEnd: data.periodEnd }]);
      res!.setHeader('Content-Type', 'text/csv');
      res!.setHeader('Content-Disposition', 'attachment; filename="timesheet-report.csv"');
      res!.send(csv);
      return;
    }
    return data;
  }

  @Get('on-site-time')
  @ApiOperation({ summary: 'Get on-site time report from geofence check-ins' })
  @ApiQuery({ name: 'workerId', required: false })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'format', required: false, description: 'Set to "csv" to download as CSV' })
  async getOnSiteTime(
    @Query('workerId') workerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    const data = await this.reportsService.getOnSiteTimeReport({ workerId, startDate: start, endDate: end });
    if (format === 'csv') {
      const csv = toCSV(Array.isArray(data) ? data : [data]);
      res!.setHeader('Content-Type', 'text/csv');
      res!.setHeader('Content-Disposition', 'attachment; filename="on-site-time-report.csv"');
      res!.send(csv);
      return;
    }
    return data;
  }
}
