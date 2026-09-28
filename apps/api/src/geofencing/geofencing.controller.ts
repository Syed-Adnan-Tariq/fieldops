import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { GeofencingService } from './geofencing.service';
import { CreateGeofenceDto } from './dto/create-geofence.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@fieldops/shared';

@ApiTags('Geofences')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('geofences')
export class GeofencingController {
  constructor(private readonly geofencingService: GeofencingService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new geofence' })
  async create(
    @Body() dto: CreateGeofenceDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.geofencingService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active geofences' })
  async findAll() {
    return this.geofencingService.findAll();
  }

  @Get('checkins')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get check-in/check-out events' })
  @ApiQuery({ name: 'workerId', required: false })
  @ApiQuery({ name: 'geofenceId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getCheckIns(
    @Query('workerId') workerId?: string,
    @Query('geofenceId') geofenceId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.geofencingService.getCheckIns({
      workerId,
      geofenceId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get geofence by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.geofencingService.findById(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update geofence' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateGeofenceDto>,
  ) {
    return this.geofencingService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate geofence' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.geofencingService.remove(id);
  }
}
