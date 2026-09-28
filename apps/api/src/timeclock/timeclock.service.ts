import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { WorkShiftEntity } from './entities/work-shift.entity';
import { ClockEventDto } from './dto/timeclock.dto';

@Injectable()
export class TimeclockService {
  constructor(
    @InjectRepository(WorkShiftEntity)
    private readonly shiftRepo: Repository<WorkShiftEntity>,
  ) {}

  async clockIn(workerId: string, dto: ClockEventDto): Promise<WorkShiftEntity> {
    const open = await this.shiftRepo.findOne({
      where: { workerId, clockOutAt: IsNull() },
    });
    if (open) throw new BadRequestException('Already clocked in. Clock out first.');

    const shift = this.shiftRepo.create({
      workerId,
      clockInAt: new Date(),
      clockInLatitude: dto.latitude ?? null,
      clockInLongitude: dto.longitude ?? null,
      notes: dto.notes ?? null,
      clockOutAt: null,
      durationMinutes: null,
    });
    return this.shiftRepo.save(shift);
  }

  async clockOut(workerId: string, dto: ClockEventDto): Promise<WorkShiftEntity> {
    const shift = await this.shiftRepo.findOne({
      where: { workerId, clockOutAt: IsNull() },
    });
    if (!shift) throw new BadRequestException('Not currently clocked in.');

    const now = new Date();
    const durationMs = now.getTime() - shift.clockInAt.getTime();
    shift.clockOutAt = now;
    shift.durationMinutes = Math.round(durationMs / 60000);
    shift.clockOutLatitude = dto.latitude ?? null;
    shift.clockOutLongitude = dto.longitude ?? null;
    return this.shiftRepo.save(shift);
  }

  async getStatus(workerId: string): Promise<{ isClockedIn: boolean; currentShift: WorkShiftEntity | null }> {
    const shift = await this.shiftRepo.findOne({
      where: { workerId, clockOutAt: IsNull() },
    });
    return { isClockedIn: !!shift, currentShift: shift ?? null };
  }

  async getTodayShifts(workerId: string): Promise<WorkShiftEntity[]> {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    return this.shiftRepo.find({
      where: { workerId, clockInAt: Between(start, end) },
      order: { clockInAt: 'DESC' },
    });
  }

  async getShifts(opts: { workerId?: string; from?: Date; to?: Date; page?: number; limit?: number }) {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 50, 200);
    const qb = this.shiftRepo.createQueryBuilder('s')
      .leftJoinAndSelect('s.worker', 'worker')
      .orderBy('s.clockInAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (opts.workerId) qb.andWhere('s.workerId = :wid', { wid: opts.workerId });
    if (opts.from)     qb.andWhere('s.clockInAt >= :from', { from: opts.from });
    if (opts.to)       qb.andWhere('s.clockInAt <= :to', { to: opts.to });

    const [shifts, total] = await qb.getManyAndCount();
    return { shifts, total };
  }

  async getWorkerHoursSummary(from: Date, to: Date): Promise<Array<{
    workerId: string; workerName: string; totalMinutes: number; shiftCount: number;
  }>> {
    const rows = await this.shiftRepo.createQueryBuilder('s')
      .leftJoin('s.worker', 'w')
      .select('s.workerId', 'workerId')
      .addSelect("CONCAT(w.firstName, ' ', w.lastName)", 'workerName')
      .addSelect('SUM(s.durationMinutes)', 'totalMinutes')
      .addSelect('COUNT(s.id)', 'shiftCount')
      .where('s.clockInAt BETWEEN :from AND :to', { from, to })
      .andWhere('s.clockOutAt IS NOT NULL')
      .groupBy('s.workerId')
      .addGroupBy('w.firstName')
      .addGroupBy('w.lastName')
      .getRawMany();

    return rows.map(r => ({
      workerId: r.workerId,
      workerName: r.workerName,
      totalMinutes: parseInt(r.totalMinutes ?? '0', 10),
      shiftCount: parseInt(r.shiftCount ?? '0', 10),
    }));
  }
}
