import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlaceEntity } from './entities/place.entity';
import { CreatePlaceDto, UpdatePlaceDto } from './dto/place.dto';

@Injectable()
export class PlacesService {
  constructor(
    @InjectRepository(PlaceEntity)
    private readonly repo: Repository<PlaceEntity>,
  ) {}

  create(dto: CreatePlaceDto, createdById: string) {
    const place = this.repo.create({ ...dto, radiusMeters: dto.radiusMeters ?? 200, createdById });
    return this.repo.save(place);
  }

  findAll(opts?: { category?: string; active?: boolean }) {
    const where: any = {};
    if (opts?.active !== undefined) where.isActive = opts.active;
    if (opts?.category) where.category = opts.category;
    return this.repo.find({ where, order: { name: 'ASC' }, relations: ['createdBy'] });
  }

  async findById(id: string) {
    const p = await this.repo.findOne({ where: { id }, relations: ['createdBy'] });
    if (!p) throw new NotFoundException(`Place ${id} not found`);
    return p;
  }

  async update(id: string, dto: UpdatePlaceDto) {
    const place = await this.findById(id);
    Object.assign(place, dto);
    return this.repo.save(place);
  }

  async remove(id: string) {
    const place = await this.findById(id);
    place.isActive = false;
    await this.repo.save(place);
  }

  // Find places near a coordinate (for auto check-in)
  async findNearby(lat: number, lng: number, radiusMeters = 500): Promise<PlaceEntity[]> {
    const places = await this.repo.find({ where: { isActive: true } });
    return places.filter(p => {
      const dlat = (Number(p.latitude) - lat) * Math.PI / 180;
      const dlng = (Number(p.longitude) - lng) * Math.PI / 180;
      const a = Math.sin(dlat/2)**2 + Math.cos(lat*Math.PI/180) * Math.cos(Number(p.latitude)*Math.PI/180) * Math.sin(dlng/2)**2;
      const dist = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return dist <= (Number(p.radiusMeters) + radiusMeters);
    });
  }
}
