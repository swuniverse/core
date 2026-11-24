import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  RpgPlotDto,
  RpgPlotListDto,
  SaveRpgPlotDto,
} from '@swuniverse/shared';
import { In, Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { MessagingService } from '../messaging/messaging.service';
import { RpgPlotMember } from './rpg-plot-member.entity';
import { RpgPlot } from './rpg-plot.entity';

const PAGE_SIZE = 20;

@Injectable()
export class RpgPlotService {
  constructor(
    @InjectRepository(RpgPlot)
    private readonly plots: Repository<RpgPlot>,
    @InjectRepository(RpgPlotMember)
    private readonly members: Repository<RpgPlotMember>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly messages: MessagingService,
  ) {}

  async list(page = 1, userId?: number): Promise<RpgPlotListDto> {
    const safePage = this.page(page);
    const where = userId ? { members: { userId } } : undefined;
    const [plots, totalItems] = await this.plots.findAndCount({
      where,
      relations: ['creator', 'members', 'members.user'],
      order: { endedAt: { direction: 'ASC', nulls: 'FIRST' }, startedAt: 'DESC', id: 'DESC' },
      skip: (safePage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });
    return {
      data: plots.map((plot) => this.toDto(plot)),
      page: safePage,
      pageSize: PAGE_SIZE,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / PAGE_SIZE)),
    };
  }

  async detail(id: number): Promise<RpgPlotDto> {
    return this.toDto(await this.find(id));
  }

  async membershipsForUser(userId: number): Promise<Pick<RpgPlot, 'id' | 'title' | 'endedAt'>[]> {
    const memberships = await this.members.find({ where: { userId }, select: ['plotId'] });
    const plotIds = memberships.map(({ plotId }) => plotId);
    if (plotIds.length === 0) return [];

    return this.plots.find({
      where: { id: In(plotIds) },
      select: ['id', 'title', 'endedAt', 'startedAt'],
      order: { endedAt: { direction: 'ASC', nulls: 'FIRST' }, startedAt: 'DESC', id: 'DESC' },
    });
  }

  async create(userId: number, input: SaveRpgPlotDto): Promise<RpgPlotDto> {
    const values = this.validated(input);
    const plot = await this.plots.manager.transaction(async (manager) => {
      const plots = manager.getRepository(RpgPlot);
      const members = manager.getRepository(RpgPlotMember);
      const saved = await plots.save(plots.create({ creatorId: userId, ...values }));
      await members.save(members.create({ plotId: saved.id, userId }));
      return saved;
    });
    return this.detail(plot.id);
  }

  async update(
    userId: number,
    id: number,
    input: SaveRpgPlotDto,
  ): Promise<RpgPlotDto> {
    const plot = await this.creatorPlot(userId, id);
    this.requireActive(plot);
    Object.assign(plot, this.validated(input));
    return this.toDto(await this.plots.save(plot));
  }

  async end(userId: number, id: number): Promise<RpgPlotDto> {
    const plot = await this.creatorPlot(userId, id);
    this.requireActive(plot);
    plot.endedAt = new Date();
    return this.toDto(await this.plots.save(plot));
  }

  async addMember(userId: number, id: number, memberId: number): Promise<void> {
    const plot = await this.creatorPlot(userId, id);
    this.requireActive(plot);
    const user = await this.users.findOneBy({ id: memberId });
    if (!user) throw new NotFoundException('Spieler nicht gefunden');
    if (await this.members.findOneBy({ plotId: id, userId: memberId })) {
      throw new BadRequestException('Dieser Spieler schreibt bereits an diesem Plot');
    }
    await this.members.save(this.members.create({ plotId: id, userId: memberId }));
    await this.messages.sendSystem(
      memberId,
      `Du wurdest dem RPG-Plot '${plot.title}' als Schreiber hinzugefügt`,
    );
  }

  async removeMember(userId: number, id: number, memberId: number): Promise<void> {
    const plot = await this.creatorPlot(userId, id);
    this.requireActive(plot);
    if (memberId === plot.creatorId) {
      throw new BadRequestException('Der Ersteller kann nicht entfernt werden');
    }
    const member = await this.members.findOneBy({ plotId: id, userId: memberId });
    if (!member) throw new NotFoundException('Schreiber nicht gefunden');
    await this.members.delete({ plotId: id, userId: memberId });
    await this.messages.sendSystem(
      memberId,
      `Du wurdest aus dem RPG-Plot '${plot.title}' als Schreiber entfernt`,
    );
  }

  private async find(id: number): Promise<RpgPlot> {
    const plot = await this.plots.findOne({
      where: { id },
      relations: ['creator', 'members', 'members.user'],
    });
    if (!plot) throw new NotFoundException('RPG-Plot nicht gefunden');
    return plot;
  }

  private async creatorPlot(userId: number, id: number): Promise<RpgPlot> {
    const plot = await this.find(id);
    if (plot.creatorId !== userId) {
      throw new ForbiddenException('Nur der Ersteller darf diesen Plot verwalten');
    }
    return plot;
  }

  private requireActive(plot: RpgPlot): void {
    if (plot.endedAt) throw new BadRequestException('Der RPG-Plot ist bereits beendet');
  }

  private validated(input: SaveRpgPlotDto): SaveRpgPlotDto {
    const title = input.title?.trim();
    if (!title || [...title].length < 6 || [...title].length > 80) {
      throw new BadRequestException('Der Titel muss 6 bis 80 Zeichen lang sein');
    }
    if (typeof input.description !== 'string' || [...input.description].length > 5_000) {
      throw new BadRequestException('Die Beschreibung darf höchstens 5.000 Zeichen lang sein');
    }
    return { title, description: input.description };
  }

  private page(page: number): number {
    return Number.isInteger(page) && page > 0 ? page : 1;
  }

  private toDto(plot: RpgPlot): RpgPlotDto {
    return {
      id: plot.id,
      title: plot.title,
      description: plot.description,
      creatorId: plot.creatorId,
      creatorName: plot.creator?.username ?? '',
      startedAt: plot.startedAt?.toISOString() ?? '',
      endedAt: plot.endedAt?.toISOString() ?? null,
      members: (plot.members ?? []).map((member) => ({
        userId: member.userId,
        username: member.user?.username ?? '',
        joinedAt: member.joinedAt?.toISOString() ?? '',
      })),
    };
  }
}
