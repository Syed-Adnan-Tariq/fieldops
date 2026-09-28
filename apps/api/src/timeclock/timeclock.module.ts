import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkShiftEntity } from './entities/work-shift.entity';
import { TimeclockService } from './timeclock.service';
import { TimeclockController } from './timeclock.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WorkShiftEntity])],
  controllers: [TimeclockController],
  providers: [TimeclockService],
  exports: [TimeclockService],
})
export class TimeclockModule {}
