import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { CreateAlertRuleDto, UpdateAlertRuleDto } from './dto/alert.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@fieldops/shared';

@ApiTags('Alerts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly svc: AlertsService) {}

  @Post('rules')
  @Roles(UserRole.ADMIN)
  createRule(@Body() dto: CreateAlertRuleDto, @CurrentUser() user: CurrentUserData) {
    return this.svc.createRule(dto, user.id);
  }

  @Get('rules')
  @Roles(UserRole.ADMIN)
  getRules() { return this.svc.getRules(); }

  @Put('rules/:id')
  @Roles(UserRole.ADMIN)
  updateRule(@Param('id') id: string, @Body() dto: UpdateAlertRuleDto) {
    return this.svc.updateRule(id, dto);
  }

  @Delete('rules/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRule(@Param('id') id: string) { return this.svc.deleteRule(id); }

  @Get('events')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get recent alert events' })
  getEvents(@Query('ruleId') ruleId?: string, @Query('workerId') workerId?: string, @Query('limit') limit?: number) {
    return this.svc.getEvents({ ruleId, workerId, limit });
  }
}
