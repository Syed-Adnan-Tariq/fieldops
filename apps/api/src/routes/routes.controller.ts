import {
  Controller,
  Get,
  Post,
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
import { RoutesService } from './routes.service';
import { OptimizeRouteDto } from './dto/optimize-route.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@fieldops/shared';

@ApiTags('Routes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post('optimize')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Optimize route for a worker with multiple job stops' })
  async optimizeRoute(@Body() dto: OptimizeRouteDto) {
    return this.routesService.optimizeRoute(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all routes' })
  @ApiQuery({ name: 'workerId', required: false })
  async findAll(@Query('workerId') workerId?: string) {
    return this.routesService.findAll(workerId);
  }

  @Get('my-route')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: "Get current worker's latest route" })
  async getMyRoute(@CurrentUser() user: CurrentUserData) {
    return this.routesService.findWorkerLatestRoute(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get route by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.routesService.findById(id);
  }
}
