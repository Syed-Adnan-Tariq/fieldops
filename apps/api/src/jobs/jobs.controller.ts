import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import {
  UpdateJobDto,
  UpdateJobStatusDto,
  AssignJobDto,
  AddJobNoteDto,
  AddJobSignatureDto,
} from './dto/update-job.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { JobStatus, UserRole } from '@fieldops/shared';

const photoStorage = diskStorage({
  destination: './uploads/job-photos',
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${extname(file.originalname)}`);
  },
});

@ApiTags('Jobs')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new job' })
  async create(
    @Body() dto: CreateJobDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.jobsService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all jobs with optional filters' })
  @ApiQuery({ name: 'status', enum: JobStatus, required: false })
  @ApiQuery({ name: 'workerId', required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async findAll(
    @Query('status') status?: JobStatus,
    @Query('workerId') workerId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentUser() user?: CurrentUserData,
  ) {
    // Workers can only see their own jobs
    const effectiveWorkerId =
      user?.role === UserRole.WORKER ? user.id : workerId;
    return this.jobsService.findAll({ status, workerId: effectiveWorkerId, page, limit });
  }

  @Get('my-jobs')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: 'Get jobs assigned to the current worker' })
  async getMyJobs(@CurrentUser() user: CurrentUserData) {
    return this.jobsService.getWorkerJobs(user.id);
  }

  @Post('import/csv')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Bulk import jobs from CSV' })
  async importCSV(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserData,
  ) {
    if (!file) throw new BadRequestException('No CSV file uploaded');
    return this.jobsService.importFromCSV(file.buffer.toString('utf-8'), user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.findById(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update job details' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobsService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update job status' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobStatusDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.jobsService.updateStatus(id, dto, user.id);
  }

  @Post(':id/assign')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign job to a worker' })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignJobDto,
  ) {
    return this.jobsService.assign(id, dto);
  }

  @Post(':id/dispatch')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Dispatch job to assigned worker' })
  async dispatch(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.dispatch(id);
  }

  @Post(':id/auto-dispatch')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Auto-assign job to nearest available worker' })
  async autoDispatch(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.autoDispatch(id);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add a note to a job' })
  async addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddJobNoteDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.jobsService.addNote(id, dto, user.id);
  }

  @Post(':id/signature')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: 'Capture signature for a job' })
  async addSignature(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddJobSignatureDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.jobsService.addSignature(id, dto, user.id);
  }

  @Post(':id/photos')
  @UseInterceptors(FileInterceptor('photo', { storage: photoStorage, limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload a photo for a job' })
  async uploadPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserData,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.jobsService.addPhoto(id, {
      id: uuidv4(),
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/uploads/job-photos/${file.filename}`,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user.id,
    });
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a job' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.jobsService.remove(id);
  }
}
