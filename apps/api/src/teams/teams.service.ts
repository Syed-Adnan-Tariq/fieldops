import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamEntity } from './entities/team.entity';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(TeamEntity)
    private readonly repo: Repository<TeamEntity>,
  ) {}

  create(dto: { name: string; description?: string; color?: string; managerId: string }) {
    const team = this.repo.create({ ...dto, description: dto.description ?? null, color: dto.color ?? null, members: [] });
    return this.repo.save(team);
  }

  findAll() {
    return this.repo.find({ relations: ['manager', 'members'], order: { name: 'ASC' } });
  }

  async findById(id: string) {
    const t = await this.repo.findOne({ where: { id }, relations: ['manager', 'members'] });
    if (!t) throw new NotFoundException('Team not found');
    return t;
  }

  async update(id: string, dto: Partial<TeamEntity>) {
    await this.repo.update(id, dto);
    return this.findById(id);
  }

  async addMember(teamId: string, userId: string) {
    const team = await this.findById(teamId);
    if (!team.members.find(m => m.id === userId)) {
      team.members.push({ id: userId } as any);
      await this.repo.save(team);
    }
    return this.findById(teamId);
  }

  async removeMember(teamId: string, userId: string) {
    const team = await this.findById(teamId);
    team.members = team.members.filter(m => m.id !== userId);
    return this.repo.save(team);
  }

  async delete(id: string) { await this.repo.delete(id); }
}
