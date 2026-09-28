import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole, WorkerStatus } from '@fieldops/shared';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async create(dto: Partial<CreateUserDto> & { password: string }): Promise<UserEntity> {
    const user = this.userRepository.create({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role ?? UserRole.WORKER,
      phone: dto.phone ?? null,
      transportMode: (dto as any).transportMode ?? null,
      vehicleId: (dto as any).vehicleId ?? null,
      status: dto.role === UserRole.WORKER ? WorkerStatus.OFFLINE : null,
    });

    return this.userRepository.save(user);
  }

  async findAll(role?: UserRole): Promise<UserEntity[]> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.firstName',
        'user.lastName',
        'user.role',
        'user.phone',
        'user.avatarUrl',
        'user.isActive',
        'user.status',
        'user.vehicleId',
        'user.currentLatitude',
        'user.currentLongitude',
        'user.lastSeenAt',
        'user.createdAt',
        'user.updatedAt',
      ]);

    if (role) {
      query.where('user.role = :role', { role });
    }

    return query.orderBy('user.createdAt', 'DESC').getMany();
  }

  async findWorkers(): Promise<UserEntity[]> {
    return this.findAll(UserRole.WORKER);
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.findByEmail(dto.email);
      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 12);
    }

    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    // Soft delete by setting isActive = false
    user.isActive = false;
    await this.userRepository.save(user);
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    const hash = refreshToken ? await bcrypt.hash(refreshToken, 10) : null;
    await this.userRepository.update(userId, { refreshTokenHash: hash });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepository.update(userId, { lastLoginAt: new Date() });
  }

  async updateLocation(
    userId: string,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    await this.userRepository.update(userId, {
      currentLatitude: latitude,
      currentLongitude: longitude,
      lastSeenAt: new Date(),
      status: WorkerStatus.AVAILABLE,
    });
  }

  async updateStatus(userId: string, status: WorkerStatus): Promise<void> {
    await this.userRepository.update(userId, { status });
  }

  async getActiveWorkers(): Promise<UserEntity[]> {
    return this.userRepository.find({
      where: { role: UserRole.WORKER, isActive: true },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'status',
        'currentLatitude',
        'currentLongitude',
        'lastSeenAt',
        'vehicleId',
        'phone',
      ] as (keyof UserEntity)[],
    });
  }

  /** Returns workers with status = available (alias used by auto-dispatch) */
  async findActiveWorkers(): Promise<UserEntity[]> {
    return this.userRepository.find({
      where: { role: UserRole.WORKER, isActive: true, status: WorkerStatus.AVAILABLE },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'status',
        'currentLatitude',
        'currentLongitude',
        'lastSeenAt',
        'vehicleId',
        'phone',
      ] as (keyof UserEntity)[],
    });
  }
}
