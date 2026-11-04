import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ContactMode,
  type ContactDto,
  type CreateContactDto,
  type ReceivedContactDto,
  type UpdateContactPermissionsDto,
} from '@swuniverse/shared';
import { In, Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { MessagingService } from '../messaging/messaging.service';
import { Contact } from './entities/contact.entity';

const MODE_LABELS: Record<ContactMode, string> = {
  [ContactMode.FRIEND]: 'Freund',
  [ContactMode.ENEMY]: 'Feind',
  [ContactMode.NEUTRAL]: 'neutral',
};

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact)
    private readonly contacts: Repository<Contact>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly messaging: MessagingService,
  ) {}

  async list(userId: number): Promise<ContactDto[]> {
    const contacts = await this.contacts.find({
      where: { userId },
      relations: { contactUser: true },
      order: { contactUserId: 'ASC' },
    });
    return contacts.map((contact) => this.toDto(contact));
  }

  async listReceived(contactUserId: number): Promise<ReceivedContactDto[]> {
    const contacts = await this.contacts.find({
      where: { contactUserId },
      relations: { user: true },
      order: { mode: 'ASC', userId: 'ASC' },
    });
    return contacts.map((contact) => ({
      id: contact.id,
      ownerId: contact.userId,
      ownerUsername: contact.user.username,
      mode: contact.mode,
      createdAt: contact.createdAt.toISOString(),
    }));
  }

  async incomingFriendIds(contactUserId: number, limit: number): Promise<number[]> {
    const contacts = await this.contacts.find({
      where: { contactUserId, mode: ContactMode.FRIEND },
      select: { userId: true },
      order: { userId: 'ASC' },
      take: limit,
    });
    return contacts.map((contact) => contact.userId);
  }

  async create(userId: number, input: CreateContactDto): Promise<ContactDto> {
    const mode = this.requireMode(input.mode);
    if (input.playerId === userId) {
      throw new BadRequestException(
        'Du kannst Dich nicht selbst auf die Kontaktliste setzen',
      );
    }
    const contactUser = await this.users.findOneBy({ id: input.playerId });
    if (!contactUser) throw new NotFoundException('Dieser Spieler existiert nicht');
    if (
      await this.contacts.findOne({
        where: { userId, contactUserId: input.playerId },
      })
    ) {
      throw new BadRequestException(
        'Dieser Spieler befindet sich bereits auf Deiner Kontaktliste',
      );
    }
    const contact = await this.contacts.save(
      this.contacts.create({ userId, contactUserId: input.playerId, contactUser, mode }),
    );
    await this.notify(contactUser.id, mode);
    return this.toDto(contact);
  }

  async updateMode(
    userId: number,
    id: number,
    requestedMode: ContactMode,
  ): Promise<ContactDto> {
    const mode = this.requireMode(requestedMode);
    const contact = await this.owned(userId, id);
    if (contact.mode !== mode) {
      contact.mode = mode;
      await this.contacts.save(contact);
      await this.notify(contact.contactUserId, mode);
    }
    return this.toDto(contact);
  }

  async updateComment(
    userId: number,
    id: number,
    requestedComment: string,
  ): Promise<ContactDto> {
    const comment = requestedComment?.trim();
    if (typeof comment !== 'string' || comment.length > 255) {
      throw new BadRequestException(
        'Der Kommentar darf höchstens 255 Zeichen lang sein',
      );
    }
    const contact = await this.owned(userId, id);
    contact.comment = comment;
    return this.toDto(await this.contacts.save(contact));
  }

  async updatePermissions(
    userId: number,
    id: number,
    permissions: UpdateContactPermissionsDto,
  ): Promise<ContactDto> {
    if (
      !permissions ||
      typeof permissions !== 'object' ||
      Array.isArray(permissions) ||
      Object.keys(permissions).length === 0 ||
      Object.entries(permissions).some(([key, value]) =>
        !['treatAsFriend', 'shareLivePositions'].includes(key) || typeof value !== 'boolean',
      )
    ) {
      throw new BadRequestException('Ungültige Kontaktfreigaben');
    }
    const contact = await this.owned(userId, id);
    if (permissions.treatAsFriend !== undefined) {
      contact.treatAsFriend = permissions.treatAsFriend;
    }
    if (permissions.shareLivePositions !== undefined) {
      contact.shareLivePositions = permissions.shareLivePositions;
    }
    return this.toDto(await this.contacts.save(contact));
  }

  async removeSelected(userId: number, ids: number[]): Promise<{ deleted: number }> {
    const uniqueIds = [...new Set(ids.filter(Number.isInteger))];
    if (uniqueIds.length === 0) return { deleted: 0 };
    const contacts = await this.contacts.find({
      where: { id: In(uniqueIds), userId },
    });
    if (contacts.length > 0) await this.contacts.remove(contacts);
    return { deleted: contacts.length };
  }

  async removeAll(userId: number): Promise<{ deleted: number }> {
    const result = await this.contacts.delete({ userId });
    return { deleted: result.affected ?? 0 };
  }


  async statuses(
    userId: number,
    contactUserIds: number[],
  ): Promise<Map<number, ContactMode.FRIEND | ContactMode.ENEMY>> {
    if (contactUserIds.length === 0) return new Map();
    const contacts = await this.contacts.find({
      where: { userId, contactUserId: In(contactUserIds) },
      select: { contactUserId: true, mode: true, treatAsFriend: true },
    });
    return new Map(
      contacts.flatMap((contact) => {
        const mode = contact.treatAsFriend ? ContactMode.FRIEND : contact.mode;
        return mode === ContactMode.FRIEND || mode === ContactMode.ENEMY
          ? [[contact.contactUserId, mode] as const]
          : [];
      }),
    );
  }

  /** Incoming grants: each owner exposes their own ships to this recipient. */
  async livePositionSharerIds(userId: number, ownerIds?: number[]): Promise<number[]> {
    if (ownerIds?.length === 0) return [];
    const contacts = await this.contacts.find({
      where: {
        contactUserId: userId,
        shareLivePositions: true,
        ...(ownerIds ? { userId: In(ownerIds) } : {}),
      },
      select: { userId: true },
    });
    return contacts.map((contact) => contact.userId);
  }

  private async owned(userId: number, id: number): Promise<Contact> {
    const contact = await this.contacts.findOne({
      where: { id, userId },
      relations: { contactUser: true },
    });
    if (!contact) throw new NotFoundException('Kontakt nicht gefunden');
    return contact;
  }

  private requireMode(mode: ContactMode): ContactMode {
    if (!Object.values(ContactMode).includes(mode)) {
      throw new BadRequestException('Ungültiger Kontaktmodus');
    }
    return mode;
  }

  private notify(recipientId: number, mode: ContactMode): Promise<unknown> {
    return this.messaging.sendSystem(
      recipientId,
      'Kontaktstatus geändert',
      `Der Siedler betrachtet Dich von nun an als ${MODE_LABELS[mode]}`,
    );
  }

  private toDto(contact: Contact): ContactDto {
    return {
      id: contact.id,
      userId: contact.userId,
      contactUserId: contact.contactUserId,
      contactUsername: contact.contactUser.username,
      mode: contact.mode,
      comment: contact.comment,
      treatAsFriend: contact.treatAsFriend,
      shareLivePositions: contact.shareLivePositions,
      createdAt: contact.createdAt.toISOString(),
    };
  }
}
